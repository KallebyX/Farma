import type { IncomingSample } from "./service";

/**
 * Parser for the "Health Auto Export" iOS app JSON format. This is the simplest
 * no-code path to get Apple Watch / Apple Health data into Farma: the user sets
 * up a REST automation in that app pointing at /api/wearables/ingest.
 *
 * Shape (abridged):
 * {
 *   "data": {
 *     "metrics": [
 *       { "name": "heart_rate", "units": "count/min",
 *         "data": [ { "date": "2024-01-15 08:00:00 +0000", "Avg": 72, "Min": 60, "Max": 110, "source": "Apple Watch" } ] },
 *       { "name": "step_count", "units": "count",
 *         "data": [ { "date": "...", "qty": 8421, "source": "iPhone" } ] },
 *       { "name": "blood_pressure", "units": "mmHg",
 *         "data": [ { "date": "...", "systolic": 120, "diastolic": 80 } ] }
 *     ]
 *   }
 * }
 */

type HaeMetric = { name?: string; units?: string; data?: HaePoint[] };
type HaePoint = {
  date?: string;
  qty?: number;
  Avg?: number;
  Min?: number;
  Max?: number;
  systolic?: number;
  diastolic?: number;
  asleep?: number; // hours (sleep_analysis)
  value?: number;
  source?: string;
};

export type HaePayload = { data?: { metrics?: HaeMetric[] } };

/** HAE metric name → our HealthMetric enum value. */
const METRIC_MAP: Record<string, string> = {
  heart_rate: "HEART_RATE",
  resting_heart_rate: "RESTING_HR",
  step_count: "STEPS",
  steps: "STEPS",
  blood_oxygen_saturation: "SPO2",
  oxygen_saturation: "SPO2",
  heart_rate_variability: "HRV",
  active_energy: "CALORIES",
  apple_exercise_time: "CALORIES",
  weight_body_mass: "WEIGHT",
  body_mass: "WEIGHT",
  blood_glucose: "GLUCOSE",
  body_temperature: "TEMPERATURE",
  // blood_pressure & sleep_analysis are handled specially below
};

export function isHaePayload(body: unknown): body is HaePayload {
  return !!body && typeof body === "object" && Array.isArray((body as HaePayload)?.data?.metrics);
}

/** Normalize HAE's "2024-01-15 08:00:00 +0000" to an ISO string, or null. */
function toIso(d: string | undefined): string | null {
  if (!d) return null;
  let ms = Date.parse(d);
  if (isNaN(ms)) {
    const norm = d.replace(" +", "+").replace(" -", "-").replace(" ", "T").replace(/([+-]\d{2})(\d{2})$/, "$1:$2");
    ms = Date.parse(norm);
  }
  return isNaN(ms) ? null : new Date(ms).toISOString();
}

/** Convert a Health Auto Export payload into normalized samples. */
export function parseHealthAutoExport(body: HaePayload): IncomingSample[] {
  const out: IncomingSample[] = [];
  for (const m of body.data?.metrics ?? []) {
    const name = (m.name ?? "").toLowerCase();
    const unit = m.units ?? "";
    for (const p of m.data ?? []) {
      const recordedAt = toIso(p.date);
      if (!recordedAt) continue;
      const src = p.source;

      if (name === "blood_pressure") {
        if (typeof p.systolic === "number")
          out.push({ metric: "BLOOD_PRESSURE_SYS", value: p.systolic, unit: "mmHg", recordedAt, source: src, externalId: `hae:bp_sys:${p.date}` });
        if (typeof p.diastolic === "number")
          out.push({ metric: "BLOOD_PRESSURE_DIA", value: p.diastolic, unit: "mmHg", recordedAt, source: src, externalId: `hae:bp_dia:${p.date}` });
        continue;
      }

      if (name === "sleep_analysis") {
        const hours = typeof p.asleep === "number" ? p.asleep : typeof p.value === "number" ? p.value : undefined;
        if (typeof hours === "number")
          out.push({ metric: "SLEEP_MINUTES", value: Math.round(hours * 60), unit: "min", recordedAt, source: src, externalId: `hae:sleep:${p.date}` });
        continue;
      }

      const metric = METRIC_MAP[name];
      if (!metric) continue;
      let value = typeof p.qty === "number" ? p.qty : typeof p.Avg === "number" ? p.Avg : p.value;
      if (typeof value !== "number") continue;
      // Apple reports SpO2 as a 0–1 fraction; normalize to a percentage.
      if (metric === "SPO2" && value <= 1) value = value * 100;
      out.push({ metric, value, unit, recordedAt, source: src, externalId: `hae:${name}:${p.date}` });
    }
  }
  return out;
}
