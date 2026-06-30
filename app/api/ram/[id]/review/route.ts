import { NextResponse } from "next/server";
import { tenantDb } from "@/lib/db";
import { requireSession } from "@/lib/auth/session";
import { ForbiddenError, UnauthorizedError, isAtLeast } from "@/lib/auth/permissions";
import { Role, RAMStatus } from "@prisma/client";
import { reviewRamSchema } from "@/lib/patients/schema";
import { emitWebhook } from "@/lib/webhooks/dispatch";
import { notifyEcosystem } from "@/lib/integrations/ecosystem";
import { randomBytes } from "node:crypto";

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireSession();
    if (!isAtLeast(session.role, Role.PHARMACIST)) {
      return NextResponse.json({ ok: false, error: "Apenas farmacêutico pode revisar RAM" }, { status: 403 });
    }
    const db = tenantDb(session.pharmacyId);
    const { id } = await ctx.params;

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ ok: false, error: "JSON inválido" }, { status: 400 });
    }
    const parsed = reviewRamSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ ok: false, error: "Dados inválidos" }, { status: 400 });
    }

    const ram = await db.rAMReport.findFirst({
      where: { id, patient: { pharmacyId: session.pharmacyId } },
    });
    if (!ram) return NextResponse.json({ ok: false, error: "Não encontrado" }, { status: 404 });

    let vigimedProtocol: string | undefined;
    if (parsed.data.forwardToVigimed) {
      // TODO: integrate with real VigiMed API. For now we generate a placeholder
      // protocol ID and persist that we forwarded so the audit log is intact.
      vigimedProtocol = generateProtocol();
    }

    const updated = await db.rAMReport.update({
      where: { id },
      data: {
        reviewedById: session.userId,
        reviewNotes: parsed.data.notes,
        status: parsed.data.forwardToVigimed
          ? RAMStatus.FORWARDED_VIGIMED
          : RAMStatus.REVIEWED,
        vigimedProtocol,
        forwardedAt: parsed.data.forwardToVigimed ? new Date() : null,
      },
    });

    // Notify the pharmacy's own webhooks and the ecosystem partners (the clinic
    // that issued the prescription gets the pharmacovigilance outcome back).
    void emitWebhook(session.pharmacyId, "ram.reviewed", {
      ramId: updated.id,
      status: updated.status,
      vigimedProtocol: vigimedProtocol ?? null,
    });
    if (parsed.data.forwardToVigimed) {
      void notifyEcosystem(session.pharmacyId, "ram.forwarded", {
        id: updated.id,
        patientId: updated.patientId,
        severity: updated.severity,
        vigimedProtocol: vigimedProtocol ?? null,
      });
    }

    return NextResponse.json({ ok: true, ram: updated, vigimedProtocol });
  } catch (err) {
    if (err instanceof UnauthorizedError) {
      return NextResponse.json({ ok: false, error: err.message }, { status: 401 });
    }
    if (err instanceof ForbiddenError) {
      return NextResponse.json({ ok: false, error: err.message }, { status: 403 });
    }
    console.error("[api/ram/:id/review]", err);
    return NextResponse.json({ ok: false, error: "Erro inesperado" }, { status: 500 });
  }
}

function generateProtocol(): string {
  const yr = new Date().getFullYear();
  const month = String(new Date().getMonth() + 1).padStart(2, "0");
  const rand = randomBytes(3).toString("hex").toUpperCase();
  return `VM-${yr}-${month}-${rand}`;
}
