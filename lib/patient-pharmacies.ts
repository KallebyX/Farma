import { prisma } from "@/lib/db";
import { ensureAccountForPatient } from "@/lib/patient-account";

/**
 * Patient-facing multi-pharmacy linking for Meu Prontuário.
 *
 * Interim model: a patient's identity is their phone number. "Linking" a pharmacy
 * means there's a Patient row for that phone in that pharmacy. This lets a patient
 * connect to several pharmacies and see a usage ranking - without the full
 * PatientAccount/M2M refactor (PRD Phase 1), which will later unify these rows.
 */

export type LinkedPharmacy = {
  patientId: string;
  pharmacyId: string;
  name: string;
  chainName: string | null;
  city: string | null;
  state: string | null;
  points: number;
  lifetime: number;
  current: boolean;
};

/** Lists every pharmacy this patient (by phone) is linked to, ranked by usage. */
export async function listPatientPharmacies(currentPatientId: string): Promise<LinkedPharmacy[]> {
  const me = await prisma.patient.findUnique({ where: { id: currentPatientId }, select: { phone: true } });
  if (!me) return [];
  const rows = await prisma.patient.findMany({
    where: { phone: me.phone, status: { not: "WITHDRAWN" } },
    select: {
      id: true,
      pharmacyId: true,
      pharmacy: { select: { fantasia: true, razaoSocial: true, chainName: true, city: true, state: true } },
      loyalty: { select: { points: true, lifetime: true } },
    },
  });
  return rows
    .map((r) => ({
      patientId: r.id,
      pharmacyId: r.pharmacyId,
      name: r.pharmacy.fantasia ?? r.pharmacy.razaoSocial,
      chainName: r.pharmacy.chainName,
      city: r.pharmacy.city,
      state: r.pharmacy.state,
      points: r.loyalty?.points ?? 0,
      lifetime: r.loyalty?.lifetime ?? 0,
      current: r.id === currentPatientId,
    }))
    // Ranking: most-used (lifetime points) first; current pharmacy wins ties.
    .sort((a, b) => b.lifetime - a.lifetime || Number(b.current) - Number(a.current));
}

/** Links the patient (by phone) to another pharmacy, creating/reactivating the Patient row there. */
export async function linkPatientToPharmacy(
  currentPatientId: string,
  targetPharmacyId: string,
): Promise<{ ok: true; patientId: string; pharmacyName: string } | { ok: false; status: number; error: string }> {
  const me = await prisma.patient.findUnique({ where: { id: currentPatientId }, select: { phone: true, name: true } });
  if (!me) return { ok: false, status: 404, error: "Paciente não encontrado" };
  const pharmacy = await prisma.pharmacy.findUnique({ where: { id: targetPharmacyId }, select: { fantasia: true, razaoSocial: true } });
  if (!pharmacy) return { ok: false, status: 404, error: "Farmácia não encontrada" };
  const member = await prisma.membership.findFirst({ where: { pharmacyId: targetPharmacyId, status: "ACTIVE" }, select: { userId: true } });
  if (!member) return { ok: false, status: 409, error: "Farmácia indisponível no momento" };

  const patient = await prisma.patient.upsert({
    where: { pharmacyId_phone: { pharmacyId: targetPharmacyId, phone: me.phone } },
    update: { status: "ACTIVE", name: me.name },
    create: {
      pharmacyId: targetPharmacyId, phone: me.phone, name: me.name,
      createdById: member.userId, consentGiven: true, consentDate: new Date(), status: "ACTIVE",
    },
    select: { id: true },
  });
  await ensureAccountForPatient(patient.id);
  return { ok: true, patientId: patient.id, pharmacyName: pharmacy.fantasia ?? pharmacy.razaoSocial };
}

/** Unlinks (soft) a pharmacy from the patient. The currently-authenticated pharmacy can't be removed. */
export async function unlinkPatientFromPharmacy(
  currentPatientId: string,
  targetPatientId: string,
): Promise<{ ok: true } | { ok: false; status: number; error: string }> {
  if (targetPatientId === currentPatientId) return { ok: false, status: 400, error: "Não é possível desvincular a farmácia atual" };
  const [me, target] = await Promise.all([
    prisma.patient.findUnique({ where: { id: currentPatientId }, select: { phone: true } }),
    prisma.patient.findUnique({ where: { id: targetPatientId }, select: { phone: true } }),
  ]);
  if (!me || !target || me.phone !== target.phone) return { ok: false, status: 403, error: "Não autorizado" };
  await prisma.patient.update({ where: { id: targetPatientId }, data: { status: "WITHDRAWN" } });
  return { ok: true };
}
