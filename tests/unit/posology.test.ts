import { describe, it, expect } from "vitest";
import {
  computeReminderTimes,
  estimateStockEndDate,
  isValidHHmm,
  parseHHmm,
  summarizePosology,
} from "@/lib/prescriptions/posology";

const baseStart = new Date("2026-04-26T00:00:00Z");

describe("isValidHHmm", () => {
  it("accepts valid HH:mm", () => {
    expect(isValidHHmm("00:00")).toBe(true);
    expect(isValidHHmm("08:30")).toBe(true);
    expect(isValidHHmm("23:59")).toBe(true);
  });
  it("rejects invalid times", () => {
    expect(isValidHHmm("8:30")).toBe(false);
    expect(isValidHHmm("24:00")).toBe(false);
    expect(isValidHHmm("12:60")).toBe(false);
    expect(isValidHHmm("abc")).toBe(false);
  });
});

describe("parseHHmm", () => {
  it("parses HH:mm to numbers", () => {
    expect(parseHHmm("08:30")).toEqual({ hour: 8, minute: 30 });
    expect(parseHHmm("00:00")).toEqual({ hour: 0, minute: 0 });
  });
  it("throws on invalid input", () => {
    expect(() => parseHHmm("abc")).toThrow();
  });
});

describe("computeReminderTimes — fixed times mode", () => {
  it("emits one reminder per fixed time per day in window", () => {
    const from = new Date("2026-04-27T00:00:00Z");
    const to = new Date("2026-04-30T00:00:00Z");
    const out = computeReminderTimes(
      {
        intervalHours: null,
        fixedTimes: ["08:00", "20:00"],
        startDate: baseStart,
        endDate: null,
        durationDays: null,
      },
      from,
      to,
    );
    // 3 days × 2 times = 6 occurrences
    expect(out).toHaveLength(6);
  });

  it("respects start/end window bounds", () => {
    const from = new Date("2026-04-27T10:00:00Z");
    const to = new Date("2026-04-27T22:00:00Z");
    const out = computeReminderTimes(
      {
        intervalHours: null,
        fixedTimes: ["08:00", "12:00", "20:00"],
        startDate: baseStart,
        endDate: null,
        durationDays: null,
      },
      from,
      to,
    );
    // Only 12:00 and 20:00 fall inside the window
    expect(out).toHaveLength(2);
  });

  it("ignores invalid HH:mm entries", () => {
    const from = new Date("2026-04-27T00:00:00Z");
    const to = new Date("2026-04-28T00:00:00Z");
    const out = computeReminderTimes(
      {
        intervalHours: null,
        fixedTimes: ["08:00", "bad", "25:00"],
        startDate: baseStart,
        endDate: null,
        durationDays: null,
      },
      from,
      to,
    );
    expect(out).toHaveLength(1);
  });
});

describe("computeReminderTimes — interval mode", () => {
  it("emits a reminder every N hours from startDate", () => {
    const from = new Date("2026-04-26T00:00:00Z");
    const to = new Date("2026-04-27T00:00:00Z"); // 24h window
    const out = computeReminderTimes(
      {
        intervalHours: 8,
        fixedTimes: [],
        startDate: baseStart,
        endDate: null,
        durationDays: null,
      },
      from,
      to,
    );
    // Emissions at 0h, 8h, 16h
    expect(out).toHaveLength(3);
    expect(out[0].scheduledFor.toISOString()).toBe("2026-04-26T00:00:00.000Z");
    expect(out[2].scheduledFor.toISOString()).toBe("2026-04-26T16:00:00.000Z");
  });

  it("aligns first emission >= window start when querying mid-window", () => {
    const from = new Date("2026-04-26T05:00:00Z");
    const to = new Date("2026-04-26T13:00:00Z");
    const out = computeReminderTimes(
      {
        intervalHours: 4,
        fixedTimes: [],
        startDate: baseStart,
        endDate: null,
        durationDays: null,
      },
      from,
      to,
    );
    // Aligned schedule: 0, 4, 8, 12. Window contains 8 and 12.
    expect(out).toHaveLength(2);
    expect(out[0].scheduledFor.toISOString()).toBe("2026-04-26T08:00:00.000Z");
    expect(out[1].scheduledFor.toISOString()).toBe("2026-04-26T12:00:00.000Z");
  });
});

describe("computeReminderTimes — bounds and edge cases", () => {
  it("returns empty when posology has neither interval nor fixed times", () => {
    const out = computeReminderTimes(
      {
        intervalHours: null,
        fixedTimes: [],
        startDate: baseStart,
        endDate: null,
        durationDays: null,
      },
      new Date("2026-04-27T00:00:00Z"),
      new Date("2026-04-28T00:00:00Z"),
    );
    expect(out).toEqual([]);
  });

  it("returns empty when window is inverted", () => {
    const to = new Date("2026-04-26T00:00:00Z");
    const from = new Date("2026-04-27T00:00:00Z");
    const out = computeReminderTimes(
      { intervalHours: 8, fixedTimes: [], startDate: baseStart, endDate: null, durationDays: null },
      from,
      to,
    );
    expect(out).toEqual([]);
  });

  it("respects durationDays as endDate when not given explicit endDate", () => {
    const out = computeReminderTimes(
      {
        intervalHours: 24,
        fixedTimes: [],
        startDate: baseStart,
        endDate: null,
        durationDays: 5,
      },
      baseStart,
      new Date("2026-05-10T00:00:00Z"),
    );
    expect(out.length).toBeLessThanOrEqual(5);
  });
});

describe("estimateStockEndDate", () => {
  it("computes days based on quantity and doses-per-day (interval mode)", () => {
    const end = estimateStockEndDate({
      intervalHours: 12,
      fixedTimes: [],
      startDate: baseStart,
      endDate: null,
      durationDays: null,
      quantityDispensed: 30, // 2 doses/day → 15 days
    });
    expect(end).not.toBeNull();
    if (end) {
      const days = Math.round((end.getTime() - baseStart.getTime()) / (1000 * 60 * 60 * 24));
      expect(days).toBe(15);
    }
  });

  it("returns null when no quantity given", () => {
    expect(
      estimateStockEndDate({
        intervalHours: 24,
        fixedTimes: [],
        startDate: baseStart,
        endDate: null,
        durationDays: null,
        quantityDispensed: null,
      }),
    ).toBeNull();
  });
});

describe("summarizePosology", () => {
  it("describes fixed-times schedule", () => {
    const s = summarizePosology({
      intervalHours: null,
      fixedTimes: ["08:00", "20:00"],
      startDate: baseStart,
      endDate: null,
      durationDays: 30,
      doseAmount: "1 cp",
    });
    expect(s).toContain("08:00");
    expect(s).toContain("20:00");
    expect(s).toContain("30 dias");
  });

  it("describes interval schedule with continuous treatment", () => {
    const s = summarizePosology({
      intervalHours: 8,
      fixedTimes: [],
      startDate: baseStart,
      endDate: null,
      durationDays: null,
      doseAmount: "10 gotas",
    });
    expect(s).toContain("8h");
    expect(s).toContain("contínuo");
  });

  it("appends instructions when present", () => {
    const s = summarizePosology({
      intervalHours: 12,
      fixedTimes: [],
      startDate: baseStart,
      endDate: null,
      durationDays: 7,
      doseAmount: "1 cp",
      instructions: "em jejum",
    });
    expect(s).toContain("em jejum");
  });
});
