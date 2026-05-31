import { prisma } from "@/lib/db";
import { LoyaltyTier, type Prisma } from "@prisma/client";

/**
 * Loyalty / gamification domain service. Self-contained module: all points
 * movements go through an append-only ledger (PointsEntry) with a uniqueness
 * key so awards are idempotent.
 */

const TIER_THRESHOLDS: { tier: LoyaltyTier; min: number }[] = [
  { tier: LoyaltyTier.PLATINUM, min: 5000 },
  { tier: LoyaltyTier.GOLD, min: 2000 },
  { tier: LoyaltyTier.SILVER, min: 500 },
  { tier: LoyaltyTier.BRONZE, min: 0 },
];

export function tierFor(lifetime: number): LoyaltyTier {
  return (TIER_THRESHOLDS.find((t) => lifetime >= t.min) ?? TIER_THRESHOLDS[TIER_THRESHOLDS.length - 1]).tier;
}

export async function getOrCreateAccount(patientId: string) {
  return prisma.loyaltyAccount.upsert({
    where: { patientId },
    update: {},
    create: { patientId },
  });
}

type AwardArgs = {
  patientId: string;
  delta: number;
  reason: string;
  refType?: string;
  refId?: string;
};

/**
 * Awards (or deducts) points idempotently. The (reason, refType, refId) tuple
 * is unique, so re-processing the same event (e.g. a webhook retry) is a no-op.
 * Returns the updated account, or null if it was a duplicate.
 */
export async function awardPoints(args: AwardArgs) {
  const { patientId, delta, reason, refType = null, refId = null } = args;
  return prisma.$transaction(async (tx) => {
    try {
      await tx.pointsEntry.create({ data: { patientId, delta, reason, refType, refId } });
    } catch (e) {
      // unique violation => already awarded
      if ((e as Prisma.PrismaClientKnownRequestError)?.code === "P2002") return null;
      throw e;
    }
    const acc = await tx.loyaltyAccount.upsert({
      where: { patientId },
      update: {},
      create: { patientId },
    });
    const points = Math.max(0, acc.points + delta);
    const lifetime = delta > 0 ? acc.lifetime + delta : acc.lifetime;
    return tx.loyaltyAccount.update({
      where: { patientId },
      data: { points, lifetime, tier: tierFor(lifetime), lastActueAt: new Date() },
    });
  });
}

/** Marks a mission complete (once per patient) and awards its points. */
export async function completeMission(patientId: string, code: string) {
  const mission = await prisma.mission.findUnique({ where: { code } });
  if (!mission || !mission.active) return { ok: false as const, error: "Missão indisponível" };

  const already = await prisma.missionCompletion.findUnique({
    where: { patientId_missionId: { patientId, missionId: mission.id } },
  });
  if (already) return { ok: false as const, error: "Missão já concluída" };

  await prisma.missionCompletion.create({ data: { patientId, missionId: mission.id } });
  const account = await awardPoints({
    patientId,
    delta: mission.points,
    reason: "mission",
    refType: "mission",
    refId: mission.id,
  });
  return { ok: true as const, points: mission.points, account };
}

/** Redeems a reward: checks balance + stock, debits points, creates redemption. */
export async function redeemReward(patientId: string, rewardCode: string) {
  return prisma.$transaction(async (tx) => {
    const reward = await tx.reward.findUnique({ where: { code: rewardCode } });
    if (!reward || !reward.active) return { ok: false as const, error: "Recompensa indisponível" };
    if (reward.stock != null && reward.stock <= 0) return { ok: false as const, error: "Esgotado" };

    const acc = await tx.loyaltyAccount.findUnique({ where: { patientId } });
    if (!acc || acc.points < reward.costPoints) return { ok: false as const, error: "Pontos insuficientes" };

    const voucher = `MP-${reward.code.toUpperCase()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
    const redemption = await tx.redemption.create({
      data: { patientId, rewardId: reward.id, costPoints: reward.costPoints, voucher },
    });
    await tx.pointsEntry.create({
      data: { patientId, delta: -reward.costPoints, reason: "redemption", refType: "redemption", refId: redemption.id },
    });
    await tx.loyaltyAccount.update({
      where: { patientId },
      data: { points: acc.points - reward.costPoints },
    });
    if (reward.stock != null) {
      await tx.reward.update({ where: { id: reward.id }, data: { stock: reward.stock - 1 } });
    }
    return { ok: true as const, voucher, redemption };
  });
}

/** Full hub snapshot for a patient. */
export async function getHubData(patientId: string) {
  const [patient, account, missions, completions, rewards, partners, recentPoints] = await Promise.all([
    prisma.patient.findUnique({ where: { id: patientId }, select: { id: true, name: true } }),
    getOrCreateAccount(patientId),
    prisma.mission.findMany({ where: { active: true }, orderBy: { sortOrder: "asc" } }),
    prisma.missionCompletion.findMany({ where: { patientId }, select: { missionId: true } }),
    prisma.reward.findMany({ where: { active: true }, orderBy: { costPoints: "asc" } }),
    prisma.affiliatePartner.findMany({ where: { active: true }, orderBy: { name: "asc" } }),
    prisma.pointsEntry.findMany({ where: { patientId }, orderBy: { createdAt: "desc" }, take: 10 }),
  ]);
  const done = new Set(completions.map((c) => c.missionId));
  return {
    patient,
    account,
    missions: missions.map((m) => ({ ...m, completed: done.has(m.id) })),
    rewards,
    partners,
    recentPoints,
  };
}
