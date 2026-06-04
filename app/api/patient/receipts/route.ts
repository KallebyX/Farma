import { NextResponse } from "next/server";
import { resolvePatientFromRequest } from "@/lib/patient-session";
import { registerReceipt, listReceipts } from "@/lib/receipts";

/** GET /api/patient/receipts - notas registradas pelo paciente. */
export async function GET(req: Request) {
  try {
    const p = await resolvePatientFromRequest(req);
    if (!p) return NextResponse.json({ ok: false, error: "Sessão inválida" }, { status: 401 });
    const receipts = await listReceipts(p.id);
    return NextResponse.json({ ok: true, receipts });
  } catch {
    return NextResponse.json({ ok: false, error: "Erro" }, { status: 500 });
  }
}

/** POST /api/patient/receipts { code } - registra a nota fiscal (QR) e credita pontos. */
export async function POST(req: Request) {
  try {
    const p = await resolvePatientFromRequest(req);
    if (!p) return NextResponse.json({ ok: false, error: "Sessão inválida" }, { status: 401 });
    const { code } = (await req.json().catch(() => ({}))) as { code?: string };
    if (!code || typeof code !== "string") return NextResponse.json({ ok: false, error: "Código da nota ausente" }, { status: 400 });
    const result = await registerReceipt(p.id, p.pharmacyId, code);
    if (!result.ok) return NextResponse.json({ ok: false, error: result.error }, { status: result.status });
    return NextResponse.json({ ok: true, points: result.points }, { status: 201 });
  } catch {
    return NextResponse.json({ ok: false, error: "Erro" }, { status: 500 });
  }
}
