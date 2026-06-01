import { describe, it, expect } from "vitest";
import { buildTwilioForm, asText, type WhatsAppOutbound } from "@/lib/whatsapp/client";
import { resolveTemplateSid } from "@/lib/integration-config";

const textMsg: WhatsAppOutbound = { kind: "text", phone: "+55 (11) 99999-8888", text: "Olá mundo" };
const buttonsMsg: WhatsAppOutbound = {
  kind: "buttons",
  phone: "+5511999998888",
  text: "Confirma?",
  buttons: [{ id: "y", label: "Sim" }, { id: "n", label: "Não" }],
};

describe("buildTwilioForm — sender selection", () => {
  it("prefers MessagingServiceSid over From", () => {
    const form = buildTwilioForm(textMsg, { from: "+15550001111", messagingServiceSid: "MG123" });
    expect(form.get("MessagingServiceSid")).toBe("MG123");
    expect(form.get("From")).toBeNull();
  });

  it("falls back to From and adds the whatsapp: prefix", () => {
    const form = buildTwilioForm(textMsg, { from: "+15550001111" });
    expect(form.get("MessagingServiceSid")).toBeNull();
    expect(form.get("From")).toBe("whatsapp:+15550001111");
  });

  it("keeps an existing whatsapp: prefix on From", () => {
    const form = buildTwilioForm(textMsg, { from: "whatsapp:+15550001111" });
    expect(form.get("From")).toBe("whatsapp:+15550001111");
  });

  it("normalizes To to whatsapp:+<digits>", () => {
    const form = buildTwilioForm(textMsg, { from: "+1" });
    expect(form.get("To")).toBe("whatsapp:+5511999998888");
  });
});

describe("buildTwilioForm — template vs Body", () => {
  it("sends plain Body when no template configured", () => {
    const form = buildTwilioForm(textMsg, { from: "+1" });
    expect(form.get("Body")).toBe("Olá mundo");
    expect(form.get("ContentSid")).toBeNull();
  });

  it("uses the generic contentSid with {{1}} = rendered text", () => {
    const form = buildTwilioForm(textMsg, { from: "+1", contentSid: "HXgeneric" });
    expect(form.get("ContentSid")).toBe("HXgeneric");
    expect(form.get("Body")).toBeNull();
    expect(JSON.parse(form.get("ContentVariables")!)).toEqual({ "1": "Olá mundo" });
  });

  it("prefers a keyed templateSid over the generic contentSid", () => {
    const form = buildTwilioForm(textMsg, { contentSid: "HXgeneric", templateSid: "HXkeyed", messagingServiceSid: "MG1" });
    expect(form.get("ContentSid")).toBe("HXkeyed");
  });

  it("flattens buttons into the {{1}} variable", () => {
    const form = buildTwilioForm(buttonsMsg, { messagingServiceSid: "MG1", templateSid: "HXk" });
    expect(JSON.parse(form.get("ContentVariables")!)).toEqual({ "1": asText(buttonsMsg) });
    expect(asText(buttonsMsg)).toContain("• Sim");
  });

  it("honors explicit ContentVariables on the message template hint", () => {
    const msg: WhatsAppOutbound = { kind: "text", phone: "+5511999998888", text: "code", template: { key: "otp", variables: { "1": "123456" } } };
    const form = buildTwilioForm(msg, { messagingServiceSid: "MG1", templateSid: "HXotp" });
    expect(JSON.parse(form.get("ContentVariables")!)).toEqual({ "1": "123456" });
  });
});

describe("resolveTemplateSid", () => {
  it("returns the per-key SID when present", () => {
    expect(resolveTemplateSid({ twilioTemplates: { otp: "HXotp" }, twilioContentSid: "HXgen" }, "otp")).toBe("HXotp");
  });
  it("falls back to the generic SID", () => {
    expect(resolveTemplateSid({ twilioTemplates: { reminder: "HXr" }, twilioContentSid: "HXgen" }, "otp")).toBe("HXgen");
  });
  it("returns null when nothing configured", () => {
    expect(resolveTemplateSid({}, "otp")).toBeNull();
  });
});
