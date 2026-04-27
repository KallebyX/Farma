/**
 * Return reminders dispatcher.
 *
 * Three responsibilities, all idempotent:
 *
 * 1) materializeReturnExpectations — for every active prescription with a
 *    quantityDispensed, compute the estimated stock end date and ensure a
 *    ReturnExpectation row exists. Skips if one already exists in
 *    SCHEDULED/ASKED state.
 *
 * 2) askDueReturns — for every SCHEDULED expectation whose
 *    `expectedAt + graceDays` has elapsed, send the WhatsApp prompt and
 *    transition to ASKED.
 *
 * 3) expireStaleReturns — ASKED expectations with no response after 14 days
 *    are marked EXPIRED.
 */

import { PrescriptionStatus, ReturnStatus } from "@prisma/client";
import { prisma } from "@/lib/db";
import { estimateStockEndDate } from "@/lib/prescriptions/posology";
import { sendWhatsApp } from "@/lib/whatsapp/client";
import { returnReminder } from "@/lib/whatsapp/templates";

const ASKED_TTL_DAYS = 14;

export type ReturnsCronSummary = {
  materialized: number;
  asked: number;
  expired: number;
  failed: number;
};

export async function runReturnsCron(now: Date = new Date()): Promise<ReturnsCronSummary> {
  const materialized = await materializeReturnExpectations(now);
  const askResult = await askDueReturns(now);
  const expireResult = await expireStaleReturns(now);
  return {
    materialized,
    asked: askResult.asked,
    failed: askResult.failed,
    expired: expireResult.expired,
  };
}

export async function materializeReturnExpectations(now: Date = new Date()): Promise<number> {
  const candidates = await prisma.prescription.findMany({
    where: {
      status: PrescriptionStatus.ACTIVE,
      quantityDispensed: { not: null },
    },
    include: {
      returnExpectations: {
        where: {
          status: { in: [ReturnStatus.SCHEDULED, ReturnStatus.ASKED] },
        },
        select: { id: true },
      },
    },
  });

  let created = 0;
  for (const rx of candidates) {
    if (rx.returnExpectations.length > 0) continue;

    const expectedAt = estimateStockEndDate({
      intervalHours: rx.intervalHours,
      fixedTimes: rx.fixedTimes,
      startDate: rx.startDate,
      endDate: rx.endDate,
      durationDays: rx.durationDays,
      quantityDispensed: rx.quantityDispensed,
    });
    if (!expectedAt) continue;

    // Don't materialize for prescriptions already past their expected refill
    // window by more than 30 days — likely stale data, surface manually.
    const ageMs = now.getTime() - expectedAt.getTime();
    if (ageMs > 30 * 24 * 60 * 60 * 1000) continue;

    await prisma.returnExpectation.create({
      data: {
        prescriptionId: rx.id,
        expectedAt,
      },
    });
    created++;
  }
  return created;
}

export async function askDueReturns(now: Date = new Date()): Promise<{ asked: number; failed: number }> {
  let asked = 0;
  let failed = 0;

  const due = await prisma.returnExpectation.findMany({
    where: { status: ReturnStatus.SCHEDULED },
    include: {
      prescription: {
        include: {
          patient: { select: { id: true, name: true, phone: true, status: true } },
          medication: { select: { brandName: true, dosage: true } },
        },
      },
    },
    take: 100,
  });

  const pharmacy = await prisma.pharmacy.findFirst({ select: { fantasia: true, razaoSocial: true } });
  const pharmacyName = pharmacy?.fantasia ?? pharmacy?.razaoSocial ?? "sua farmácia";

  for (const exp of due) {
    const dueAt = new Date(exp.expectedAt.getTime() + exp.graceDays * 24 * 60 * 60 * 1000);
    if (dueAt > now) continue;

    const patient = exp.prescription.patient;
    if (
      patient.status !== "ACTIVE" ||
      exp.prescription.status !== PrescriptionStatus.ACTIVE
    ) {
      await prisma.returnExpectation.update({
        where: { id: exp.id },
        data: { status: ReturnStatus.CANCELLED },
      });
      continue;
    }

    const result = await sendWhatsApp(
      returnReminder({
        phone: patient.phone,
        patientName: patient.name,
        pharmacyName,
        medicationLabel: `${exp.prescription.medication.brandName} ${exp.prescription.medication.dosage}`,
        expectationId: exp.id,
      }),
    );

    if (result.status === "FAILED") {
      failed++;
      continue;
    }

    await prisma.returnExpectation.update({
      where: { id: exp.id },
      data: {
        status: ReturnStatus.ASKED,
        askedAt: now,
        whatsappId: result.providerId,
      },
    });
    asked++;
  }

  return { asked, failed };
}

export async function expireStaleReturns(now: Date = new Date()): Promise<{ expired: number }> {
  const cutoff = new Date(now.getTime() - ASKED_TTL_DAYS * 24 * 60 * 60 * 1000);
  const r = await prisma.returnExpectation.updateMany({
    where: {
      status: ReturnStatus.ASKED,
      askedAt: { lte: cutoff },
    },
    data: { status: ReturnStatus.EXPIRED },
  });
  return { expired: r.count };
}

/**
 * Process a patient's response to a return reminder. Called from the inbound
 * WhatsApp handler.
 */
export async function recordReturnResponse(
  expectationId: string,
  response: "restocked-here" | "restocked-away" | "stopping",
  now: Date = new Date(),
) {
  const map = {
    "restocked-here": ReturnStatus.RESTOCKED_HERE,
    "restocked-away": ReturnStatus.RESTOCKED_AWAY,
    stopping: ReturnStatus.STOPPING,
  } as const;

  await prisma.returnExpectation.update({
    where: { id: expectationId },
    data: {
      status: map[response],
      respondedAt: now,
    },
  });

  // If the patient is stopping treatment, also pause their prescription so
  // we stop dispatching reminders. The pharmacist will revisit in the panel.
  if (response === "stopping") {
    const exp = await prisma.returnExpectation.findUnique({
      where: { id: expectationId },
      select: { prescriptionId: true },
    });
    if (exp) {
      await prisma.prescription.update({
        where: { id: exp.prescriptionId },
        data: {
          status: PrescriptionStatus.PAUSED,
          pausedReason: "patient signaled stopping (return reminder)",
        },
      });
    }
  }
}
