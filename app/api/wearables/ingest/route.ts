import { NextResponse } from "next/server";
import { authConnectionByToken, ingestSamples, type IncomingSample } from "@/lib/wearables/service";
import { isHaePayload, parseHealthAutoExport } from "@/lib/wearables/health-auto-export";

/**
 * POST /api/wearables/ingest
 * Header: Authorization: Bearer <ingestToken>
 * Body:   { samples: [{ metric, value, unit, recordedAt, source?, externalId? }] }
 *         - or the "Health Auto Export" iOS app payload { data: { metrics: [...] } }
 *
 * The universal health-data sink: Apple Health Shortcuts, the Health Auto Export
 * app, a companion app, or an aggregator (Terra/Vital) push samples here.
 * Idempotent per sample.
 */
export async function POST(req: Request) {
  const header = req.headers.get("authorization") ?? "";
  const m = /^Bearer\s+(wph_[A-Za-z0-9_-]+)$/.exec(header.trim());
  const auth = await authConnectionByToken(m?.[1]);
  if (!auth) {
    return NextResponse.json({ ok: false, error: "Token de ingestão inválido" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "JSON inválido" }, { status: 400 });
  }

  // Accept either our native { samples[] } or the Health Auto Export shape.
  let samples: IncomingSample[];
  if (isHaePayload(body)) {
    samples = parseHealthAutoExport(body);
  } else if (Array.isArray((body as { samples?: IncomingSample[] }).samples)) {
    samples = (body as { samples: IncomingSample[] }).samples;
  } else {
    return NextResponse.json({ ok: false, error: "samples[] ou data.metrics[] obrigatório" }, { status: 400 });
  }

  if (samples.length === 0) {
    return NextResponse.json({ ok: false, error: "Nenhuma amostra reconhecida" }, { status: 400 });
  }
  if (samples.length > 5000) {
    return NextResponse.json({ ok: false, error: "Máximo 5000 amostras por requisição" }, { status: 413 });
  }

  const result = await ingestSamples(auth.patientId, auth.provider, samples);
  return NextResponse.json({ ok: true, ...result });
}
