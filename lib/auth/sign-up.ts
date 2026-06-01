import { Role } from "@prisma/client";
import argon2 from "argon2";
import { prisma } from "@/lib/db";
import type { SignUpInput } from "@/lib/auth/sign-up-schema";

const CONSENT_VERSION = "1.0";

export class SignUpError extends Error {
  status: number;
  field?: string;
  constructor(message: string, opts: { status?: number; field?: string } = {}) {
    super(message);
    this.status = opts.status ?? 400;
    this.field = opts.field;
  }
}

export type SignUpResult = {
  userId: string;
  pharmacyId: string;
  email: string;
};

export async function registerOwner(input: SignUpInput): Promise<SignUpResult> {
  const email = input.email.toLowerCase();

  const [existingUser, existingPharmacy] = await Promise.all([
    prisma.user.findUnique({ where: { email } }),
    prisma.pharmacy.findUnique({ where: { cnpj: input.cnpj } }),
  ]);

  if (existingUser) {
    throw new SignUpError("Já existe uma conta com esse email", { field: "email", status: 409 });
  }
  if (existingPharmacy) {
    throw new SignUpError("Já existe uma farmácia cadastrada com esse CNPJ", {
      field: "cnpj",
      status: 409,
    });
  }

  const passwordHash = await argon2.hash(input.password);

  return prisma.$transaction(async (tx) => {
    const pharmacy = await tx.pharmacy.create({
      data: {
        cnpj: input.cnpj,
        razaoSocial: input.razaoSocial,
        fantasia: input.fantasia ?? null,
      },
    });

    const user = await tx.user.create({
      data: {
        email,
        name: input.name,
        passwordHash,
        consentVersion: CONSENT_VERSION,
        emailVerified: new Date(),
      },
    });

    await tx.membership.create({
      data: {
        userId: user.id,
        pharmacyId: pharmacy.id,
        role: Role.OWNER,
      },
    });

    return { userId: user.id, pharmacyId: pharmacy.id, email };
  });
}
