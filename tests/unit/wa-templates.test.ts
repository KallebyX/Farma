import { describe, it, expect } from "vitest";
import { consentRequest, reminderMessage, returnReminder } from "@/lib/whatsapp/templates";
import { TEMPLATE_CATALOG, TEMPLATE_KEYS } from "@/lib/whatsapp/content-templates";

describe("dispatch builders carry the right template key", () => {
  it("consentRequest → welcome", () => {
    const m = consentRequest({ phone: "+5511999998888", patientName: "Ana Maria", pharmacyName: "Farmácia X" });
    expect(m.template?.key).toBe("welcome");
  });

  it("reminderMessage → reminder", () => {
    const m = reminderMessage({
      phone: "+5511999998888", patientName: "Ana", medicationLabel: "Losartana 50mg",
      doseAmount: "1 comp", reminderId: "r1", scheduledFor: new Date(),
    });
    expect(m.template?.key).toBe("reminder");
  });

  it("returnReminder → return", () => {
    const m = returnReminder({ phone: "+5511999998888", patientName: "Ana", pharmacyName: "X", medicationLabel: "Losartana", expectationId: "e1" });
    expect(m.template?.key).toBe("return");
  });
});

describe("TEMPLATE_CATALOG", () => {
  it("has a spec for every template key", () => {
    for (const key of TEMPLATE_KEYS) {
      expect(TEMPLATE_CATALOG[key].key).toBe(key);
      expect(TEMPLATE_CATALOG[key].sampleBody).toContain("{{1}}");
      expect(TEMPLATE_CATALOG[key].name).toMatch(/^farma_/);
    }
  });

  it("uses AUTHENTICATION category for the OTP template", () => {
    expect(TEMPLATE_CATALOG.otp.category).toBe("AUTHENTICATION");
  });
});
