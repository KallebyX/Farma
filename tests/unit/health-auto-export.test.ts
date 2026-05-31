import { describe, it, expect } from "vitest";
import { isHaePayload, parseHealthAutoExport } from "@/lib/wearables/health-auto-export";

describe("Health Auto Export detection", () => {
  it("recognizes the HAE shape", () => {
    expect(isHaePayload({ data: { metrics: [] } })).toBe(true);
  });
  it("rejects the native samples shape and junk", () => {
    expect(isHaePayload({ samples: [] })).toBe(false);
    expect(isHaePayload(null)).toBe(false);
    expect(isHaePayload("nope")).toBe(false);
    expect(isHaePayload({ data: {} })).toBe(false);
  });
});

describe("parseHealthAutoExport", () => {
  it("maps qty + Avg metrics with units", () => {
    const out = parseHealthAutoExport({
      data: {
        metrics: [
          { name: "step_count", units: "count", data: [{ date: "2026-05-30 08:00:00 +0000", qty: 8421, source: "iPhone" }] },
          { name: "heart_rate", units: "count/min", data: [{ date: "2026-05-30 08:00:00 +0000", Avg: 72, Min: 60, Max: 110, source: "Apple Watch" }] },
        ],
      },
    });
    const steps = out.find((s) => s.metric === "STEPS");
    const hr = out.find((s) => s.metric === "HEART_RATE");
    expect(steps).toMatchObject({ value: 8421, unit: "count", source: "iPhone" });
    expect(hr).toMatchObject({ value: 72, source: "Apple Watch" });
    expect(steps?.recordedAt).toBe("2026-05-30T08:00:00.000Z");
  });

  it("normalizes SpO2 fractions to a percentage", () => {
    const [s] = parseHealthAutoExport({
      data: { metrics: [{ name: "blood_oxygen_saturation", units: "%", data: [{ date: "2026-05-30 08:00:00 +0000", qty: 0.97 }] }] },
    });
    expect(s.metric).toBe("SPO2");
    expect(s.value).toBeCloseTo(97);
  });

  it("splits blood_pressure into systolic + diastolic", () => {
    const out = parseHealthAutoExport({
      data: { metrics: [{ name: "blood_pressure", units: "mmHg", data: [{ date: "2026-05-30 08:00:00 +0000", systolic: 120, diastolic: 80 }] }] },
    });
    expect(out.map((s) => s.metric).sort()).toEqual(["BLOOD_PRESSURE_DIA", "BLOOD_PRESSURE_SYS"]);
    expect(out.find((s) => s.metric === "BLOOD_PRESSURE_SYS")?.value).toBe(120);
  });

  it("converts sleep_analysis hours to minutes", () => {
    const [s] = parseHealthAutoExport({
      data: { metrics: [{ name: "sleep_analysis", units: "hr", data: [{ date: "2026-05-30 08:00:00 +0000", asleep: 7.5 }] }] },
    });
    expect(s.metric).toBe("SLEEP_MINUTES");
    expect(s.value).toBe(450);
  });

  it("skips unknown metrics and undated points", () => {
    const out = parseHealthAutoExport({
      data: {
        metrics: [
          { name: "mindful_minutes", units: "min", data: [{ date: "2026-05-30 08:00:00 +0000", qty: 10 }] },
          { name: "step_count", units: "count", data: [{ qty: 100 }] }, // no date
        ],
      },
    });
    expect(out).toHaveLength(0);
  });
});
