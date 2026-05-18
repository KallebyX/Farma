import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/auth/session";
import { UnauthorizedError } from "@/lib/auth/permissions";
import { ConsentScope } from "@prisma/client";

export async function POST(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireSession();
    const { id } = await ctx.params;

    const patient = await prisma.patient.findFirst({
      where: { id, pharmacyId: session.pharmacyId },
    });
    if (!patient) {
      return NextResponse.json({ ok: false, error: "Não encontrado" }, { status: 404 });
    }

    await prisma.patientConsent.create({
      data: {
        patientId: id,
        scope: ConsentScope.SERVICE,
        granted: true,
        termsVersion: "1.0",
        source: "panel",
      },
    });

    const updated = await prisma.patient.update({
      where: { id },
      data: { consentGiven: true, consentDate: new Date() },
    });

    return NextResponse.json({ ok: true, patient: updated });
  } catch (err) {
    if (err instanceof UnauthorizedError) {
      return NextResponse.json({ ok: false, error: err.message }, { status: 401 });
    }
    console.error("[api/patients/:id/consent POST]", err);
    return NextResponse.json({ ok: false, error: "Erro inesperado" }, { status: 500 });
  }
}
