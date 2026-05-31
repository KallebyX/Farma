import { describe, it, expect } from "vitest";
import { PROVIDERS, oauthConfigured, listProviders } from "@/lib/wearables/providers";
import { isValidProvider } from "@/lib/wearables/service";
import { signState, verifyState } from "@/lib/wearables/oauth";

describe("wearable providers", () => {
  it("classifies Apple/Samsung as ingest (no web API)", () => {
    expect(PROVIDERS.APPLE_HEALTH.kind).toBe("ingest");
    expect(PROVIDERS.SAMSUNG_HEALTH.kind).toBe("ingest");
  });
  it("classifies Fitbit/Oura/Withings/Google as oauth", () => {
    expect(PROVIDERS.FITBIT.kind).toBe("oauth");
    expect(PROVIDERS.OURA.kind).toBe("oauth");
    expect(PROVIDERS.WITHINGS.kind).toBe("oauth");
    expect(PROVIDERS.GOOGLE_FIT.kind).toBe("oauth");
  });
  it("oauthConfigured is false without env credentials", () => {
    expect(oauthConfigured(PROVIDERS.FITBIT)).toBe(false);
  });
  it("validates provider slugs", () => {
    expect(isValidProvider("APPLE_HEALTH")).toBe(true);
    expect(isValidProvider("NOPE")).toBe(false);
  });
  it("lists all providers", () => {
    expect(listProviders().length).toBeGreaterThanOrEqual(8);
  });
});

describe("wearable oauth state", () => {
  it("round-trips signed state", () => {
    const s = signState("patient-1", "FITBIT");
    expect(verifyState(s)).toEqual({ patientId: "patient-1", provider: "FITBIT" });
  });
  it("rejects tampered state", () => {
    expect(verifyState(signState("p", "FITBIT") + "x")).toBeNull();
    expect(verifyState("nope")).toBeNull();
  });
});
