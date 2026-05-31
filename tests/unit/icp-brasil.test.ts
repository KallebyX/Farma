import { describe, it, expect } from "vitest";
import { detectSignature } from "@/lib/icp-brasil";

const bytes = (s: string) => new Uint8Array(Buffer.from(s, "latin1"));

describe("ICP-Brasil signature detection", () => {
  it("flags a PAdES-signed PDF (ByteRange present)", () => {
    const pdf = bytes("%PDF-1.7\n... /Type /Sig /ByteRange [0 840 960 1200] adbe.pkcs7.detached ...\n%%EOF");
    const r = detectSignature(pdf, "application/pdf", "receita.pdf");
    expect(r.signed).toBe(true);
  });

  it("treats a plain PDF as unsigned (receita comum)", () => {
    const r = detectSignature(bytes("%PDF-1.4\nplain content no signature\n%%EOF"), "application/pdf", "receita.pdf");
    expect(r.signed).toBe(false);
  });

  it("detects a detached .p7s (CAdES)", () => {
    const r = detectSignature(bytes("\x30\x82binary-cms"), "application/pkcs7-signature", "receita.pdf.p7s");
    expect(r.signed).toBe(true);
  });

  it("non-signed image is unsigned", () => {
    expect(detectSignature(bytes("\xff\xd8\xff"), "image/jpeg", "receita.jpg").signed).toBe(false);
  });
});
