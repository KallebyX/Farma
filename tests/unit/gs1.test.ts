import { describe, it, expect } from "vitest";
import { parseGs1 } from "@/lib/gs1";

describe("parseGs1 (caixa de remédio)", () => {
  it("extracts lote + validade from a GS1 string with FNC1", () => {
    const raw = "0107891234567890" + "17260131" + "10ABC123" + "\x1d" + "21SER999";
    const r = parseGs1(raw);
    expect(r.validade).toBe("2026-01-31");
    expect(r.lote).toBe("ABC123");
  });
  it("handles a symbology prefix", () => {
    const r = parseGs1("]d2" + "17251200" + "10LOTE7");
    expect(r.validade).toBe("2025-12-01"); // day 00 → 01
    expect(r.lote).toBe("LOTE7");
  });
  it("returns empty for non-GS1 input", () => {
    expect(parseGs1("https://example.com")).toEqual({});
    expect(parseGs1("")).toEqual({});
  });
});
