import { describe, it, expect } from "vitest";
import {
  createPatientSchema,
  createPrescriptionSchema,
} from "@/lib/patients/schema";

describe("createPatientSchema", () => {
  it("requires name and phone", () => {
    expect(createPatientSchema.safeParse({}).success).toBe(false);
    expect(createPatientSchema.safeParse({ name: "M", phone: "+5511999999999" }).success).toBe(false);
    expect(
      createPatientSchema.safeParse({ name: "Maria Silva", phone: "+5511999999999" }).success,
    ).toBe(true);
  });

  it("rejects non-E.164 phone", () => {
    const r = createPatientSchema.safeParse({ name: "Maria", phone: "11999999999" });
    expect(r.success).toBe(false);
  });

  it("rejects malformed CPF", () => {
    const r = createPatientSchema.safeParse({
      name: "Maria",
      phone: "+5511999999999",
      cpf: "123",
    });
    expect(r.success).toBe(false);
  });

  it("accepts empty CPF and birthDate", () => {
    const r = createPatientSchema.safeParse({
      name: "Maria",
      phone: "+5511999999999",
      cpf: "",
      birthDate: "",
    });
    expect(r.success).toBe(true);
  });
});

describe("createPrescriptionSchema", () => {
  const base = {
    patientId: "00000000-0000-0000-0000-000000000001",
    medicationId: "00000000-0000-0000-0000-000000000002",
    doseAmount: "1 comprimido",
  };

  it("requires either intervalHours or fixedTimes", () => {
    const r = createPrescriptionSchema.safeParse(base);
    expect(r.success).toBe(false);
  });

  it("rejects when both posology modes are provided", () => {
    const r = createPrescriptionSchema.safeParse({
      ...base,
      intervalHours: 8,
      fixedTimes: ["08:00"],
    });
    expect(r.success).toBe(false);
  });

  it("rejects invalid HH:mm in fixedTimes", () => {
    const r = createPrescriptionSchema.safeParse({
      ...base,
      fixedTimes: ["08:00", "25:99"],
    });
    expect(r.success).toBe(false);
  });

  it("accepts interval-only valid input", () => {
    const r = createPrescriptionSchema.safeParse({ ...base, intervalHours: 12 });
    expect(r.success).toBe(true);
  });

  it("accepts fixed-times valid input", () => {
    const r = createPrescriptionSchema.safeParse({
      ...base,
      fixedTimes: ["08:00", "20:00"],
    });
    expect(r.success).toBe(true);
  });

  it("defaults startDate to now when omitted", () => {
    const r = createPrescriptionSchema.safeParse({ ...base, intervalHours: 24 });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.startDate).toBeInstanceOf(Date);
  });
});
