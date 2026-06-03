import { prisma } from "@/lib/db";
import { awardPoints, completeMission } from "@/lib/loyalty/service";

/**
 * Demo "Meu Prontuário": ensures a self-contained demo Pharmacy + Patient exist
 * (idempotent) so the /demo/prontuario route can hand out a real hub token and
 * render the ACTUAL patient hub — same code, APIs and gamification as production.
 * Seeds a little loyalty activity so the demo looks lived-in. Safe to call on
 * every visit (all upserts/awards are idempotent).
 */

const DEMO_CNPJ = "00000000000191"; // sentinel CNPJ for the demo pharmacy
const DEMO_PHONE = "+550000000001"; // sentinel phone = demo patient identity

export async function ensureDemoPatient(): Promise<string> {
  const pharmacy = await prisma.pharmacy.upsert({
    where: { cnpj: DEMO_CNPJ },
    update: {},
    create: {
      cnpj: DEMO_CNPJ,
      razaoSocial: "Farmácia Demonstração LTDA",
      fantasia: "Farmácia Demonstração",
      city: "São Paulo",
      state: "SP",
    },
    select: { id: true },
  });

  // A user is required as Patient.createdById; reuse a dedicated demo system user.
  // upsert (not findFirst+create) to be atomic — concurrent demo visits would
  // otherwise race and hit a P2002 unique violation on the email.
  const user = await prisma.user.upsert({
    where: { email: "demo-system@farma.app" },
    update: {},
    create: { email: "demo-system@farma.app", name: "Demonstração" },
    select: { id: true },
  });
  await prisma.membership.upsert({
    where: { userId_pharmacyId: { userId: user.id, pharmacyId: pharmacy.id } },
    update: {},
    create: { userId: user.id, pharmacyId: pharmacy.id, role: "OWNER", status: "ACTIVE" },
  });

  const patient = await prisma.patient.upsert({
    where: { pharmacyId_phone: { pharmacyId: pharmacy.id, phone: DEMO_PHONE } },
    update: { status: "ACTIVE" },
    create: {
      pharmacyId: pharmacy.id,
      phone: DEMO_PHONE,
      name: "Ana Demonstração",
      sex: "F",
      birthDate: new Date("1986-04-12"),
      allergies: ["Dipirona"],
      comorbidities: ["Hipertensão"],
      createdById: user.id,
      consentGiven: true,
      consentDate: new Date(),
      status: "ACTIVE",
    },
    select: { id: true },
  });

  // Seed some loyalty activity so points/tier/“atividade recente” look real.
  // Idempotent via the (reason, refType, refId) unique tuple.
  await awardPoints({ patientId: patient.id, delta: 850, reason: "adherence", refType: "demo", refId: "seed-1" }).catch(() => null);
  await awardPoints({ patientId: patient.id, delta: 420, reason: "affiliate_conversion", refType: "demo", refId: "seed-2" }).catch(() => null);
  // Complete the first available mission (if any) for a "done" badge.
  const firstMission = await prisma.mission.findFirst({ where: { active: true }, orderBy: { sortOrder: "asc" }, select: { code: true } });
  if (firstMission) await completeMission(patient.id, firstMission.code).catch(() => null);

  return patient.id;
}
