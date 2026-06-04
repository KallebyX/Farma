import { randomBytes } from "node:crypto";
import { prisma } from "@/lib/db";
import { awardPoints } from "@/lib/loyalty/service";

/**
 * Referral program. A patient shares their code (/cadastro?ref=CODE); when a
 * friend signs up through it, the friend joins the referrer's pharmacy and the
 * referrer earns the pharmacy-configured `referralPoints`. Idempotent: a patient
 * can be referred only once (Referral.referredId is unique) and points are
 * awarded through the loyalty ledger (also idempotent).
 */

export function generateReferralCode(): string {
  return randomBytes(6).toString("base64url").replace(/[-_]/g, "").slice(0, 7).toUpperCase();
}

export async function getOrCreateCode(patientId: string): Promise<string> {
  const p = await prisma.patient.findUnique({ where: { id: patientId }, select: { referralCode: true } });
  if (p?.referralCode) return p.referralCode;
  for (let i = 0; i < 6; i++) {
    const code = generateReferralCode();
    try {
      await prisma.patient.update({ where: { id: patientId }, data: { referralCode: code } });
      return code;
    } catch (e) {
      if ((e as { code?: string })?.code !== "P2002") throw e; // collision → retry
    }
  }
  throw new Error("could not allocate referral code");
}

export function resolveReferrer(code: string) {
  if (!code) return Promise.resolve(null);
  return prisma.patient.findUnique({
    where: { referralCode: code.trim().toUpperCase() },
    select: { id: true, pharmacyId: true, name: true, pharmacy: { select: { fantasia: true, razaoSocial: true, referralEnabled: true } } },
  });
}

export async function recordReferral(args: { referredId: string; referrerId: string; pharmacyId: string }) {
  if (args.referredId === args.referrerId) return;
  const existing = await prisma.referral.findUnique({ where: { referredId: args.referredId } });
  if (existing) return;
  const ph = await prisma.pharmacy.findUnique({ where: { id: args.pharmacyId }, select: { referralEnabled: true, referralPoints: true } });
  if (!ph?.referralEnabled) return;
  try {
    await prisma.referral.create({ data: { referredId: args.referredId, referrerId: args.referrerId, pharmacyId: args.pharmacyId, pointsAwarded: ph.referralPoints } });
  } catch (e) {
    if ((e as { code?: string })?.code === "P2002") return; // raced - already recorded
    throw e;
  }
  await awardPoints({ patientId: args.referrerId, delta: ph.referralPoints, reason: "referral", refType: "referral", refId: args.referredId });
}

export async function referralStats(patientId: string) {
  const [code, agg] = await Promise.all([
    getOrCreateCode(patientId),
    prisma.referral.aggregate({ where: { referrerId: patientId }, _count: true, _sum: { pointsAwarded: true } }),
  ]);
  return { code, count: agg._count, points: agg._sum.pointsAwarded ?? 0 };
}
