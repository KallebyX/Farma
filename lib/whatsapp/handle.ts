/**
 * Side-effecting handler that takes an inbound intent + phone, looks up the
 * patient and current bot state, and produces the right response while
 * persisting any state changes.
 */

import {
  PatientStatus,
  PrescriptionStatus,
  ReminderStatus,
  ConsentScope,
  RAMSeverity,
  RAMStatus,
  AdherenceOutcome,
  type Prescription,
} from "@prisma/client";
import { prisma } from "@/lib/db";
import { parseInbound, type Intent } from "@/lib/whatsapp/router";
import { sendWhatsApp, type WhatsAppSendResult } from "@/lib/whatsapp/client";
import {
  consentConfirmation,
  consentDeclined,
  meusRemediosList,
  pausedConfirmation,
  resumedConfirmation,
  withdrawnConfirmation,
  unknownCommandHelp,
  ramSeverityPrompt,
  ramSevereWarning,
  ramAcknowledgement,
  refusalReasonPrompt,
} from "@/lib/whatsapp/templates";
import type { PosologyInput } from "@/lib/prescriptions/posology";

const TERMS_VERSION = "1.0";

export type HandleInput = {
  phone: string;       // E.164
  text?: string;
  buttonId?: string;
};

export async function handleInbound(input: HandleInput): Promise<WhatsAppSendResult> {
  const intent = parseInbound({ text: input.text, buttonId: input.buttonId });
  const phone = normalizePhone(input.phone);

  const patient = await prisma.patient.findFirst({ where: { phone } });
  if (!patient) {
    // Unknown phone: silently drop (don't spam unknown numbers)
    return { status: "MOCK", providerId: "ignored-unknown-patient" };
  }

  // Withdrawn patients should not receive any further messages
  if (patient.status === PatientStatus.WITHDRAWN) {
    return { status: "MOCK", providerId: "ignored-withdrawn" };
  }

  return await dispatchByIntent(intent, patient, phone);
}

async function dispatchByIntent(
  intent: Intent,
  patient: { id: string; pharmacyId: string; name: string },
  phone: string,
): Promise<WhatsAppSendResult> {
  switch (intent.kind) {
    case "consent":
      return await handleConsent(patient, phone, intent.granted);

    case "command":
      return await handleCommand(patient, phone, intent.command);

    case "reminder_response":
      return await handleReminderResponse(patient, phone, intent);

    case "ram_severity":
      return await handleRamSeverity(patient, phone, intent.severity);

    case "free_text":
      return await sendWhatsApp(unknownCommandHelp({ phone }));

    default:
      return await sendWhatsApp(unknownCommandHelp({ phone }));
  }
}

async function handleConsent(
  patient: { id: string; name: string },
  phone: string,
  granted: boolean,
): Promise<WhatsAppSendResult> {
  await prisma.patientConsent.create({
    data: {
      patientId: patient.id,
      scope: ConsentScope.SERVICE,
      granted,
      termsVersion: TERMS_VERSION,
      source: "whatsapp",
    },
  });

  if (!granted) {
    await prisma.patient.update({
      where: { id: patient.id },
      data: { status: PatientStatus.WITHDRAWN },
    });
    return await sendWhatsApp(consentDeclined({ phone }));
  }

  return await sendWhatsApp(consentConfirmation({ phone, patientName: patient.name }));
}

async function handleCommand(
  patient: { id: string; pharmacyId: string },
  phone: string,
  command: string,
): Promise<WhatsAppSendResult> {
  switch (command) {
    case "meusremedios": {
      const rx = await prisma.prescription.findMany({
        where: { patientId: patient.id, status: PrescriptionStatus.ACTIVE },
        include: { medication: { select: { brandName: true, dosage: true } } },
      });
      return await sendWhatsApp(
        meusRemediosList({
          phone,
          prescriptions: rx.map((p) => ({
            medicationLabel: `${p.medication.brandName} ${p.medication.dosage}`,
            posology: prescriptionToPosology(p),
          })),
        }),
      );
    }

    case "pausar": {
      await prisma.prescription.updateMany({
        where: { patientId: patient.id, status: PrescriptionStatus.ACTIVE },
        data: { status: PrescriptionStatus.PAUSED, pausedReason: "patient via whatsapp" },
      });
      await prisma.patient.update({
        where: { id: patient.id },
        data: { status: PatientStatus.PAUSED },
      });
      return await sendWhatsApp(pausedConfirmation({ phone }));
    }

    case "voltar": {
      await prisma.prescription.updateMany({
        where: { patientId: patient.id, status: PrescriptionStatus.PAUSED },
        data: { status: PrescriptionStatus.ACTIVE, pausedReason: null },
      });
      await prisma.patient.update({
        where: { id: patient.id },
        data: { status: PatientStatus.ACTIVE },
      });
      return await sendWhatsApp(resumedConfirmation({ phone }));
    }

    case "reacao": {
      // Open RAM intake with placeholder until severity is captured
      await prisma.rAMReport.create({
        data: {
          patientId: patient.id,
          symptoms: [],
          severity: RAMSeverity.MILD,
          status: RAMStatus.PENDING_REVIEW,
          freeText: "(intake started via WhatsApp)",
        },
      });
      return await sendWhatsApp(ramSeverityPrompt({ phone }));
    }

    case "sair": {
      await prisma.patient.update({
        where: { id: patient.id },
        data: { status: PatientStatus.WITHDRAWN },
      });
      return await sendWhatsApp(withdrawnConfirmation({ phone }));
    }

    case "ajuda":
    case "privacidade":
    default:
      return await sendWhatsApp(unknownCommandHelp({ phone }));
  }
}

async function handleReminderResponse(
  patient: { id: string },
  phone: string,
  intent: Extract<Intent, { kind: "reminder_response" }>,
): Promise<WhatsAppSendResult> {
  const job = await prisma.reminderJob.findUnique({
    where: { id: intent.reminderId },
    include: { prescription: { select: { patientId: true } } },
  });
  if (!job || job.prescription.patientId !== patient.id) {
    return { status: "MOCK", providerId: "ignored-foreign-reminder" };
  }

  const now = new Date();
  if (intent.action === "taken") {
    await prisma.$transaction([
      prisma.reminderJob.update({
        where: { id: job.id },
        data: { status: ReminderStatus.CONFIRMED, respondedAt: now },
      }),
      prisma.adherenceEvent.create({
        data: {
          prescriptionId: job.prescriptionId,
          scheduledFor: job.scheduledFor,
          respondedAt: now,
          outcome: AdherenceOutcome.TAKEN,
        },
      }),
    ]);
    return await sendWhatsApp({ kind: "text", phone, text: "Anotado! ✅" });
  }

  if (intent.action === "taken-late") {
    await prisma.$transaction([
      prisma.reminderJob.update({
        where: { id: job.id },
        data: { status: ReminderStatus.CONFIRMED, respondedAt: now },
      }),
      prisma.adherenceEvent.create({
        data: {
          prescriptionId: job.prescriptionId,
          scheduledFor: job.scheduledFor,
          respondedAt: now,
          outcome: AdherenceOutcome.TAKEN_LATE,
        },
      }),
    ]);
    return await sendWhatsApp({ kind: "text", phone, text: "Obrigado por confirmar. ✅" });
  }

  if (intent.action === "defer") {
    const newTime = new Date(now.getTime() + 30 * 60 * 1000);
    await prisma.reminderJob.update({
      where: { id: job.id },
      data: { status: ReminderStatus.DEFERRED, scheduledFor: newTime },
    });
    return await sendWhatsApp({
      kind: "text",
      phone,
      text: `Tudo bem, te lembro de novo às ${formatTime(newTime)}. ⏰`,
    });
  }

  if (intent.action === "refuse") {
    await prisma.reminderJob.update({
      where: { id: job.id },
      data: { status: ReminderStatus.REFUSED, respondedAt: now },
    });
    return await sendWhatsApp(refusalReasonPrompt({ phone, reminderId: job.id }));
  }

  if (intent.action === "missed") {
    await prisma.$transaction([
      prisma.reminderJob.update({
        where: { id: job.id },
        data: { status: ReminderStatus.MISSED, respondedAt: now },
      }),
      prisma.adherenceEvent.create({
        data: {
          prescriptionId: job.prescriptionId,
          scheduledFor: job.scheduledFor,
          respondedAt: now,
          outcome: AdherenceOutcome.MISSED,
        },
      }),
    ]);
    return await sendWhatsApp({
      kind: "text",
      phone,
      text: "Sem problema. Te lembro de novo na próxima dose.",
    });
  }

  if (intent.action === "reason" && intent.reason) {
    await prisma.$transaction([
      prisma.reminderJob.update({
        where: { id: job.id },
        data: { refusalReason: intent.reason },
      }),
      prisma.adherenceEvent.create({
        data: {
          prescriptionId: job.prescriptionId,
          scheduledFor: job.scheduledFor,
          respondedAt: now,
          outcome: AdherenceOutcome.REFUSED,
          reason: intent.reason,
        },
      }),
    ]);
    if (intent.reason === "felt-bad") {
      // Auto-route to RAM intake
      await prisma.rAMReport.create({
        data: {
          patientId: patient.id,
          prescriptionId: job.prescriptionId,
          symptoms: [],
          severity: RAMSeverity.MILD,
          status: RAMStatus.PENDING_REVIEW,
          freeText: "(triggered from refusal: felt-bad)",
        },
      });
      return await sendWhatsApp(ramSeverityPrompt({ phone }));
    }
    return await sendWhatsApp({
      kind: "text",
      phone,
      text: "Anotado. O farmacêutico vai revisar isso.",
    });
  }

  return { status: "MOCK", providerId: "noop" };
}

async function handleRamSeverity(
  patient: { id: string },
  phone: string,
  severity: "mild" | "moderate" | "severe",
): Promise<WhatsAppSendResult> {
  const ram = await prisma.rAMReport.findFirst({
    where: { patientId: patient.id, status: RAMStatus.PENDING_REVIEW },
    orderBy: { createdAt: "desc" },
  });
  if (!ram) {
    return await sendWhatsApp({
      kind: "text",
      phone,
      text: "Não encontrei um relato em andamento. Mande /reacao para abrir um novo.",
    });
  }
  const map = { mild: RAMSeverity.MILD, moderate: RAMSeverity.MODERATE, severe: RAMSeverity.SEVERE };
  await prisma.rAMReport.update({
    where: { id: ram.id },
    data: { severity: map[severity] },
  });

  if (severity === "severe") {
    return await sendWhatsApp(ramSevereWarning({ phone }));
  }
  return await sendWhatsApp(ramAcknowledgement({ phone }));
}

function prescriptionToPosology(p: Prescription): PosologyInput & { doseAmount: string; instructions?: string | null } {
  return {
    intervalHours: p.intervalHours,
    fixedTimes: p.fixedTimes,
    startDate: p.startDate,
    endDate: p.endDate,
    durationDays: p.durationDays,
    doseAmount: p.doseAmount,
    instructions: p.instructions,
  };
}

function normalizePhone(phone: string): string {
  const d = phone.replace(/\D/g, "");
  return `+${d}`;
}

function formatTime(d: Date): string {
  return d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}
