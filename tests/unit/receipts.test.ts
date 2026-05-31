import { describe, it, expect } from "vitest";
import { extractAccessKey } from "@/lib/receipts";

const KEY = "35200714200166000187650010000000071123456789"; // 44 digits

describe("NF-e access key extraction", () => {
  it("pulls the 44-digit key from a SEFAZ QR URL", () => {
    expect(extractAccessKey(`https://www.fazenda.sp.gov.br/nfce/qrcode?p=${KEY}|2|1|...`)).toBe(KEY);
  });
  it("accepts a bare 44-digit key", () => {
    expect(extractAccessKey(KEY)).toBe(KEY);
  });
  it("strips formatting and takes the key", () => {
    expect(extractAccessKey(KEY.replace(/(.{4})/g, "$1 "))).toBe(KEY);
  });
  it("rejects payloads without a 44-digit key", () => {
    expect(extractAccessKey("12345")).toBeNull();
    expect(extractAccessKey("")).toBeNull();
  });
});
