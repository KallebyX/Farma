import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/session";
import { UnauthorizedError } from "@/lib/auth/permissions";
import { prisma } from "@/lib/db";
import { createExamFromFile, listExamsForPatient } from "@/lib/exams";

/** GET /api/exams?patientId=… — list a patient's exams (staff, tenant-scoped). */
export async function GET(req: Request) {
  try {
    const ctx = await requireSession();
    const patientId = new URL(req.url).searchParams.get("patientId");
    if (!patientId) return NextResponse.json({ ok: false, error: "patientId obrigatório" }, { status: 400 });
    const exams = await listExamsForPatient(patientId, ctx.pharmacyId);
    return NextResponse.json({ ok: true, exams });
  } catch (err) {
    if (err instanceof UnauthorizedError) return NextResponse.json({ ok: false, error: err.message }, { status: 401 });
    return NextResponse.json({ ok: false, error: "Erro" }, { status: 500 });
  }
}

/** POST /api/exams — multipart upload (staff): { patientId, title, category?, file }. */
export async function POST(req: Request) {
  try {
    const ctx = await requireSession();
    const form = await req.formData();
    const patientId = String(form.get("patientId") ?? "");
    const title = String(form.get("title") ?? "");
    const category = form.get("category") ? String(form.get("category")) : null;
    const file = form.get("file");
    if (!patientId || !(file instanceof File)) {
      return NextResponse.json({ ok: false, error: "patientId e file obrigatórios" }, { status: 400 });
    }
    const patient = await prisma.patient.findFirst({ where: { id: patientId, pharmacyId: ctx.pharmacyId }, select: { id: true } });
    if (!patient) return NextResponse.json({ ok: false, error: "Paciente não encontrado" }, { status: 404 });

    const result = await createExamFromFile({ patientId, pharmacyId: ctx.pharmacyId, title, category, file, uploadedBy: ctx.userId });
    if (!result.ok) return NextResponse.json({ ok: false, error: result.error }, { status: result.status });
    return NextResponse.json({ ok: true, exam: result.exam }, { status: 201 });
  } catch (err) {
    if (err instanceof UnauthorizedError) return NextResponse.json({ ok: false, error: err.message }, { status: 401 });
    return NextResponse.json({ ok: false, error: "Erro" }, { status: 500 });
  }
}
