import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/session";
import { UnauthorizedError } from "@/lib/auth/permissions";
import { prisma } from "@/lib/db";
import { dispense } from "@/lib/rx";

/** POST /api/rx/dispense - staff records a dispensation (with traceability). */
export async function POST(req: Request) {
  try {
    const ctx = await requireSession();
    const b = (await req.json().catch(() => ({}))) as Record<string, unknown>;
    const patientId = String(b.patientId ?? "");
    const patient = await prisma.patient.findFirst({ where: { id: patientId, pharmacyId: ctx.pharmacyId }, select: { id: true } });
    if (!patient) return NextResponse.json({ ok: false, error: "Paciente não encontrado" }, { status: 404 });

    const result = await dispense({
      prescriptionId: b.prescriptionId ? String(b.prescriptionId) : null,
      patientId, pharmacyId: ctx.pharmacyId, dispensedBy: ctx.userId,
      medication: String(b.medication ?? ""), batchLot: b.batchLot ? String(b.batchLot) : null,
      quantity: typeof b.quantity === "number" ? b.quantity : Number(b.quantity) || 1,
      nfeAccessKey: b.nfeAccessKey ? String(b.nfeAccessKey) : null, crm: b.crm ? String(b.crm) : null,
      controlled: Boolean(b.controlled),
    });
    if (!result.ok) return NextResponse.json({ ok: false, error: result.error }, { status: 400 });
    return NextResponse.json({ ok: true, dispensationId: result.dispensationId }, { status: 201 });
  } catch (err) {
    if (err instanceof UnauthorizedError) return NextResponse.json({ ok: false, error: err.message }, { status: 401 });
    return NextResponse.json({ ok: false, error: "Erro" }, { status: 500 });
  }
}
