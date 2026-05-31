import { randomBytes, createHash, timingSafeEqual } from "node:crypto";
import { prisma } from "@/lib/db";
import { HealthMetric, WearableProvider, type Prisma } from "@prisma/client";

/** Wearable domain service: connections, sample ingestion, latest metrics. */

const sha256 = (s: string) => createHash("sha256").update(s).digest("hex");

const VALID_METRICS = new Set(Object.values(HealthMetric));
const VALID_PROVIDERS = new Set(Object.values(WearableProvider));

/** Create or return a connection; issues a fresh ingest token (plaintext once). */
export async function startConnection(patientId: string, provider: WearableProvider) {
  const ingestToken = `wph_${randomBytes(20).toString("base64url")}`;
  const conn = await prisma.wearableConnection.upsert({
    where: { patientId_provider: { patientId, provider } },
    update: { ingestTokenHash: sha256(ingestToken) },
    create: { patientId, provider, status: "PENDING", ingestTokenHash: sha256(ingestToken) },
  });
  return { conn, ingestToken };
}

/** Resolve a connection from a Bearer ingest token. */
export async function authConnectionByToken(token: string | undefined): Promise<{ patientId: string; provider: WearableProvider } | null> {
  if (!token) return null;
  const hash = sha256(token);
  const conn = await prisma.wearableConnection.findFirst({
    where: { ingestTokenHash: hash, status: { not: "REVOKED" } },
    select: { id: true, patientId: true, provider: true, ingestTokenHash: true },
  });
  if (!conn || !conn.ingestTokenHash) return null;
  const a = Buffer.from(conn.ingestTokenHash);
  const b = Buffer.from(hash);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  return { patientId: conn.patientId, provider: conn.provider };
}

export type IncomingSample = {
  metric: string;
  value: number;
  unit?: string;
  recordedAt: string;
  source?: string;
  externalId?: string;
};

/** Stores a batch of samples idempotently and marks the connection synced. */
export async function ingestSamples(patientId: string, provider: WearableProvider, samples: IncomingSample[]) {
  let stored = 0;
  for (const s of samples) {
    const metric = s.metric as HealthMetric;
    if (!VALID_METRICS.has(metric) || typeof s.value !== "number" || !s.recordedAt) continue;
    const recordedAt = new Date(s.recordedAt);
    if (isNaN(recordedAt.getTime())) continue;
    try {
      await prisma.wearableSample.create({
        data: {
          patientId, provider, metric, value: s.value,
          unit: s.unit?.slice(0, 16) ?? "",
          recordedAt, source: s.source?.slice(0, 80), externalId: s.externalId?.slice(0, 120),
        },
      });
      stored++;
    } catch (e) {
      // duplicate (unique patientId+metric+recordedAt+provider) → skip
      if ((e as Prisma.PrismaClientKnownRequestError)?.code !== "P2002") throw e;
    }
  }
  await prisma.wearableConnection.updateMany({
    where: { patientId, provider },
    data: { status: "CONNECTED", lastSyncAt: new Date() },
  });
  return { stored, received: samples.length };
}

/** Latest value per metric for a patient (for the hub). */
export async function latestMetrics(patientId: string) {
  const rows = await prisma.wearableSample.findMany({
    where: { patientId },
    orderBy: { recordedAt: "desc" },
    take: 200,
  });
  const latest: Record<string, { value: number; unit: string; recordedAt: string; source: string | null; provider: string }> = {};
  for (const r of rows) {
    if (!latest[r.metric]) {
      latest[r.metric] = { value: r.value, unit: r.unit, recordedAt: r.recordedAt.toISOString(), source: r.source, provider: r.provider };
    }
  }
  return latest;
}

export async function connectionsFor(patientId: string) {
  return prisma.wearableConnection.findMany({
    where: { patientId },
    orderBy: { createdAt: "asc" },
    select: { provider: true, status: true, lastSyncAt: true },
  });
}

export function isValidProvider(p: string): p is WearableProvider {
  return VALID_PROVIDERS.has(p as WearableProvider);
}
