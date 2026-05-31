import { prisma } from "@/lib/db";
import { WearableProvider } from "@prisma/client";
import { PROVIDERS, oauthConfigured, type ProviderDef } from "./providers";
import { ingestSamples, type IncomingSample } from "./service";

/**
 * Server-side sync for OAuth wearable providers (Fitbit, Oura, …).
 *
 * A cron worker (/api/cron/sync-wearables) periodically pulls fresh samples for
 * every CONNECTED oauth connection. Ingest providers (Apple/Samsung/Garmin) are
 * never touched here — those push to /api/wearables/ingest.
 *
 * Flow per connection:
 *   1. refresh the access token if it is missing or near expiry
 *   2. pull the last LOOKBACK_DAYS of daily summaries from the provider
 *   3. ingest the mapped samples (idempotent) and stamp lastSyncAt
 */

const LOOKBACK_DAYS = 2;
const REFRESH_SKEW_MS = 5 * 60_000; // refresh if it expires within 5 min

type Conn = {
  id: string;
  patientId: string;
  provider: WearableProvider;
  accessToken: string | null;
  refreshToken: string | null;
  expiresAt: Date | null;
};

/** ── token refresh ─────────────────────────────────────────────────────── */

async function refreshIfNeeded(def: ProviderDef, conn: Conn): Promise<string | null> {
  const fresh = conn.expiresAt && conn.expiresAt.getTime() - Date.now() > REFRESH_SKEW_MS;
  if (conn.accessToken && fresh) return conn.accessToken;
  if (!conn.refreshToken) return conn.accessToken; // nothing to refresh with

  const clientId = process.env[def.clientIdEnv!]!;
  const clientSecret = process.env[def.clientSecretEnv!]!;
  try {
    const res = await fetch(def.tokenUrl!, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization: "Basic " + Buffer.from(`${clientId}:${clientSecret}`).toString("base64"),
      },
      body: new URLSearchParams({ grant_type: "refresh_token", refresh_token: conn.refreshToken }),
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) {
      await prisma.wearableConnection.update({ where: { id: conn.id }, data: { status: "ERROR" } });
      return null;
    }
    const j = (await res.json()) as { access_token?: string; refresh_token?: string; expires_in?: number };
    if (!j.access_token) return null;
    await prisma.wearableConnection.update({
      where: { id: conn.id },
      data: {
        accessToken: j.access_token,
        refreshToken: j.refresh_token ?? conn.refreshToken,
        expiresAt: j.expires_in ? new Date(Date.now() + j.expires_in * 1000) : null,
      },
    });
    return j.access_token;
  } catch {
    return null;
  }
}

/** ── provider pullers ──────────────────────────────────────────────────── */

async function getJson<T>(url: string, accessToken: string): Promise<T | null> {
  try {
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${accessToken}`, Accept: "application/json" },
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

function ymd(d: Date): string {
  return d.toISOString().slice(0, 10);
}
function daysAgo(n: number): Date {
  return new Date(Date.now() - n * 86400_000);
}
/** Daily summaries are dated; record them at local noon to avoid TZ edge flips. */
function atNoon(dateStr: string): string {
  return new Date(`${dateStr}T12:00:00.000Z`).toISOString();
}

async function pullFitbit(accessToken: string): Promise<IncomingSample[]> {
  const out: IncomingSample[] = [];
  for (let i = 0; i < LOOKBACK_DAYS; i++) {
    const date = ymd(daysAgo(i));
    const at = atNoon(date);

    const act = await getJson<{ summary?: { steps?: number; caloriesOut?: number; restingHeartRate?: number } }>(
      `https://api.fitbit.com/1/user/-/activities/date/${date}.json`,
      accessToken,
    );
    if (act?.summary) {
      const s = act.summary;
      if (typeof s.steps === "number") out.push({ metric: "STEPS", value: s.steps, unit: "steps", recordedAt: at, source: "Fitbit" });
      if (typeof s.caloriesOut === "number") out.push({ metric: "CALORIES", value: s.caloriesOut, unit: "kcal", recordedAt: at, source: "Fitbit" });
      if (typeof s.restingHeartRate === "number") out.push({ metric: "RESTING_HR", value: s.restingHeartRate, unit: "bpm", recordedAt: at, source: "Fitbit" });
    }

    const spo2 = await getJson<{ value?: { avg?: number } }>(
      `https://api.fitbit.com/1/user/-/spo2/date/${date}.json`,
      accessToken,
    );
    if (typeof spo2?.value?.avg === "number") out.push({ metric: "SPO2", value: spo2.value.avg, unit: "%", recordedAt: at, source: "Fitbit" });

    const sleep = await getJson<{ summary?: { totalMinutesAsleep?: number } }>(
      `https://api.fitbit.com/1.2/user/-/sleep/date/${date}.json`,
      accessToken,
    );
    if (typeof sleep?.summary?.totalMinutesAsleep === "number")
      out.push({ metric: "SLEEP_MINUTES", value: sleep.summary.totalMinutesAsleep, unit: "min", recordedAt: at, source: "Fitbit" });
  }
  return out;
}

async function pullOura(accessToken: string): Promise<IncomingSample[]> {
  const out: IncomingSample[] = [];
  const start = ymd(daysAgo(LOOKBACK_DAYS));
  const end = ymd(new Date());

  const activity = await getJson<{ data?: Array<{ day: string; steps?: number; active_calories?: number }> }>(
    `https://api.ouraring.com/v2/usercollection/daily_activity?start_date=${start}&end_date=${end}`,
    accessToken,
  );
  for (const d of activity?.data ?? []) {
    const at = atNoon(d.day);
    if (typeof d.steps === "number") out.push({ metric: "STEPS", value: d.steps, unit: "steps", recordedAt: at, source: "Oura" });
    if (typeof d.active_calories === "number") out.push({ metric: "CALORIES", value: d.active_calories, unit: "kcal", recordedAt: at, source: "Oura" });
  }

  const spo2 = await getJson<{ data?: Array<{ day: string; spo2_percentage?: { average?: number } }> }>(
    `https://api.ouraring.com/v2/usercollection/daily_spo2?start_date=${start}&end_date=${end}`,
    accessToken,
  );
  for (const d of spo2?.data ?? []) {
    if (typeof d.spo2_percentage?.average === "number")
      out.push({ metric: "SPO2", value: d.spo2_percentage.average, unit: "%", recordedAt: atNoon(d.day), source: "Oura" });
  }

  const sleep = await getJson<{ data?: Array<{ day: string; total_sleep_duration?: number; lowest_heart_rate?: number }> }>(
    `https://api.ouraring.com/v2/usercollection/sleep?start_date=${start}&end_date=${end}`,
    accessToken,
  );
  for (const d of sleep?.data ?? []) {
    const at = atNoon(d.day);
    if (typeof d.total_sleep_duration === "number")
      out.push({ metric: "SLEEP_MINUTES", value: Math.round(d.total_sleep_duration / 60), unit: "min", recordedAt: at, source: "Oura" });
    if (typeof d.lowest_heart_rate === "number")
      out.push({ metric: "RESTING_HR", value: d.lowest_heart_rate, unit: "bpm", recordedAt: at, source: "Oura" });
  }
  return out;
}

const PULLERS: Partial<Record<WearableProvider, (token: string) => Promise<IncomingSample[]>>> = {
  FITBIT: pullFitbit,
  OURA: pullOura,
};

/** ── orchestration ─────────────────────────────────────────────────────── */

/** Sync one connection: refresh token → pull → ingest. Returns samples stored. */
export async function syncConnection(conn: Conn): Promise<{ provider: WearableProvider; stored: number; error?: string }> {
  const def = PROVIDERS[conn.provider];
  const pull = PULLERS[conn.provider];
  if (!def || def.kind !== "oauth" || !pull) return { provider: conn.provider, stored: 0, error: "no_puller" };
  if (!oauthConfigured(def)) return { provider: conn.provider, stored: 0, error: "not_configured" };

  const accessToken = await refreshIfNeeded(def, conn);
  if (!accessToken) return { provider: conn.provider, stored: 0, error: "no_token" };

  const samples = await pull(accessToken);
  if (samples.length === 0) {
    await prisma.wearableConnection.update({ where: { id: conn.id }, data: { lastSyncAt: new Date() } });
    return { provider: conn.provider, stored: 0 };
  }
  const { stored } = await ingestSamples(conn.patientId, conn.provider, samples);
  return { provider: conn.provider, stored };
}

/** Sync every CONNECTED oauth connection whose provider has a puller. */
export async function syncAllDue(limit = 200) {
  const conns = await prisma.wearableConnection.findMany({
    where: { status: { in: ["CONNECTED", "PENDING"] }, provider: { in: Object.keys(PULLERS) as WearableProvider[] } },
    orderBy: { lastSyncAt: "asc" },
    take: limit,
    select: { id: true, patientId: true, provider: true, accessToken: true, refreshToken: true, expiresAt: true },
  });
  let stored = 0;
  const results: Array<{ provider: WearableProvider; stored: number; error?: string }> = [];
  for (const c of conns) {
    const r = await syncConnection(c);
    results.push(r);
    stored += r.stored;
  }
  return { connections: conns.length, stored, results };
}
