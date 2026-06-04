import { NextResponse } from "next/server";
import { resolvePatientFromRequest } from "@/lib/patient-session";
import { createPrescriptionFromFile, listForPatient } from "@/lib/rx";

/** GET /api/patient/prescriptions - patient's own digital prescriptions. */
export async function GET(req: Request) {
  try {
    const p = await resolvePatientFromRequest(req);
    if (!p) return NextResponse.json({ ok: false, error: "Sessão inválida" }, { status: 401 });
    const prescriptions = await listForPatient(p.id);
    return NextResponse.json({ ok: true, prescriptions });
  } catch {
    return NextResponse.json({ ok: false, error: "Erro" }, { status: 500 });
  }
}

/** POST /api/patient/prescriptions - patient uploads a (possibly signed) prescription. */
export async function POST(req: Request) {
  try {
    const p = await resolvePatientFromRequest(req);
    if (!p) return NextResponse.json({ ok: false, error: "Sessão inválida" }, { status: 401 });
    const form = await req.formData();
    const file = form.get("file");
    if (!(file instanceof File)) return NextResponse.json({ ok: false, error: "file obrigatório" }, { status: 400 });
    const result = await createPrescriptionFromFile({ patientId: p.id, pharmacyId: p.pharmacyId, file });
    if (!result.ok) return NextResponse.json({ ok: false, error: result.error }, { status: result.status });
    return NextResponse.json({ ok: true, prescription: result.prescription, signatureNote: result.signatureNote }, { status: 201 });
  } catch {
    return NextResponse.json({ ok: false, error: "Erro" }, { status: 500 });
  }
}
