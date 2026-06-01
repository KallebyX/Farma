import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/session";
import { UnauthorizedError } from "@/lib/auth/permissions";
import { prisma } from "@/lib/db";
import { listForPatient, createAppointment } from "@/lib/appointments";
import { sendWhatsApp } from "@/lib/whatsapp/client";

/** GET /api/patients/[id]/appointments — staff list (tenant-scoped). */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const ctx = await requireSession();
    const { id } = await params;
    const patient = await prisma.patient.findFirst({ where: { id, pharmacyId: ctx.pharmacyId }, select: { id: true } });
    if (!patient) return NextResponse.json({ ok: false, error: "Paciente não encontrado" }, { status: 404 });
    const appointments = await listForPatient(id, ctx.pharmacyId);
    return NextResponse.json({ ok: true, appointments });
  } catch (err) {
    if (err instanceof UnauthorizedError) return NextResponse.json({ ok: false, error: err.message }, { status: 401 });
    return NextResponse.json({ ok: false, error: "Erro" }, { status: 500 });
  }
}

/** POST /api/patients/[id]/appointments — staff schedules; nudges patient on WhatsApp. */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const ctx = await requireSession();
    const { id } = await params;
    const patient = await prisma.patient.findFirst({ where: { id, pharmacyId: ctx.pharmacyId }, select: { id: true, phone: true } });
    if (!patient) return NextResponse.json({ ok: false, error: "Paciente não encontrado" }, { status: 404 });

    const b = (await req.json().catch(() => ({}))) as Record<string, unknown>;
    const result = await createAppointment({
      patientId: id, pharmacyId: ctx.pharmacyId, createdBy: ctx.userId,
      title: String(b.title ?? ""), kind: b.kind ? String(b.kind) : undefined,
      scheduledAt: String(b.scheduledAt ?? ""), durationMin: typeof b.durationMin === "number" ? b.durationMin : undefined,
      location: b.location ? String(b.location) : null, professional: b.professional ? String(b.professional) : null,
      notes: b.notes ? String(b.notes) : null,
    });
    if (!result.ok) return NextResponse.json({ ok: false, error: result.error }, { status: result.status });

    const when = result.appointment.scheduledAt.toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
    sendWhatsApp({ kind: "text", phone: patient.phone, text: `📅 *${result.appointment.title}* agendado para *${when}*. Em caso de dúvidas, responda aqui.`, template: { key: "appointment" } }).catch(() => {});

    return NextResponse.json({ ok: true, appointment: result.appointment }, { status: 201 });
  } catch (err) {
    if (err instanceof UnauthorizedError) return NextResponse.json({ ok: false, error: err.message }, { status: 401 });
    return NextResponse.json({ ok: false, error: "Erro" }, { status: 500 });
  }
}
