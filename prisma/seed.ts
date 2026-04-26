import { PrismaClient, Role, DosageForm } from "@prisma/client";
import argon2 from "argon2";

const prisma = new PrismaClient();

const MEDICATIONS = [
  { activeIngredient: "Losartana Potássica", brandName: "Losartana", dosage: "50mg", form: DosageForm.TABLET, manufacturerName: "EMS", therapeuticClass: "Anti-hipertensivo" },
  { activeIngredient: "Losartana Potássica", brandName: "Cozaar", dosage: "50mg", form: DosageForm.TABLET, manufacturerName: "Merck Sharp & Dohme", therapeuticClass: "Anti-hipertensivo" },
  { activeIngredient: "Metformina", brandName: "Glifage", dosage: "850mg", form: DosageForm.TABLET, manufacturerName: "Merck", therapeuticClass: "Antidiabético" },
  { activeIngredient: "Metformina", brandName: "Glucoformin", dosage: "500mg", form: DosageForm.TABLET, manufacturerName: "Aché", therapeuticClass: "Antidiabético" },
  { activeIngredient: "Atorvastatina", brandName: "Lipitor", dosage: "20mg", form: DosageForm.TABLET, manufacturerName: "Pfizer", therapeuticClass: "Hipolipemiante" },
  { activeIngredient: "Sinvastatina", brandName: "Sinvascor", dosage: "20mg", form: DosageForm.TABLET, manufacturerName: "Biolab", therapeuticClass: "Hipolipemiante" },
  { activeIngredient: "Omeprazol", brandName: "Losec", dosage: "20mg", form: DosageForm.CAPSULE, manufacturerName: "AstraZeneca", therapeuticClass: "Antiulceroso" },
  { activeIngredient: "Hidroclorotiazida", brandName: "Clorana", dosage: "25mg", form: DosageForm.TABLET, manufacturerName: "Sanofi", therapeuticClass: "Diurético" },
  { activeIngredient: "Enalapril", brandName: "Renitec", dosage: "10mg", form: DosageForm.TABLET, manufacturerName: "Merck Sharp & Dohme", therapeuticClass: "Anti-hipertensivo" },
  { activeIngredient: "Levotiroxina Sódica", brandName: "Puran T4", dosage: "50mcg", form: DosageForm.TABLET, manufacturerName: "Sanofi", therapeuticClass: "Hormônio tireoidiano" },
  { activeIngredient: "Amoxicilina", brandName: "Amoxil", dosage: "500mg", form: DosageForm.CAPSULE, manufacturerName: "GSK", therapeuticClass: "Antibiótico" },
  { activeIngredient: "Dipirona Sódica", brandName: "Novalgina", dosage: "500mg", form: DosageForm.TABLET, manufacturerName: "Sanofi", therapeuticClass: "Analgésico" },
];

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

  for (const med of MEDICATIONS) {
    await prisma.medicationCatalog.upsert({
      where: {
        brandName_dosage_form_manufacturerCnpj: {
          brandName: med.brandName,
          dosage: med.dosage,
          form: med.form,
          manufacturerCnpj: "",
        },
      },
      update: {},
      create: { ...med, manufacturerCnpj: "" },
    });
  }

  console.log("Seeded:");
  console.log("  Pharmacy:", pharmacy.fantasia, `(${pharmacy.id})`);
  console.log("  Owner:   ", owner.email, "/ admin123");
  console.log("  Catalog: ", MEDICATIONS.length, "medications");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
