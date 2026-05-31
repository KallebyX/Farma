import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/db";
import { verifyPatientToken } from "@/lib/patient-token";
import { createExamFromFile, listExamsForPatient } from "@/lib/exams";

/** Resolve the patient from a hub token (Authorization: Bearer … or mp_hub cookie). */
async function resolvePatient(req: Request): Promise<{ id: string; pharmacyId: string } | null> {
  const auth = req.headers.get("authorization");
  const bearer = auth?.startsWith("Bearer ") ? auth.slice(7) : null;
  const cookieToken = (await cookies()).get("mp_hub")?.value ?? null;
  const patientId = verifyPatientToken(bearer ?? cookieToken);
  if (!patientId) return null;
  return prisma.patient.findUnique({ where: { id: patientId }, select: { id: true, pharmacyId: true } });
}

/** GET /api/patient/exams — the patient's own exams. */
export async function GET(req: Request) {
  try {
    const p = await resolvePatient(req);
    if (!p) return NextResponse.json({ ok: false, error: "Sessão inválida" }, { status: 401 });
    const exams = await listExamsForPatient(p.id);
    return NextResponse.json({ ok: true, exams });
  } catch {
    return NextResponse.json({ ok: false, error: "Erro" }, { status: 500 });
  }
}

/** POST /api/patient/exams — patient uploads an exam to share with the pharmacy. */
export async function POST(req: Request) {
  try {
    const p = await resolvePatient(req);
    if (!p) return NextResponse.json({ ok: false, error: "Sessão inválida" }, { status: 401 });
    const form = await req.formData();
    const title = String(form.get("title") ?? "");
    const category = form.get("category") ? String(form.get("category")) : "Enviado pelo paciente";
    const file = form.get("file");
    if (!(file instanceof File)) return NextResponse.json({ ok: false, error: "file obrigatório" }, { status: 400 });
    const result = await createExamFromFile({ patientId: p.id, pharmacyId: p.pharmacyId, title, category, file, uploadedBy: "patient" });
    if (!result.ok) return NextResponse.json({ ok: false, error: result.error }, { status: result.status });
    return NextResponse.json({ ok: true, exam: result.exam }, { status: 201 });
  } catch {
    return NextResponse.json({ ok: false, error: "Erro" }, { status: 500 });
  }
}
