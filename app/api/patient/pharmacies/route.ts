import { NextResponse } from "next/server";
import { resolvePatientFromRequest } from "@/lib/patient-session";
import { listPatientPharmacies, linkPatientToPharmacy, unlinkPatientFromPharmacy } from "@/lib/patient-pharmacies";

/** GET /api/patient/pharmacies - pharmacies the patient is linked to (ranked by usage). */
export async function GET(req: Request) {
  try {
    const p = await resolvePatientFromRequest(req);
    if (!p) return NextResponse.json({ ok: false, error: "Sessão inválida" }, { status: 401 });
    const pharmacies = await listPatientPharmacies(p.id);
    return NextResponse.json({ ok: true, pharmacies });
  } catch {
    return NextResponse.json({ ok: false, error: "Erro" }, { status: 500 });
  }
}

/** POST /api/patient/pharmacies { pharmacyId } - link the patient to another pharmacy. */
export async function POST(req: Request) {
  try {
    const p = await resolvePatientFromRequest(req);
    if (!p) return NextResponse.json({ ok: false, error: "Sessão inválida" }, { status: 401 });
    const b = (await req.json().catch(() => ({}))) as { pharmacyId?: string };
    if (!b.pharmacyId) return NextResponse.json({ ok: false, error: "pharmacyId obrigatório" }, { status: 400 });
    const r = await linkPatientToPharmacy(p.id, b.pharmacyId);
    if (!r.ok) return NextResponse.json({ ok: false, error: r.error }, { status: r.status });
    return NextResponse.json({ ok: true, pharmacyName: r.pharmacyName }, { status: 201 });
  } catch {
    return NextResponse.json({ ok: false, error: "Erro" }, { status: 500 });
  }
}

/** DELETE /api/patient/pharmacies?patientId=… - unlink a pharmacy (not the current one). */
export async function DELETE(req: Request) {
  try {
    const p = await resolvePatientFromRequest(req);
    if (!p) return NextResponse.json({ ok: false, error: "Sessão inválida" }, { status: 401 });
    const targetPatientId = new URL(req.url).searchParams.get("patientId");
    if (!targetPatientId) return NextResponse.json({ ok: false, error: "patientId obrigatório" }, { status: 400 });
    const r = await unlinkPatientFromPharmacy(p.id, targetPatientId);
    if (!r.ok) return NextResponse.json({ ok: false, error: r.error }, { status: r.status });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false, error: "Erro" }, { status: 500 });
  }
}
