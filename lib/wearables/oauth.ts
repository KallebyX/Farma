import { createHmac, timingSafeEqual } from "node:crypto";
import type { ProviderDef } from "./providers";

/** OAuth helpers for wearable providers (state signing + auth URL + token exchange). */

const SECRET = process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET ?? "dev-insecure-secret";

export function signState(patientId: string, provider: string): string {
  const payload = Buffer.from(JSON.stringify({ p: patientId, v: provider, t: Date.now() })).toString("base64url");
  const mac = createHmac("sha256", SECRET).update(payload).digest("base64url");
  return `${payload}.${mac}`;
}

export function verifyState(state: string | null): { patientId: string; provider: string } | null {
  if (!state || !state.includes(".")) return null;
  const [payload, mac] = state.split(".");
  const expected = createHmac("sha256", SECRET).update(payload).digest("base64url");
  const a = Buffer.from(mac);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  try {
    const { p, v, t } = JSON.parse(Buffer.from(payload, "base64url").toString());
    if (!p || !v || Date.now() - t > 15 * 60_000) return null; // 15-min state TTL
    return { patientId: p, provider: v };
  } catch {
    return null;
  }
}

export function buildAuthUrl(provider: ProviderDef, state: string, redirectUri: string): string {
  const clientId = process.env[provider.clientIdEnv!]!;
  const u = new URL(provider.authUrl!);
  u.searchParams.set("response_type", "code");
  u.searchParams.set("client_id", clientId);
  u.searchParams.set("redirect_uri", redirectUri);
  u.searchParams.set("scope", (provider.scopes ?? []).join(" "));
  u.searchParams.set("state", state);
  return u.toString();
}

/** Exchanges an auth code for tokens (standard OAuth2). Returns null on failure. */
export async function exchangeCode(
  provider: ProviderDef,
  code: string,
  redirectUri: string,
): Promise<{ accessToken: string; refreshToken?: string; expiresIn?: number } | null> {
  const clientId = process.env[provider.clientIdEnv!]!;
  const clientSecret = process.env[provider.clientSecretEnv!]!;
  const body = new URLSearchParams({
    grant_type: "authorization_code",
    code,
    redirect_uri: redirectUri,
    client_id: clientId,
  });
  try {
    const res = await fetch(provider.tokenUrl!, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization: "Basic " + Buffer.from(`${clientId}:${clientSecret}`).toString("base64"),
      },
      body,
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) return null;
    const j = (await res.json()) as { access_token?: string; refresh_token?: string; expires_in?: number };
    if (!j.access_token) return null;
    return { accessToken: j.access_token, refreshToken: j.refresh_token, expiresIn: j.expires_in };
  } catch {
    return null;
  }
}
