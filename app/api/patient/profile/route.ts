import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { resolvePatientFromRequest } from "@/lib/patient-session";

/** GET /api/patient/profile — the patient's own profile. */
export async function GET(req: Request) {
  try {
    const p = await resolvePatientFromRequest(req);
    if (!p) return NextResponse.json({ ok: false, error: "Sessão inválida" }, { status: 401 });
    const profile = await prisma.patient.findUnique({
      where: { id: p.id },
      select: { name: true, phone: true, birthDate: true, sex: true, allergies: true, comorbidities: true },
    });
    return NextResponse.json({ ok: true, profile });
  } catch {
    return NextResponse.json({ ok: false, error: "Erro" }, { status: 500 });
  }
}

/** PATCH /api/patient/profile — patient edits their own profile (whitelisted fields). */
export async function PATCH(req: Request) {
  try {
    const p = await resolvePatientFromRequest(req);
    if (!p) return NextResponse.json({ ok: false, error: "Sessão inválida" }, { status: 401 });
    const b = (await req.json().catch(() => ({}))) as Record<string, unknown>;

    const data: { name?: string; birthDate?: Date | null; sex?: string | null; allergies?: string[]; comorbidities?: string[] } = {};
    if (typeof b.name === "string" && b.name.trim().length >= 2) data.name = b.name.trim().slice(0, 120);
    if (typeof b.sex === "string") data.sex = ["M", "F", "O"].includes(b.sex) ? b.sex : null;
    if (typeof b.birthDate === "string") { const d = new Date(b.birthDate); data.birthDate = isNaN(d.getTime()) ? null : d; }
    if (Array.isArray(b.allergies)) data.allergies = b.allergies.filter((x) => typeof x === "string").slice(0, 40).map((x) => (x as string).slice(0, 80));
    if (Array.isArray(b.comorbidities)) data.comorbidities = b.comorbidities.filter((x) => typeof x === "string").slice(0, 40).map((x) => (x as string).slice(0, 80));

    if (Object.keys(data).length === 0) return NextResponse.json({ ok: false, error: "Nada para atualizar" }, { status: 400 });
    await prisma.patient.update({ where: { id: p.id }, data });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false, error: "Erro" }, { status: 500 });
  }
}
