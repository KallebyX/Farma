import { PrismaClient, Role } from "@prisma/client";
import argon2 from "argon2";

const prisma = new PrismaClient();

async function main() {
  const pharmacy = await prisma.pharmacy.upsert({
    where: { cnpj: "00000000000000" },
    update: {},
    create: {
      cnpj: "00000000000000",
      razaoSocial: "Farmácia Demo Ltda",
      fantasia: "Farmácia Demo",
    },
  });

  const passwordHash = await argon2.hash("admin123");

  const owner = await prisma.user.upsert({
    where: { email: "owner@demo.farma" },
    update: { passwordHash },
    create: {
      email: "owner@demo.farma",
      name: "Maria Owner",
      passwordHash,
      emailVerified: new Date(),
      consentVersion: "1.0",
    },
  });

  await prisma.membership.upsert({
    where: { userId_pharmacyId: { userId: owner.id, pharmacyId: pharmacy.id } },
    update: { role: Role.OWNER },
    create: {
      userId: owner.id,
      pharmacyId: pharmacy.id,
      role: Role.OWNER,
      crf: "CRF-RS 12345",
    },
  });

  console.log("Seeded:");
  console.log("  Pharmacy:", pharmacy.fantasia, `(${pharmacy.id})`);
  console.log("  Owner:   ", owner.email, "/ admin123");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
