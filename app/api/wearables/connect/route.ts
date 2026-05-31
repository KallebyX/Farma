import { NextResponse } from "next/server";
import { verifyPatientToken } from "@/lib/patient-token";
import { PROVIDERS, oauthConfigured } from "@/lib/wearables/providers";
import { startConnection, isValidProvider } from "@/lib/wearables/service";
import { signState, buildAuthUrl } from "@/lib/wearables/oauth";

/**
 * POST /api/wearables/connect { token, provider }
 * - OAuth provider with creds → returns { mode:"oauth", authUrl } to redirect to.
 * - Apple/Samsung/SDK (or OAuth without creds) → returns { mode:"ingest",
 *   ingestToken, ingestUrl } for the phone app / Apple Shortcut / aggregator.
 */
export async function POST(req: Request) {
  let body: { token?: string; provider?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "JSON inválido" }, { status: 400 });
  }
  const patientId = verifyPatientToken(body.token);
  if (!patientId) return NextResponse.json({ ok: false, error: "Sessão inválida" }, { status: 401 });
  if (!body.provider || !isValidProvider(body.provider)) {
    return NextResponse.json({ ok: false, error: "Provedor inválido" }, { status: 400 });
  }

  const def = PROVIDERS[body.provider];
  const { ingestToken } = await startConnection(patientId, def.slug);

  if (def.kind === "oauth" && oauthConfigured(def)) {
    const base = process.env.APP_URL ?? new URL(req.url).origin;
    const redirectUri = `${base}/api/wearables/callback/${def.slug}`;
    const authUrl = buildAuthUrl(def, signState(patientId, def.slug), redirectUri);
    return NextResponse.json({ ok: true, mode: "oauth", authUrl });
  }

  // SDK/ingest path (Apple Watch, Samsung, Garmin, or OAuth provider sem credencial).
  const base = process.env.APP_URL ?? new URL(req.url).origin;
  return NextResponse.json({
    ok: true,
    mode: "ingest",
    provider: def.slug,
    ingestToken,
    ingestUrl: `${base}/api/wearables/ingest`,
    instructions:
      "Use este token no header Authorization: Bearer <token> ao enviar amostras. " +
      "No iPhone, crie uma Automação no app Atalhos (Apple Saúde → obter amostras → POST para a ingestUrl). " +
      "Em Android/Samsung, use o app companheiro ou um agregador (Terra/Vital).",
  });
}
