import { prisma } from "@/lib/db";
import { AppointmentKind, AppointmentStatus } from "@prisma/client";
import { sendWhatsApp } from "@/lib/whatsapp/client";

/** Appointments / consultas domain service. */

const sel = {
  id: true, title: true, kind: true, scheduledAt: true, durationMin: true,
  location: true, professional: true, status: true, notes: true,
} as const;

const VALID_KINDS = new Set(Object.values(AppointmentKind));
const VALID_STATUS = new Set(Object.values(AppointmentStatus));

export function listForPatient(patientId: string, pharmacyId?: string) {
  return prisma.appointment.findMany({
    where: { patientId, ...(pharmacyId ? { pharmacyId } : {}) },
    orderBy: { scheduledAt: "desc" },
    select: sel,
  });
}

/** Upcoming scheduled appointments across the pharmacy (agenda view). */
export function upcomingForPharmacy(pharmacyId: string, limit = 100) {
  return prisma.appointment.findMany({
    where: { pharmacyId, status: "SCHEDULED", scheduledAt: { gte: new Date(Date.now() - 3600_000) } },
    orderBy: { scheduledAt: "asc" },
    take: limit,
    select: { ...sel, patient: { select: { id: true, name: true, phone: true } } },
  });
}

export type CreateApptArgs = {
  patientId: string; pharmacyId: string; title: string;
  kind?: string; scheduledAt: string; durationMin?: number;
  location?: string | null; professional?: string | null; notes?: string | null; createdBy?: string;
};

export async function createAppointment(args: CreateApptArgs) {
  const title = args.title?.trim();
  if (!title || title.length < 2) return { ok: false as const, status: 400, error: "Informe um título" };
  const when = new Date(args.scheduledAt);
  if (isNaN(when.getTime())) return { ok: false as const, status: 400, error: "Data/hora inválida" };
  const kind = (args.kind && VALID_KINDS.has(args.kind as AppointmentKind) ? args.kind : "CONSULTATION") as AppointmentKind;
  const durationMin = Number.isFinite(args.durationMin) && (args.durationMin ?? 0) > 0 ? Math.min(480, Math.floor(args.durationMin!)) : 30;

  const appointment = await prisma.appointment.create({
    data: {
      patientId: args.patientId, pharmacyId: args.pharmacyId, title: title.slice(0, 120),
      kind, scheduledAt: when, durationMin,
      location: args.location?.slice(0, 120) ?? null,
      professional: args.professional?.slice(0, 80) ?? null,
      notes: args.notes?.slice(0, 1000) ?? null,
      createdBy: args.createdBy ?? null,
    },
    select: sel,
  });
  return { ok: true as const, appointment };
}

export type ApptReminderSummary = { sent: number; failed: number; scanned: number };

/**
 * Automation: sends a one-time WhatsApp reminder for SCHEDULED appointments
 * happening within the next `windowMs` (default 24h). Idempotent via
 * `reminderSentAt`, which is stamped only after a non-failed send.
 */
export async function dispatchAppointmentReminders(
  now: Date = new Date(),
  windowMs: number = 24 * 60 * 60 * 1000,
): Promise<ApptReminderSummary> {
  const summary: ApptReminderSummary = { sent: 0, failed: 0, scanned: 0 };
  const until = new Date(now.getTime() + windowMs);

  const due = await prisma.appointment.findMany({
    where: {
      status: "SCHEDULED",
      reminderSentAt: null,
      scheduledAt: { gte: now, lte: until },
    },
    orderBy: { scheduledAt: "asc" },
    take: 200,
    select: {
      id: true, title: true, scheduledAt: true, location: true, professional: true,
      patient: { select: { name: true, phone: true, status: true } },
    },
  });

  for (const appt of due) {
    summary.scanned++;
    if (appt.patient.status !== "ACTIVE") {
      await prisma.appointment.update({ where: { id: appt.id }, data: { reminderSentAt: now } });
      continue;
    }
    const when = appt.scheduledAt.toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
    const where = appt.location ? `\n📍 ${appt.location}` : "";
    const who = appt.professional ? `\n👤 ${appt.professional}` : "";
    const first = appt.patient.name.split(/\s+/)[0] ?? appt.patient.name;
    const result = await sendWhatsApp({
      kind: "text",
      phone: appt.patient.phone,
      text: `🔔 Olá, ${first}! Lembrete do seu compromisso:\n\n📅 *${appt.title}*\n🕐 ${when}${where}${who}\n\nSe precisar remarcar, responda aqui.`,
      template: { key: "appointment_reminder" },
    });
    if (result.status === "FAILED") {
      summary.failed++;
      continue;
    }
    await prisma.appointment.update({ where: { id: appt.id }, data: { reminderSentAt: now } });
    summary.sent++;
  }

  return summary;
}

export async function updateAppointment(id: string, pharmacyId: string, patch: { status?: string; notes?: string }) {
  const data: { status?: AppointmentStatus; notes?: string } = {};
  if (patch.status && VALID_STATUS.has(patch.status as AppointmentStatus)) data.status = patch.status as AppointmentStatus;
  if (typeof patch.notes === "string") data.notes = patch.notes.slice(0, 1000);
  if (Object.keys(data).length === 0) return { count: 0 };
  return prisma.appointment.updateMany({ where: { id, pharmacyId }, data });
}
