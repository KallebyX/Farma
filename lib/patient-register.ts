import { prisma } from "@/lib/db";
import { requestPatientCode, isValidPhone } from "@/lib/patient-auth";
import { resolveReferrer, recordReferral } from "@/lib/referral";
import { saoJoaoRank } from "@/lib/pharmacy-rank";

/** Open patient self-registration + pharmacy discovery + referral support. */

export async function searchPharmacies(q: string) {
  const query = q.trim();
  const rows = await prisma.pharmacy.findMany({
    where: query
      ? { OR: [{ fantasia: { contains: query, mode: "insensitive" } }, { razaoSocial: { contains: query, mode: "insensitive" } }, { cnpj: { contains: query.replace(/\D/g, "") } }] }
      : {},
    orderBy: { razaoSocial: "asc" },
    take: 20,
    select: { id: true, fantasia: true, razaoSocial: true, cnpj: true, chainName: true },
  });
  // Rede São João sempre aparece em primeiro lugar na vitrine do paciente.
  return rows.sort((a, b) => saoJoaoRank(a) - saoJoaoRank(b));
}

/**
 * Registers (or re-links) a patient and sends a WhatsApp OTP. When `refCode`
 * resolves, the patient joins the referrer's pharmacy and the referrer is
 * rewarded; otherwise an explicit `pharmacyId` is required.
 */
export async function registerPatient(args: { name: string; phone: string; pharmacyId?: string; refCode?: string }) {
  const name = args.name?.trim() ?? "";
  if (name.length < 2) return { ok: false as const, error: "Informe seu nome completo" };
  if (!isValidPhone(args.phone)) return { ok: false as const, error: "Telefone inválido (use +55...)" };

  let pharmacyId = args.pharmacyId;
  const referrer = args.refCode ? await resolveReferrer(args.refCode) : null;
  if (referrer) pharmacyId = referrer.pharmacyId; // friend joins the referrer's pharmacy
  if (!pharmacyId) return { ok: false as const, error: "Escolha sua farmácia" };

  const pharmacy = await prisma.pharmacy.findUnique({ where: { id: pharmacyId }, select: { id: true } });
  if (!pharmacy) return { ok: false as const, error: "Farmácia não encontrada" };
  const member = await prisma.membership.findFirst({ where: { pharmacyId, status: "ACTIVE" }, select: { userId: true } });
  if (!member) return { ok: false as const, error: "Farmácia indisponível no momento" };

  const patient = await prisma.patient.upsert({
    where: { pharmacyId_phone: { pharmacyId, phone: args.phone } },
    update: { name: name.slice(0, 120) },
    create: {
      pharmacyId, phone: args.phone, name: name.slice(0, 120),
      createdById: member.userId, consentGiven: true, consentDate: new Date(), status: "ACTIVE",
    },
    select: { id: true },
  });

  if (referrer && referrer.id !== patient.id) {
    await recordReferral({ referredId: patient.id, referrerId: referrer.id, pharmacyId });
  }

  await requestPatientCode(args.phone);
  return { ok: true as const };
}
