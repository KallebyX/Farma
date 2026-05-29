import argon2 from "argon2";
import { z } from "zod";
import { Role } from "@prisma/client";
import { prisma } from "@/lib/db";

/** Current terms/consent version captured at signup. */
export const TERMS_VERSION = "1.0";

export class RegisterConflictError extends Error {
  status = 409;
  field?: "email" | "cnpj";
  constructor(message: string, field?: "email" | "cnpj") {
    super(message);
    this.field = field;
  }
}

const digits = (v: string) => v.replace(/\D/g, "");

export const registerSchema = z.object({
  pharmacyName: z.string().trim().min(2, "Informe a razão social").max(160),
  fantasia: z.string().trim().max(120).optional().or(z.literal("")),
  cnpj: z
    .string()
    .transform(digits)
    .refine((v) => v.length === 14, "CNPJ deve ter 14 dígitos"),
  name: z.string().trim().min(2, "Nome muito curto").max(120),
  email: z.string().trim().toLowerCase().email("Email inválido"),
  password: z.string().min(8, "Mínimo 8 caracteres").max(200),
  consent: z.literal(true, { errorMap: () => ({ message: "É necessário aceitar os termos" }) }),
});

export type RegisterInput = z.infer<typeof registerSchema>;

export type RegisterResult = {
  userId: string;
  pharmacyId: string;
  email: string;
};

/**
 * Creates a brand-new tenant: a Pharmacy plus its first OWNER user, atomically.
 * The user becomes the owner of the pharmacy. Used by the self-service signup
 * flow so new pharmacies can onboard without manual seeding.
 */
export async function registerAccount(input: RegisterInput): Promise<RegisterResult> {
  const email = input.email.toLowerCase();
  const cnpj = digits(input.cnpj);

  const [existingUser, existingPharmacy] = await Promise.all([
    prisma.user.findUnique({ where: { email }, select: { id: true } }),
    prisma.pharmacy.findUnique({ where: { cnpj }, select: { id: true } }),
  ]);
  if (existingUser) {
    throw new RegisterConflictError("Já existe uma conta com este email", "email");
  }
  if (existingPharmacy) {
    throw new RegisterConflictError("Já existe uma farmácia com este CNPJ", "cnpj");
  }

  const passwordHash = await argon2.hash(input.password);
  const fantasia = input.fantasia?.trim() ? input.fantasia.trim() : null;

  return prisma.$transaction(async (tx) => {
    const pharmacy = await tx.pharmacy.create({
      data: { cnpj, razaoSocial: input.pharmacyName, fantasia },
    });
    const user = await tx.user.create({
      data: {
        email,
        name: input.name,
        passwordHash,
        consentVersion: TERMS_VERSION,
      },
    });
    await tx.membership.create({
      data: { userId: user.id, pharmacyId: pharmacy.id, role: Role.OWNER },
    });
    return { userId: user.id, pharmacyId: pharmacy.id, email };
  });
}
