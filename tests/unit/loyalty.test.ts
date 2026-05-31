import { describe, it, expect } from "vitest";
import { tierFor } from "@/lib/loyalty/service";
import { signPatientToken, verifyPatientToken } from "@/lib/patient-token";

describe("loyalty tiers", () => {
  it("maps lifetime points to tiers", () => {
    expect(tierFor(0)).toBe("BRONZE");
    expect(tierFor(499)).toBe("BRONZE");
    expect(tierFor(500)).toBe("SILVER");
    expect(tierFor(1999)).toBe("SILVER");
    expect(tierFor(2000)).toBe("GOLD");
    expect(tierFor(5000)).toBe("PLATINUM");
    expect(tierFor(999999)).toBe("PLATINUM");
  });
});

describe("patient hub token", () => {
  it("round-trips a valid token", () => {
    const t = signPatientToken("patient-123");
    expect(verifyPatientToken(t)).toBe("patient-123");
  });
  it("rejects tampered tokens", () => {
    const t = signPatientToken("patient-123");
    expect(verifyPatientToken(t + "x")).toBeNull();
    expect(verifyPatientToken("garbage")).toBeNull();
    expect(verifyPatientToken("")).toBeNull();
    expect(verifyPatientToken(null)).toBeNull();
  });
  it("rejects expired tokens", () => {
    const t = signPatientToken("patient-123", -1); // already expired
    expect(verifyPatientToken(t)).toBeNull();
  });
});
