import { prisma } from "@/lib/db";
import { getPatientFromBearer } from "@/lib/api/v1/auth";
import { ok, fail, preflight } from "@/lib/api/v1/respond";

export const dynamic = "force-dynamic";

/** GET /api/v1/me - the authenticated patient's own profile. */
export async function GET(req: Request) {
  try {
    const p = await getPatientFromBearer(req);
    if (!p) return fail(req, "Sessão inválida", 401);
    const profile = await prisma.patient.findUnique({
      where: { id: p.id },
      select: { id: true, name: true, phone: true, birthDate: true, sex: true, allergies: true, comorbidities: true },
    });
    if (!profile) return fail(req, "Paciente não encontrado", 404);
    return ok(req, { profile });
  } catch {
    return fail(req, "Erro", 500);
  }
}

/** PATCH /api/v1/me - patient edits whitelisted profile fields. */
export async function PATCH(req: Request) {
  try {
    const p = await getPatientFromBearer(req);
    if (!p) return fail(req, "Sessão inválida", 401);
    const b = (await req.json().catch(() => ({}))) as Record<string, unknown>;

    const data: { name?: string; birthDate?: Date | null; sex?: string | null; allergies?: string[]; comorbidities?: string[] } = {};
    if (typeof b.name === "string" && b.name.trim().length >= 2) data.name = b.name.trim().slice(0, 120);
    if (typeof b.sex === "string") data.sex = ["M", "F", "O"].includes(b.sex) ? b.sex : null;
    if (typeof b.birthDate === "string") { const d = new Date(b.birthDate); data.birthDate = isNaN(d.getTime()) ? null : d; }
    if (Array.isArray(b.allergies)) data.allergies = b.allergies.filter((x) => typeof x === "string").slice(0, 40).map((x) => (x as string).slice(0, 80));
    if (Array.isArray(b.comorbidities)) data.comorbidities = b.comorbidities.filter((x) => typeof x === "string").slice(0, 40).map((x) => (x as string).slice(0, 80));

    if (Object.keys(data).length === 0) return fail(req, "Nada para atualizar", 400);
    await prisma.patient.update({ where: { id: p.id }, data });
    return ok(req, { updated: true });
  } catch {
    return fail(req, "Erro", 500);
  }
}

export const OPTIONS = preflight;
