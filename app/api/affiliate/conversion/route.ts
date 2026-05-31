import { NextResponse } from "next/server";
import { z } from "zod";
import { authenticatePartner, hasScope } from "@/lib/partner/auth";
import { recordConversion } from "@/lib/affiliate/service";
import { prisma } from "@/lib/db";
import { emitWebhook } from "@/lib/webhooks/dispatch";

const schema = z.object({
  partnerSlug: z.string().min(1),
  externalOrderId: z.string().min(1).max(120),
  amount: z.number().nonnegative(), // BRL
  clickRef: z.string().optional(),
  patientId: z.string().uuid().optional(),
});

/**
 * Partner → us. A pharmacy reports a confirmed purchase made through an
 * affiliate link. Authenticated with a partner API key. Idempotent.
 *   POST /api/affiliate/conversion   Authorization: Bearer mpk_...
 */
export async function POST(req: Request) {
  const auth = await authenticatePartner(req);
  if (!auth || !hasScope(auth, "affiliate:write")) {
    return NextResponse.json({ ok: false, error: "API key inválida ou sem escopo" }, { status: 401 });
  }
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "JSON inválido" }, { status: 400 });
  }
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "Dados inválidos", issues: parsed.error.issues }, { status: 400 });
  }

  const result = await recordConversion({
    partnerSlug: parsed.data.partnerSlug,
    externalOrderId: parsed.data.externalOrderId,
    amountCents: Math.round(parsed.data.amount * 100),
    clickRef: parsed.data.clickRef ?? null,
    patientId: parsed.data.patientId ?? null,
  });
  if (!result.ok) return NextResponse.json({ ok: false, error: result.error }, { status: result.status });

  // Notify the pharmacy's subscribed webhooks (best-effort).
  if (!result.duplicate && result.conversion.patientId) {
    const patient = await prisma.patient.findUnique({
      where: { id: result.conversion.patientId },
      select: { pharmacyId: true },
    });
    if (patient) {
      void emitWebhook(patient.pharmacyId, "order.created", {
        conversionId: result.conversion.id,
        amountCents: result.conversion.amountCents,
        pointsAwarded: result.conversion.pointsAwarded,
      });
    }
  }

  return NextResponse.json({
    ok: true,
    duplicate: result.duplicate,
    conversionId: result.conversion.id,
    pointsAwarded: result.conversion.pointsAwarded,
    commissionCents: result.conversion.commissionCents,
  });
}
