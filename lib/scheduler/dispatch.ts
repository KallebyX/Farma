/**
 * Scheduler: two responsibilities.
 *
 * 1) `materializeReminders(prescriptionId, lookaheadMs)`: ensures ReminderJob
 *    rows exist for the upcoming window for an active prescription. Idempotent
 *    via composite identity (prescriptionId + scheduledFor).
 *
 * 2) `dispatchDueReminders(now)`: finds all PENDING reminders whose time has
 *    arrived (or passed the grace window), sends them via WhatsApp, and
 *    transitions them to DISPATCHED. Also schedules late-confirmation
 *    follow-ups for reminders that crossed the late window without response.
 */

import { PrescriptionStatus, ReminderStatus } from "@prisma/client";
import { prisma } from "@/lib/db";
import { computeReminderTimes } from "@/lib/prescriptions/posology";
import { sendWhatsApp } from "@/lib/whatsapp/client";
import { reminderMessage, lateConfirmationFollowup } from "@/lib/whatsapp/templates";

const DEFAULT_LOOKAHEAD_MS = 24 * 60 * 60 * 1000;
const LATE_FOLLOWUP_AFTER_MS = 60 * 60 * 1000;

export async function materializeReminders(
  prescriptionId: string,
  lookaheadMs: number = DEFAULT_LOOKAHEAD_MS,
  now: Date = new Date(),
): Promise<number> {
  const rx = await prisma.prescription.findUnique({ where: { id: prescriptionId } });
  if (!rx || rx.status !== PrescriptionStatus.ACTIVE) return 0;

  const to = new Date(now.getTime() + lookaheadMs);
  const occurrences = computeReminderTimes(
    {
      intervalHours: rx.intervalHours,
      fixedTimes: rx.fixedTimes,
      startDate: rx.startDate,
      endDate: rx.endDate,
      durationDays: rx.durationDays,
    },
    now,
    to,
  );

  if (occurrences.length === 0) return 0;

  // Insert idempotently by querying existing rows in the window
  const existing = await prisma.reminderJob.findMany({
    where: {
      prescriptionId,
      scheduledFor: { gte: now, lt: to },
    },
    select: { scheduledFor: true },
  });
  const seen = new Set(existing.map((e) => e.scheduledFor.getTime()));

  const toCreate = occurrences
    .filter((o) => !seen.has(o.scheduledFor.getTime()))
    .map((o) => ({
      prescriptionId,
      scheduledFor: o.scheduledFor,
      status: ReminderStatus.PENDING,
    }));
  if (toCreate.length === 0) return 0;

  await prisma.reminderJob.createMany({ data: toCreate });
  return toCreate.length;
}

export type DispatchSummary = {
  dispatched: number;
  failed: number;
  followupsSent: number;
  marked_missed: number;
};

export async function dispatchDueReminders(now: Date = new Date()): Promise<DispatchSummary> {
  const summary: DispatchSummary = { dispatched: 0, failed: 0, followupsSent: 0, marked_missed: 0 };

  const due = await prisma.reminderJob.findMany({
    where: {
      status: { in: [ReminderStatus.PENDING, ReminderStatus.DEFERRED] },
      scheduledFor: { lte: now },
    },
    include: {
      prescription: {
        include: {
          patient: { select: { id: true, name: true, phone: true, status: true } },
          medication: { select: { brandName: true, dosage: true } },
        },
      },
    },
    take: 200,
  });

  for (const job of due) {
    const patient = job.prescription.patient;
    if (
      patient.status !== "ACTIVE" ||
      job.prescription.status !== PrescriptionStatus.ACTIVE
    ) {
      await prisma.reminderJob.update({
        where: { id: job.id },
        data: { status: ReminderStatus.CANCELLED },
      });
      continue;
    }

    const result = await sendWhatsApp(
      reminderMessage({
        phone: patient.phone,
        patientName: patient.name,
        medicationLabel: `${job.prescription.medication.brandName} ${job.prescription.medication.dosage}`,
        doseAmount: job.prescription.doseAmount,
        reminderId: job.id,
        scheduledFor: job.scheduledFor,
      }),
    );

    if (result.status === "FAILED") {
      summary.failed++;
      continue;
    }
    await prisma.reminderJob.update({
      where: { id: job.id },
      data: {
        status: ReminderStatus.DISPATCHED,
        dispatchedAt: now,
        whatsappId: result.providerId,
      },
    });
    summary.dispatched++;
  }

  // Late-confirmation followups: reminders dispatched > 1h ago, still no response
  const lateThreshold = new Date(now.getTime() - LATE_FOLLOWUP_AFTER_MS);
  const stale = await prisma.reminderJob.findMany({
    where: {
      status: ReminderStatus.DISPATCHED,
      dispatchedAt: { lte: lateThreshold },
      respondedAt: null,
    },
    include: {
      prescription: {
        include: {
          patient: { select: { phone: true, status: true } },
          medication: { select: { brandName: true, dosage: true } },
        },
      },
    },
    take: 100,
  });

  for (const job of stale) {
    if (job.prescription.patient.status !== "ACTIVE") continue;
    const result = await sendWhatsApp(
      lateConfirmationFollowup({
        phone: job.prescription.patient.phone,
        reminderId: job.id,
        medicationLabel: `${job.prescription.medication.brandName} ${job.prescription.medication.dosage}`,
        scheduledFor: job.scheduledFor,
      }),
    );
    if (result.status !== "FAILED") summary.followupsSent++;
  }

  // Anything dispatched > 6h ago without response → MISSED (no further followup)
  const missedThreshold = new Date(now.getTime() - 6 * 60 * 60 * 1000);
  const missed = await prisma.reminderJob.updateMany({
    where: {
      status: ReminderStatus.DISPATCHED,
      dispatchedAt: { lte: missedThreshold },
      respondedAt: null,
    },
    data: { status: ReminderStatus.MISSED },
  });
  summary.marked_missed = missed.count;

  return summary;
}

export async function materializeAllActive(now: Date = new Date()): Promise<number> {
  const active = await prisma.prescription.findMany({
    where: { status: PrescriptionStatus.ACTIVE },
    select: { id: true },
  });
  let total = 0;
  for (const p of active) {
    total += await materializeReminders(p.id, DEFAULT_LOOKAHEAD_MS, now);
  }
  return total;
}
