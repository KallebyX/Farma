import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { PROVIDERS, oauthConfigured } from "@/lib/wearables/providers";
import { isValidProvider } from "@/lib/wearables/service";
import { verifyState, exchangeCode } from "@/lib/wearables/oauth";
import { signPatientToken } from "@/lib/patient-token";

/** OAuth callback: exchange code → store tokens → redirect back to the hub. */
export async function GET(req: Request, ctx: { params: Promise<{ provider: string }> }) {
  const { provider } = await ctx.params;
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");

  const verified = verifyState(state);
  if (!isValidProvider(provider) || !verified || verified.provider !== provider || !code) {
    return NextResponse.redirect(new URL("/?wearable=error", req.url), { status: 302 });
  }
  const def = PROVIDERS[provider];
  if (!oauthConfigured(def)) {
    return NextResponse.redirect(new URL("/?wearable=unconfigured", req.url), { status: 302 });
  }

  const base = process.env.APP_URL ?? url.origin;
  const tokens = await exchangeCode(def, code, `${base}/api/wearables/callback/${provider}`);

  await prisma.wearableConnection.upsert({
    where: { patientId_provider: { patientId: verified.patientId, provider: def.slug } },
    update: tokens
      ? { status: "CONNECTED", accessToken: tokens.accessToken, refreshToken: tokens.refreshToken, expiresAt: tokens.expiresIn ? new Date(Date.now() + tokens.expiresIn * 1000) : null, scopes: def.scopes ?? [] }
      : { status: "ERROR" },
    create: { patientId: verified.patientId, provider: def.slug, status: tokens ? "CONNECTED" : "ERROR", accessToken: tokens?.accessToken, refreshToken: tokens?.refreshToken },
  });

  const hubToken = signPatientToken(verified.patientId);
  return NextResponse.redirect(new URL(`/hub/${hubToken}?wearable=${tokens ? "connected" : "error"}`, req.url), { status: 302 });
}
