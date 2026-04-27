import { describe, it, expect } from "vitest";
import { parseInbound } from "@/lib/whatsapp/router";

describe("parseInbound — slash commands", () => {
  it("recognizes all slash commands", () => {
    const cmds = ["meusremedios", "pausar", "voltar", "reacao", "privacidade", "sair", "ajuda"];
    for (const c of cmds) {
      const out = parseInbound({ text: `/${c}` });
      expect(out.kind).toBe("command");
      if (out.kind === "command") expect(out.command).toBe(c);
    }
  });

  it("is case-insensitive", () => {
    expect(parseInbound({ text: "/MEUSREMEDIOS" }).kind).toBe("command");
  });

  it("treats unknown slash text as free_text", () => {
    const out = parseInbound({ text: "/lalala" });
    expect(out.kind).toBe("free_text");
  });
});

describe("parseInbound — natural-language consent", () => {
  it("parses 'sim' as consent yes", () => {
    expect(parseInbound({ text: "sim" })).toEqual({ kind: "consent", granted: true });
    expect(parseInbound({ text: "Aceito" })).toEqual({ kind: "consent", granted: true });
  });
  it("parses 'não' as consent no", () => {
    expect(parseInbound({ text: "Não" })).toEqual({ kind: "consent", granted: false });
    expect(parseInbound({ text: "recuso" })).toEqual({ kind: "consent", granted: false });
  });
});

describe("parseInbound — buttons", () => {
  it("parses consent buttons", () => {
    expect(parseInbound({ buttonId: "consent_yes" })).toEqual({ kind: "consent", granted: true });
    expect(parseInbound({ buttonId: "consent_no" })).toEqual({ kind: "consent", granted: false });
  });

  it("parses reminder action buttons", () => {
    const out = parseInbound({ buttonId: "r:abc-123:taken" });
    expect(out.kind).toBe("reminder_response");
    if (out.kind === "reminder_response") {
      expect(out.reminderId).toBe("abc-123");
      expect(out.action).toBe("taken");
    }
  });

  it("parses reminder defer button", () => {
    const out = parseInbound({ buttonId: "r:xyz:defer" });
    if (out.kind === "reminder_response") expect(out.action).toBe("defer");
  });

  it("parses reminder reason buttons with a reason segment", () => {
    const out = parseInbound({ buttonId: "r:abc:reason:no-stock" });
    if (out.kind === "reminder_response") {
      expect(out.action).toBe("reason");
      expect(out.reason).toBe("no-stock");
    }
  });

  it("parses RAM severity buttons", () => {
    expect(parseInbound({ buttonId: "ram:severity:mild" })).toEqual({ kind: "ram_severity", severity: "mild" });
    expect(parseInbound({ buttonId: "ram:severity:moderate" })).toEqual({ kind: "ram_severity", severity: "moderate" });
    expect(parseInbound({ buttonId: "ram:severity:severe" })).toEqual({ kind: "ram_severity", severity: "severe" });
  });

  it("returns unknown for unrecognized button ids", () => {
    expect(parseInbound({ buttonId: "weird-id" })).toEqual({ kind: "unknown" });
    expect(parseInbound({ buttonId: "r::" })).toEqual({ kind: "unknown" });
  });
});

describe("parseInbound — free text and edge cases", () => {
  it("returns free_text for arbitrary text", () => {
    const out = parseInbound({ text: "estou com dor de cabeça" });
    expect(out.kind).toBe("free_text");
  });

  it("returns unknown for empty input", () => {
    expect(parseInbound({})).toEqual({ kind: "unknown" });
    expect(parseInbound({ text: "" })).toEqual({ kind: "unknown" });
  });

  it("buttonId takes precedence over text when both present", () => {
    const out = parseInbound({ text: "qualquer coisa", buttonId: "consent_yes" });
    expect(out.kind).toBe("consent");
  });
});
