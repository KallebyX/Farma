import { describe, it, expect } from "vitest";
import { generateReferralCode } from "@/lib/referral";

describe("referral code", () => {
  it("is short, uppercase and URL-safe", () => {
    for (let i = 0; i < 50; i++) {
      expect(generateReferralCode()).toMatch(/^[A-Z0-9]{4,7}$/);
    }
  });
  it("is effectively unique", () => {
    const set = new Set(Array.from({ length: 300 }, () => generateReferralCode()));
    expect(set.size).toBeGreaterThan(290);
  });
});
