import { describe, it, expect } from "vitest";
import { haversineKm } from "@/lib/compare";

describe("haversineKm", () => {
  it("is ~0 for the same point", () => {
    expect(haversineKm(-23.55, -46.63, -23.55, -46.63)).toBeLessThan(0.001);
  });
  it("approximates São Paulo → Rio (~360 km)", () => {
    const d = haversineKm(-23.55, -46.63, -22.91, -43.17);
    expect(d).toBeGreaterThan(330);
    expect(d).toBeLessThan(380);
  });
  it("is symmetric", () => {
    const a = haversineKm(-23.55, -46.63, -19.92, -43.94);
    const b = haversineKm(-19.92, -43.94, -23.55, -46.63);
    expect(Math.abs(a - b)).toBeLessThan(0.001);
  });
});
