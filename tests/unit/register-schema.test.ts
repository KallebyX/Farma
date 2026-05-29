import { describe, it, expect } from "vitest";
import { registerSchema } from "@/lib/auth/register";

const valid = {
  pharmacyName: "Farmácia Central Ltda",
  fantasia: "Farmácia Central",
  cnpj: "12.345.678/0001-90",
  name: "Ana Souza",
  email: "ANA@Example.com",
  password: "segredo123",
  consent: true,
};

describe("registerSchema", () => {
  it("accepts a valid signup and normalizes email + cnpj", () => {
    const r = registerSchema.safeParse(valid);
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.email).toBe("ana@example.com");
      expect(r.data.cnpj).toBe("12345678000190");
    }
  });

  it("requires consent to be true", () => {
    expect(registerSchema.safeParse({ ...valid, consent: false }).success).toBe(false);
  });

  it("rejects CNPJ without 14 digits", () => {
    expect(registerSchema.safeParse({ ...valid, cnpj: "123" }).success).toBe(false);
  });

  it("rejects short passwords", () => {
    expect(registerSchema.safeParse({ ...valid, password: "1234567" }).success).toBe(false);
  });

  it("rejects invalid email", () => {
    expect(registerSchema.safeParse({ ...valid, email: "nope" }).success).toBe(false);
  });

  it("allows empty optional fantasia", () => {
    expect(registerSchema.safeParse({ ...valid, fantasia: "" }).success).toBe(true);
  });
});
