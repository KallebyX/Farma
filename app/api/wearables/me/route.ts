import { NextResponse } from "next/server";
import { verifyPatientToken } from "@/lib/patient-token";
import { connectionsFor, latestMetrics } from "@/lib/wearables/service";
import { listProviders, oauthConfigured } from "@/lib/wearables/providers";

/** GET /api/wearables/me?token=<patientToken> - connections + latest metrics. */
export async function GET(req: Request) {
  const token = new URL(req.url).searchParams.get("token");
  const patientId = verifyPatientToken(token);
  if (!patientId) return NextResponse.json({ ok: false, error: "Sessão inválida" }, { status: 401 });

  const [connections, latest] = await Promise.all([connectionsFor(patientId), latestMetrics(patientId)]);
  const providers = listProviders().map((p) => ({
    slug: p.slug, name: p.name, logo: p.logo, color: p.color, kind: p.kind,
    available: p.kind === "ingest" || oauthConfigured(p),
  }));
  return NextResponse.json({ ok: true, connections, latest, providers });
}
