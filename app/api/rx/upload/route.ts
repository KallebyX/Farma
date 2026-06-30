import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { requireSession } from "@/lib/auth/session";
import { ForbiddenError, UnauthorizedError, isAtLeast } from "@/lib/auth/permissions";
import { Role } from "@prisma/client";
import { createPrescriptionFromFile } from "@/lib/rx";

export const dynamic = "force-dynamic";

/**
 * POST /api/rx/upload (multipart {file, patientId}) — staff uploads a photo/PDF
 * of a paper or digital prescription. Creates a DigitalPrescription (signature
 * auto-detected → lead) so it shows up in /receitas for dispensation.
 */
export async function POST(req: Request) {
  try {
    const ctx = await requireSession();
    if (!isAtLeast(ctx.role, Role.ATTENDANT)) {
      return NextResponse.json({ ok: false, error: "Sem permissão" }, { status: 403 });
    }
    const form = await req.formData();
    const file = form.get("file");
    const patientId = String(form.get("patientId") ?? "").trim();
    if (!patientId) return NextResponse.json({ ok: false, error: "Selecione o paciente" }, { status: 400 });
    if (!(file instanceof File)) return NextResponse.json({ ok: false, error: "Arquivo obrigatório" }, { status: 400 });

    // Confirm the patient belongs to this pharmacy (tenant isolation).
    const { prisma } = await import("@/lib/db");
    const patient = await prisma.patient.findFirst({
      where: { id: patientId, pharmacyId: ctx.pharmacyId },
      select: { id: true },
    });
    if (!patient) return NextResponse.json({ ok: false, error: "Paciente não encontrado" }, { status: 404 });

    const result = await createPrescriptionFromFile({ patientId, pharmacyId: ctx.pharmacyId, file });
    if (!result.ok) return NextResponse.json({ ok: false, error: result.error }, { status: result.status });

    revalidatePath("/receitas");
    return NextResponse.json({ ok: true, prescription: result.prescription, note: result.signatureNote }, { status: 201 });
  } catch (err) {
    if (err instanceof UnauthorizedError) return NextResponse.json({ ok: false, error: err.message }, { status: 401 });
    if (err instanceof ForbiddenError) return NextResponse.json({ ok: false, error: err.message }, { status: 403 });
    console.error("[api/rx/upload]", err);
    return NextResponse.json({ ok: false, error: "Erro inesperado" }, { status: 500 });
  }
}
