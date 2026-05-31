import { NextResponse } from "next/server";
import { tenantDb } from "@/lib/db";
import { requireSession } from "@/lib/auth/session";
import { UnauthorizedError } from "@/lib/auth/permissions";
import { signPatientToken } from "@/lib/patient-token";

/**
 * GET /api/patients/[id]/hub-link — staff generates the patient's loyalty hub
 * magic link (to share via WhatsApp). Tenant-scoped: the patient must belong
 * to the caller's pharmacy.
 */
export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireSession();
    const db = tenantDb(session.pharmacyId);
    const { id } = await ctx.params;

    const patient = await db.patient.findFirst({
      where: { id, pharmacyId: session.pharmacyId },
      select: { id: true },
    });
    if (!patient) return NextResponse.json({ ok: false, error: "Não encontrado" }, { status: 404 });

    const token = signPatientToken(patient.id);
    const base = process.env.APP_URL ?? "";
    return NextResponse.json({ ok: true, token, url: `${base}/hub/${token}` });
  } catch (err) {
    if (err instanceof UnauthorizedError) return NextResponse.json({ ok: false, error: err.message }, { status: 401 });
    return NextResponse.json({ ok: false, error: "Erro inesperado" }, { status: 500 });
  }
}
