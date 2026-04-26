import { Prescription } from "@prisma/client";

export type PosologyInput = Pick<
  Prescription,
  "intervalHours" | "fixedTimes" | "startDate" | "endDate" | "durationDays"
>;

export type ReminderTime = {
  scheduledFor: Date;
};

const HM_RE = /^([01]\d|2[0-3]):([0-5]\d)$/;

export function isValidHHmm(s: string): boolean {
  return HM_RE.test(s);
}

export function parseHHmm(s: string): { hour: number; minute: number } {
  const m = HM_RE.exec(s);
  if (!m) throw new Error(`Hora inválida: ${s}`);
  return { hour: Number(m[1]), minute: Number(m[2]) };
}

/**
 * Computes all reminder occurrences in [from, to) for a prescription.
 * Two posology modes:
 *   1) fixedTimes: array of "HH:mm" — emits a reminder at each time on each day
 *      between max(startDate, from) and min(endDate, to).
 *   2) intervalHours: starting at startDate, emits every N hours up to endDate.
 *
 * If durationDays is set and endDate isn't, endDate is computed.
 * Continuous treatments (no durationDays, no endDate) emit until `to`.
 */
export function computeReminderTimes(
  posology: PosologyInput,
  from: Date,
  to: Date,
): ReminderTime[] {
  if (to <= from) return [];

  const start = posology.startDate;
  const end = posology.endDate ?? computeEndDate(start, posology.durationDays) ?? to;

  const windowStart = start > from ? start : from;
  const windowEnd = end < to ? end : to;
  if (windowEnd <= windowStart) return [];

  if (posology.fixedTimes && posology.fixedTimes.length > 0) {
    return computeFixedTimes(posology.fixedTimes, windowStart, windowEnd);
  }
  if (posology.intervalHours && posology.intervalHours > 0) {
    return computeInterval(start, posology.intervalHours, windowStart, windowEnd);
  }
  return [];
}

function computeEndDate(start: Date, durationDays: number | null | undefined): Date | null {
  if (!durationDays || durationDays <= 0) return null;
  const d = new Date(start);
  d.setDate(d.getDate() + durationDays);
  return d;
}

function computeFixedTimes(times: string[], from: Date, to: Date): ReminderTime[] {
  const validTimes = [...new Set(times.filter(isValidHHmm))].sort();
  if (validTimes.length === 0) return [];

  const out: ReminderTime[] = [];
  const cursor = new Date(from);
  cursor.setHours(0, 0, 0, 0);

  while (cursor < to) {
    for (const t of validTimes) {
      const { hour, minute } = parseHHmm(t);
      const at = new Date(cursor);
      at.setHours(hour, minute, 0, 0);
      if (at >= from && at < to) out.push({ scheduledFor: at });
    }
    cursor.setDate(cursor.getDate() + 1);
  }
  return out;
}

function computeInterval(
  startDate: Date,
  intervalHours: number,
  from: Date,
  to: Date,
): ReminderTime[] {
  const out: ReminderTime[] = [];
  // First emission >= from, aligned to startDate + k*interval
  const stepMs = intervalHours * 60 * 60 * 1000;
  const elapsed = from.getTime() - startDate.getTime();
  const k0 = Math.max(0, Math.ceil(elapsed / stepMs));

  for (let k = k0; ; k++) {
    const at = new Date(startDate.getTime() + k * stepMs);
    if (at >= to) break;
    if (at >= from) out.push({ scheduledFor: at });
  }
  return out;
}

/**
 * Estimate when stock will run out given quantityDispensed and posology.
 * Returns null when not computable (e.g. continuous + no quantity).
 */
export function estimateStockEndDate(
  posology: PosologyInput & { quantityDispensed?: number | null },
): Date | null {
  const qty = posology.quantityDispensed;
  if (!qty || qty <= 0) return null;

  let dosesPerDay = 0;
  if (posology.fixedTimes && posology.fixedTimes.length > 0) {
    dosesPerDay = posology.fixedTimes.filter(isValidHHmm).length;
  } else if (posology.intervalHours && posology.intervalHours > 0) {
    dosesPerDay = 24 / posology.intervalHours;
  }
  if (dosesPerDay <= 0) return null;

  const days = qty / dosesPerDay;
  const end = new Date(posology.startDate);
  end.setDate(end.getDate() + Math.floor(days));
  return end;
}

/**
 * Human-readable summary of a posology, e.g. "1 cp às 08:00 e 20:00 por 30 dias".
 */
export function summarizePosology(
  posology: PosologyInput & { doseAmount: string; instructions?: string | null },
): string {
  const parts: string[] = [posology.doseAmount];

  if (posology.fixedTimes && posology.fixedTimes.length > 0) {
    const sorted = [...posology.fixedTimes].filter(isValidHHmm).sort();
    if (sorted.length === 1) parts.push(`às ${sorted[0]}`);
    else parts.push(`às ${sorted.slice(0, -1).join(", ")} e ${sorted[sorted.length - 1]}`);
  } else if (posology.intervalHours) {
    parts.push(`a cada ${posology.intervalHours}h`);
  }

  if (posology.durationDays) parts.push(`por ${posology.durationDays} dias`);
  else if (!posology.endDate) parts.push("(uso contínuo)");

  if (posology.instructions) parts.push(`— ${posology.instructions}`);

  return parts.join(" ");
}
