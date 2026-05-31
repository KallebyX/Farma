import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Stateless, signed patient access tokens for the engagement hub.
 *
 * Patients don't have passwords — they receive a magic hub link (via WhatsApp)
 * containing an HMAC-signed token that identifies their patient record. Tokens
 * are URL-safe and carry an expiry. This is the patient-side "login".
 */
const SECRET = process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET ?? "dev-insecure-secret";
const DEFAULT_TTL_DAYS = 90;

function b64url(buf: Buffer): string {
  return buf.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
function fromB64url(s: string): Buffer {
  return Buffer.from(s.replace(/-/g, "+").replace(/_/g, "/"), "base64");
}
function sign(payload: string): string {
  return b64url(createHmac("sha256", SECRET).update(payload).digest());
}

/** Build a signed token for a patient. */
export function signPatientToken(patientId: string, ttlDays = DEFAULT_TTL_DAYS): string {
  const exp = Date.now() + ttlDays * 86400_000;
  const payload = b64url(Buffer.from(JSON.stringify({ p: patientId, exp })));
  return `${payload}.${sign(payload)}`;
}

/** Verify a token and return the patientId, or null if invalid/expired. */
export function verifyPatientToken(token: string | undefined | null): string | null {
  if (!token || !token.includes(".")) return null;
  const [payload, mac] = token.split(".");
  const expected = sign(payload);
  const a = Buffer.from(mac);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  try {
    const { p, exp } = JSON.parse(fromB64url(payload).toString()) as { p: string; exp: number };
    if (!p || typeof exp !== "number" || Date.now() > exp) return null;
    return p;
  } catch {
    return null;
  }
}
