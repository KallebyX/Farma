import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/session";
import { UnauthorizedError } from "@/lib/auth/permissions";
import { prisma } from "@/lib/db";
import { listMessages, sendMessage, markRead } from "@/lib/messages";
import { sendWhatsApp } from "@/lib/whatsapp/client";

/** GET /api/patients/[id]/messages — staff view of the thread (tenant-scoped). */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const ctx = await requireSession();
    const { id } = await params;
    const patient = await prisma.patient.findFirst({ where: { id, pharmacyId: ctx.pharmacyId }, select: { id: true } });
    if (!patient) return NextResponse.json({ ok: false, error: "Paciente não encontrado" }, { status: 404 });
    const messages = await listMessages(id);
    await markRead(id, "FROM_PATIENT");
    return NextResponse.json({ ok: true, messages });
  } catch (err) {
    if (err instanceof UnauthorizedError) return NextResponse.json({ ok: false, error: err.message }, { status: 401 });
    return NextResponse.json({ ok: false, error: "Erro" }, { status: 500 });
  }
}

/** POST /api/patients/[id]/messages { body } — staff replies; also nudges via WhatsApp. */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const ctx = await requireSession();
    const { id } = await params;
    const patient = await prisma.patient.findFirst({ where: { id, pharmacyId: ctx.pharmacyId }, select: { id: true, phone: true } });
    if (!patient) return NextResponse.json({ ok: false, error: "Paciente não encontrado" }, { status: 404 });
    const { body } = (await req.json().catch(() => ({}))) as { body?: string };
    if (!body || body.trim().length === 0) return NextResponse.json({ ok: false, error: "Mensagem vazia" }, { status: 400 });

    const me = await prisma.user.findUnique({ where: { id: ctx.userId }, select: { name: true } });
    const message = await sendMessage({ patientId: id, pharmacyId: ctx.pharmacyId, direction: "FROM_PHARMACY", body, authorName: me?.name ?? null });

    // Best-effort WhatsApp nudge so the patient knows there's a new message.
    sendWhatsApp({ kind: "text", phone: patient.phone, text: `💬 *${me?.name ?? "Sua farmácia"}* enviou uma mensagem no Meu Prontuário:\n\n${body.trim().slice(0, 500)}` }).catch(() => {});

    return NextResponse.json({ ok: true, message }, { status: 201 });
  } catch (err) {
    if (err instanceof UnauthorizedError) return NextResponse.json({ ok: false, error: err.message }, { status: 401 });
    return NextResponse.json({ ok: false, error: "Erro" }, { status: 500 });
  }
}
