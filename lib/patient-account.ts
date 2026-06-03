import { prisma } from "@/lib/db";

/**
 * Phase 1→2 of the PRD: keep the global PatientAccount + PatientPharmacyLink model
 * in sync with the legacy pharmacy-scoped Patient rows. Given a Patient, ensures a
 * PatientAccount exists for its phone (the sovereign identity) and that it's linked
 * (M2M) to the patient's pharmacy. Best-effort and idempotent — never throws, so it
 * can be sprinkled into creation/link flows without risking the critical path. The
 * account model is groundwork for the future multi-pharmacy unification; nothing
 * reads from it for auth yet.
 */
export async function ensureAccountForPatient(patientId: string): Promise<void> {
  try {
    const p = await prisma.patient.findUnique({
      where: { id: patientId },
      select: { id: true, phone: true, name: true, pharmacyId: true, birthDate: true, sex: true },
    });
    if (!p) return;
    const account = await prisma.patientAccount.upsert({
      where: { phone: p.phone },
      update: {},
      create: { phone: p.phone, name: p.name, birthDate: p.birthDate, sex: p.sex, status: "ACTIVE" },
      select: { id: true },
    });
    await prisma.patientPharmacyLink.upsert({
      where: { accountId_pharmacyId: { accountId: account.id, pharmacyId: p.pharmacyId } },
      update: { patientId: p.id, status: "ACTIVE" },
      create: { accountId: account.id, pharmacyId: p.pharmacyId, patientId: p.id, status: "ACTIVE" },
    });
  } catch {
    // best-effort groundwork — never block the caller
  }
}

/**
 * One-shot idempotent backfill: creates a PatientAccount per distinct phone and a
 * PatientPharmacyLink per Patient row. Safe to re-run. Returns counts.
 */
export async function backfillPatientAccounts(): Promise<{ accounts: number; links: number }> {
  const patients = await prisma.patient.findMany({
    select: { id: true, phone: true, name: true, pharmacyId: true, birthDate: true, sex: true, updatedAt: true },
    orderBy: { updatedAt: "desc" },
  });
  const seenPhone = new Set<string>();
  for (const p of patients) {
    if (!seenPhone.has(p.phone)) {
      seenPhone.add(p.phone);
      await prisma.patientAccount.upsert({
        where: { phone: p.phone },
        update: {},
        create: { phone: p.phone, name: p.name, birthDate: p.birthDate, sex: p.sex, status: "ACTIVE" },
      });
    }
    await ensureAccountForPatient(p.id);
  }
  const [accounts, links] = await Promise.all([
    prisma.patientAccount.count(),
    prisma.patientPharmacyLink.count(),
  ]);
  return { accounts, links };
}
