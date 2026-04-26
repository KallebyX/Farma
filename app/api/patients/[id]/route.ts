import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/auth/session";
import { UnauthorizedError } from "@/lib/auth/permissions";
import { PatientStatus } from "@prisma/client";

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireSession();
    const { id } = await ctx.params;

    const patient = await prisma.patient.findFirst({
      where: { id, pharmacyId: session.pharmacyId },
      include: {
        prescriptions: {
          orderBy: { createdAt: "desc" },
          include: {
            medication: true,
            adherence: {
              orderBy: { scheduledFor: "desc" },
              take: 30,
            },
          },
        },
        consents: { orderBy: { capturedAt: "desc" } },
        ramReports: { orderBy: { createdAt: "desc" } },
      },
    });

    if (!patient) return NextResponse.json({ ok: false, error: "Não encontrado" }, { status: 404 });

    // adherence rate over last 30 events
    const recent = patient.prescriptions.flatMap((p) => p.adherence);
    const taken = recent.filter((e) => e.outcome === "TAKEN" || e.outcome === "TAKEN_LATE").length;
    const adherenceRate = recent.length === 0 ? null : taken / recent.length;

    return NextResponse.json({
      ok: true,
      patient,
      adherenceRate,
      polypharmacy: patient.prescriptions.filter((p) => p.status === "ACTIVE").length >= 5,
    });
  } catch (err) {
    if (err instanceof UnauthorizedError) {
      return NextResponse.json({ ok: false, error: err.message }, { status: 401 });
    }
    console.error("[api/patients/:id GET]", err);
    return NextResponse.json({ ok: false, error: "Erro inesperado" }, { status: 500 });
  }
}

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireSession();
    const { id } = await ctx.params;
    const body = (await req.json().catch(() => ({}))) as { status?: PatientStatus };

    if (!body.status || !Object.values(PatientStatus).includes(body.status)) {
      return NextResponse.json({ ok: false, error: "Status inválido" }, { status: 400 });
    }

    const patient = await prisma.patient.findFirst({
      where: { id, pharmacyId: session.pharmacyId },
    });
    if (!patient) return NextResponse.json({ ok: false, error: "Não encontrado" }, { status: 404 });

    const updated = await prisma.patient.update({
      where: { id },
      data: { status: body.status },
    });

    if (body.status === "PAUSED" || body.status === "WITHDRAWN") {
      await prisma.prescription.updateMany({
        where: { patientId: id, status: "ACTIVE" },
        data: { status: "PAUSED" },
      });
    }
    return NextResponse.json({ ok: true, patient: updated });
  } catch (err) {
    if (err instanceof UnauthorizedError) {
      return NextResponse.json({ ok: false, error: err.message }, { status: 401 });
    }
    console.error("[api/patients/:id PATCH]", err);
    return NextResponse.json({ ok: false, error: "Erro inesperado" }, { status: 500 });
  }
}
