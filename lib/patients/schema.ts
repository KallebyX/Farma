import { z } from "zod";
import { DosageForm } from "@prisma/client";

const phoneRegex = /^\+\d{10,15}$/;
const cpfRegex = /^\d{11}$/;
const hhmmRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;

export const createPatientSchema = z.object({
  name: z.string().trim().min(2, "Nome muito curto").max(120),
  phone: z.string().trim().regex(phoneRegex, "Telefone deve estar em E.164, ex: +5511999999999"),
  cpf: z
    .string()
    .trim()
    .regex(cpfRegex, "CPF deve ter 11 dígitos numéricos")
    .optional()
    .or(z.literal("")),
  birthDate: z.string().datetime().optional().or(z.literal("")),
  sex: z.enum(["M", "F", "O"]).optional(),
  comorbidities: z.array(z.string().trim().min(1)).max(20).default([]),
  notes: z.string().trim().max(500).optional(),
});

export type CreatePatientInput = z.infer<typeof createPatientSchema>;

export const createPrescriptionSchema = z
  .object({
    patientId: z.string().uuid(),
    medicationId: z.string().uuid(),
    doseAmount: z.string().trim().min(1).max(80),
    intervalHours: z.number().int().min(1).max(168).optional(),
    fixedTimes: z.array(z.string().regex(hhmmRegex, "Hora inválida (HH:mm)")).max(8).default([]),
    durationDays: z.number().int().min(1).max(3650).optional(),
    instructions: z.string().trim().max(500).optional(),
    quantityDispensed: z.number().int().min(1).max(10000).optional(),
    prescriber: z.string().trim().max(120).optional(),
    startDate: z
      .string()
      .datetime()
      .optional()
      .or(z.literal(""))
      .transform((v) => (v ? new Date(v) : new Date())),
  })
  .superRefine((data, ctx) => {
    const hasInterval = !!data.intervalHours;
    const hasFixed = data.fixedTimes && data.fixedTimes.length > 0;
    if (!hasInterval && !hasFixed) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["intervalHours"],
        message: "Informe intervalo em horas OU horários fixos",
      });
    }
    if (hasInterval && hasFixed) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["fixedTimes"],
        message: "Use apenas um modo: intervalo OU horários fixos",
      });
    }
  });

export type CreatePrescriptionInput = z.infer<typeof createPrescriptionSchema>;

export const searchMedicationSchema = z.object({
  q: z.string().trim().min(1).max(60),
  form: z.nativeEnum(DosageForm).optional(),
});

export const reviewRamSchema = z.object({
  notes: z.string().trim().max(2000).optional(),
  forwardToVigimed: z.boolean().default(false),
});
