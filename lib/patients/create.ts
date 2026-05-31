import { prisma } from "@/lib/db";
import { sendWhatsApp } from "@/lib/whatsapp/client";
import { consentRequest } from "@/lib/whatsapp/templates";
import type { SessionContext } from "@/lib/auth/permissions";
import type { CreatePatientInput, CreatePrescriptionInput } from "@/lib/patients/schema";
import { materializeReminders } from "@/lib/scheduler/dispatch";
import { ConsentScope, Prisma } from "@prisma/client";

export class PatientConflictError extends Error {
  status = 409;
}

export async function createPatient(ctx: SessionContext, input: CreatePatientInput) {
  const phone = normalize(input.phone);

  const existing = await prisma.patient.findUnique({
    where: { pharmacyId_phone: { pharmacyId: ctx.pharmacyId, phone } },
  });
  if (existing) throw new PatientConflictError("Já existe um paciente com este telefone");

  const pharmacy = await prisma.pharmacy.findUniqueOrThrow({
    where: { id: ctx.pharmacyId },
    select: { fantasia: true, razaoSocial: true },
  });

  let patient;
  try {
    patient = await prisma.$transaction(async (tx) => {
      const p = await tx.patient.create({
        data: {
          pharmacyId: ctx.pharmacyId,
          name: input.name,
          phone,
          cpf: input.cpf || null,
          birthDate: input.birthDate ? new Date(input.birthDate) : null,
          age: input.age ?? null,
          sex: input.sex,
          comorbidities: input.comorbidities,
          allergies: input.allergies,
          notes: input.notes,
          consentGiven: input.consentGiven,
          consentDate: input.consentGiven ? new Date() : null,
          createdById: ctx.userId,
        },
      });

      if (input.consentGiven) {
        await tx.patientConsent.create({
          data: {
            patientId: p.id,
            scope: ConsentScope.SERVICE,
            granted: true,
            termsVersion: "1.0",
            source: "panel",
          },
        });
      }

      return p;
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      throw new PatientConflictError("Já existe um paciente com este telefone");
    }
    throw error;
  }

  // Kick off the WhatsApp consent request. We don't await on failure — we
  // record patient regardless so the panel reflects the registration.
  await sendWhatsApp(
    consentRequest({
      phone,
      patientName: patient.name,
      pharmacyName: pharmacy.fantasia ?? pharmacy.razaoSocial,
    }),
  ).catch((err) => {
    // eslint-disable-next-line no-console
    console.warn("[patient.create] consent dispatch failed", err);
  });

  return patient;
}

export async function addPrescription(
  ctx: SessionContext,
  input: CreatePrescriptionInput,
) {
  const patient = await prisma.patient.findFirst({
    where: { id: input.patientId, pharmacyId: ctx.pharmacyId },
  });
  if (!patient) throw new PatientConflictError("Paciente não encontrado nesta farmácia");

  const medication = await prisma.medicationCatalog.findUnique({
    where: { id: input.medicationId },
  });
  if (!medication) throw new PatientConflictError("Medicamento não encontrado no catálogo");

  const endDate =
    input.durationDays && input.durationDays > 0
      ? new Date(input.startDate.getTime() + input.durationDays * 24 * 60 * 60 * 1000)
      : null;

  const prescription = await prisma.prescription.create({
    data: {
      patientId: patient.id,
      medicationId: medication.id,
      doseAmount: input.doseAmount,
      intervalHours: input.intervalHours,
      fixedTimes: input.fixedTimes ?? [],
      durationDays: input.durationDays,
      instructions: input.instructions,
      quantityDispensed: input.quantityDispensed,
      prescriber: input.prescriber,
      batchLot: input.batchLot,
      expiryDate: input.expiryDate,
      prescriptionRef: input.prescriptionRef,
      photoKey: input.photoKey,
      startDate: input.startDate,
      endDate,
      createdById: ctx.userId,
    },
  });

  // Pre-materialize the next 24h of reminders so the dashboard has data
  await materializeReminders(prescription.id);

  return prescription;
}

function normalize(phone: string): string {
  const d = phone.replace(/\D/g, "");
  return `+${d}`;
}
