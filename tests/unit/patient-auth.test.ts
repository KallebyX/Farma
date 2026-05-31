import { describe, it, expect } from "vitest";
import { isValidPhone } from "@/lib/patient-auth";

describe("patient-auth phone validation", () => {
  it("accepts E.164 numbers", () => {
    expect(isValidPhone("+5511999998888")).toBe(true);
    expect(isValidPhone("+14155552671")).toBe(true);
  });
  it("rejects non-E.164 input", () => {
    expect(isValidPhone("11999998888")).toBe(false); // missing +
    expect(isValidPhone("+55 11 99999-8888")).toBe(false); // spaces/dashes
    expect(isValidPhone("+1")).toBe(false); // too short
    expect(isValidPhone("")).toBe(false);
    expect(isValidPhone("+abcdefghij")).toBe(false);
  });
});
