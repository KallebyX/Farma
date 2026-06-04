import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/db";
import { verifyPatientToken } from "@/lib/patient-token";
import { listMessages, sendMessage, markRead } from "@/lib/messages";

async function resolvePatient(req: Request): Promise<{ id: string; pharmacyId: string } | null> {
  const auth = req.headers.get("authorization");
  const bearer = auth?.startsWith("Bearer ") ? auth.slice(7) : null;
  const cookieToken = (await cookies()).get("mp_hub")?.value ?? null;
  const patientId = verifyPatientToken(bearer ?? cookieToken);
  if (!patientId) return null;
  return prisma.patient.findUnique({ where: { id: patientId }, select: { id: true, pharmacyId: true } });
}

/** GET /api/patient/messages - the patient's thread (and mark pharmacy msgs read). */
export async function GET(req: Request) {
  try {
    const p = await resolvePatient(req);
    if (!p) return NextResponse.json({ ok: false, error: "Sessão inválida" }, { status: 401 });
    const messages = await listMessages(p.id);
    await markRead(p.id, "FROM_PHARMACY");
    return NextResponse.json({ ok: true, messages });
  } catch {
    return NextResponse.json({ ok: false, error: "Erro" }, { status: 500 });
  }
}

/** POST /api/patient/messages { body } - patient sends a message to the pharmacy. */
export async function POST(req: Request) {
  try {
    const p = await resolvePatient(req);
    if (!p) return NextResponse.json({ ok: false, error: "Sessão inválida" }, { status: 401 });
    const { body } = (await req.json().catch(() => ({}))) as { body?: string };
    if (!body || body.trim().length === 0) return NextResponse.json({ ok: false, error: "Mensagem vazia" }, { status: 400 });
    const message = await sendMessage({ patientId: p.id, pharmacyId: p.pharmacyId, direction: "FROM_PATIENT", body });
    return NextResponse.json({ ok: true, message }, { status: 201 });
  } catch {
    return NextResponse.json({ ok: false, error: "Erro" }, { status: 500 });
  }
}
