import { NextResponse } from "next/server";
import { authConnectionByToken, ingestSamples, type IncomingSample } from "@/lib/wearables/service";

/**
 * POST /api/wearables/ingest
 * Header: Authorization: Bearer <ingestToken>
 * Body:   { samples: [{ metric, value, unit, recordedAt, source?, externalId? }] }
 *
 * The universal health-data sink: Apple Health Shortcuts, a companion app, or an
 * aggregator (Terra/Vital) push samples here. Idempotent per sample.
 */
export async function POST(req: Request) {
  const header = req.headers.get("authorization") ?? "";
  const m = /^Bearer\s+(wph_[A-Za-z0-9_-]+)$/.exec(header.trim());
  const auth = await authConnectionByToken(m?.[1]);
  if (!auth) {
    return NextResponse.json({ ok: false, error: "Token de ingestão inválido" }, { status: 401 });
  }

  let body: { samples?: IncomingSample[] };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "JSON inválido" }, { status: 400 });
  }
  if (!Array.isArray(body.samples) || body.samples.length === 0) {
    return NextResponse.json({ ok: false, error: "samples[] obrigatório" }, { status: 400 });
  }
  if (body.samples.length > 1000) {
    return NextResponse.json({ ok: false, error: "Máximo 1000 amostras por requisição" }, { status: 413 });
  }

  const result = await ingestSamples(auth.patientId, auth.provider, body.samples);
  return NextResponse.json({ ok: true, ...result });
}
