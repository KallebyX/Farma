import { prisma } from "@/lib/db";
import { requestPatientCode, isValidPhone } from "@/lib/patient-auth";

/** Open patient self-registration + pharmacy discovery. */

export function searchPharmacies(q: string) {
  const query = q.trim();
  return prisma.pharmacy.findMany({
    where: query
      ? { OR: [{ fantasia: { contains: query, mode: "insensitive" } }, { razaoSocial: { contains: query, mode: "insensitive" } }, { cnpj: { contains: query.replace(/\D/g, "") } }] }
      : {},
    orderBy: { razaoSocial: "asc" },
    take: 20,
    select: { id: true, fantasia: true, razaoSocial: true, cnpj: true },
  });
}

/**
 * Registers (or re-links) a patient to the chosen pharmacy and sends a WhatsApp
 * OTP. The patient confirms via the existing /api/patient-auth/verify flow.
 * Self-registered patients are attributed to an active member of the pharmacy
 * (satisfies Patient.createdById) and carry explicit consent.
 */
export async function registerPatient(args: { name: string; phone: string; pharmacyId: string }) {
  const name = args.name?.trim() ?? "";
  if (name.length < 2) return { ok: false as const, error: "Informe seu nome completo" };
  if (!isValidPhone(args.phone)) return { ok: false as const, error: "Telefone inválido (use +55...)" };

  const pharmacy = await prisma.pharmacy.findUnique({ where: { id: args.pharmacyId }, select: { id: true } });
  if (!pharmacy) return { ok: false as const, error: "Farmácia não encontrada" };

  const member = await prisma.membership.findFirst({
    where: { pharmacyId: args.pharmacyId, status: "ACTIVE" },
    select: { userId: true },
  });
  if (!member) return { ok: false as const, error: "Farmácia indisponível no momento" };

  await prisma.patient.upsert({
    where: { pharmacyId_phone: { pharmacyId: args.pharmacyId, phone: args.phone } },
    update: { name: name.slice(0, 120) },
    create: {
      pharmacyId: args.pharmacyId, phone: args.phone, name: name.slice(0, 120),
      createdById: member.userId, consentGiven: true, consentDate: new Date(), status: "ACTIVE",
    },
  });

  await requestPatientCode(args.phone);
  return { ok: true as const };
}
