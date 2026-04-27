import {
  PrismaClient,
  Role,
  DosageForm,
  PrescriptionStatus,
  AdherenceOutcome,
  RAMSeverity,
  RAMStatus,
  ConsentScope,
  ReturnStatus,
} from "@prisma/client";
import argon2 from "argon2";
import { randomBytes } from "node:crypto";

const prisma = new PrismaClient();

// Demo team password is read from DEMO_PASSWORD env var. If unset, a random
// one is generated and printed at the end of the seed. We never hardcode
// demo passwords in source — secrets in version control are an anti-pattern
// and trip security scanners.
const demoPasswordWasSupplied = Boolean(process.env.DEMO_PASSWORD);
const DEMO_PASSWORD = process.env.DEMO_PASSWORD ?? randomBytes(8).toString("base64url");

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

type SeedUser = {
  email: string;
  name: string;
  password: string;
  role: Role;
  crf?: string;
};

const TEAM: SeedUser[] = [
  { email: "owner@demo.farma",         name: "Maria Owner",        password: DEMO_PASSWORD, role: Role.OWNER },
  { email: "farmaceutico@demo.farma",  name: "João Farmacêutico",  password: DEMO_PASSWORD, role: Role.PHARMACIST, crf: "CRF-RS 12345" },
  { email: "atendente1@demo.farma",    name: "Ana Atendente",      password: DEMO_PASSWORD, role: Role.ATTENDANT },
  { email: "atendente2@demo.farma",    name: "Bruno Balconista",   password: DEMO_PASSWORD, role: Role.ATTENDANT },
  { email: "leitura@demo.farma",       name: "Lia Leitora",        password: DEMO_PASSWORD, role: Role.READONLY },
];

type SeedPatient = {
  name: string;
  phone: string;
  cpf?: string;
  birthYear: number;
  sex: "M" | "F";
  comorbidities: string[];
  prescriptions: { brandName: string; dosage: string; doseAmount: string; intervalHours?: number; fixedTimes?: string[]; durationDays?: number; quantityDispensed?: number; instructions?: string }[];
};

const PATIENTS: SeedPatient[] = [
  {
    name: "Maria Silva",
    phone: "+5511991110001",
    cpf: "12345678901",
    birthYear: 1965,
    sex: "F",
    comorbidities: ["Hipertensão", "Diabetes tipo 2"],
    prescriptions: [
      { brandName: "Losartana", dosage: "50mg", doseAmount: "1 cp", fixedTimes: ["08:00"], quantityDispensed: 60 },
      { brandName: "Glifage",   dosage: "850mg", doseAmount: "1 cp", fixedTimes: ["08:00", "20:00"], quantityDispensed: 60 },
    ],
  },
  {
    name: "João Souza",
    phone: "+5511991110002",
    birthYear: 1958,
    sex: "M",
    comorbidities: ["Hipertensão"],
    prescriptions: [
      { brandName: "Enalapril", dosage: "10mg", doseAmount: "1 cp", fixedTimes: ["08:00"], quantityDispensed: 30 },
    ],
  },
  {
    name: "Beatriz Lima",
    phone: "+5511991110003",
    cpf: "98765432101",
    birthYear: 1970,
    sex: "F",
    comorbidities: ["Hipotireoidismo"],
    prescriptions: [
      { brandName: "Puran T4", dosage: "50mcg", doseAmount: "1 cp", fixedTimes: ["07:00"], instructions: "em jejum, 30min antes do café", quantityDispensed: 30 },
    ],
  },
  {
    name: "Carlos Pereira",
    phone: "+5511991110004",
    birthYear: 1980,
    sex: "M",
    comorbidities: [],
    prescriptions: [
      { brandName: "Amoxil", dosage: "500mg", doseAmount: "1 cápsula", intervalHours: 8, durationDays: 7, quantityDispensed: 21 },
    ],
  },
  {
    // Polypharmacy patient — 5 active medications
    name: "Teresa Almeida",
    phone: "+5511991110005",
    birthYear: 1945,
    sex: "F",
    comorbidities: ["Hipertensão", "Osteoporose", "Hipotireoidismo", "Diabetes tipo 2", "Dislipidemia"],
    prescriptions: [
      { brandName: "Losartana", dosage: "50mg", doseAmount: "1 cp", fixedTimes: ["08:00"], quantityDispensed: 30 },
      { brandName: "Clorana",   dosage: "25mg", doseAmount: "1 cp", fixedTimes: ["08:00"], quantityDispensed: 30 },
      { brandName: "Puran T4",  dosage: "50mcg", doseAmount: "1 cp", fixedTimes: ["07:00"], instructions: "em jejum", quantityDispensed: 30 },
      { brandName: "Glifage",   dosage: "850mg", doseAmount: "1 cp", fixedTimes: ["08:00", "20:00"], quantityDispensed: 60 },
      { brandName: "Lipitor",   dosage: "20mg", doseAmount: "1 cp", fixedTimes: ["22:00"], quantityDispensed: 30 },
    ],
  },
];

async function main() {
  console.log("\n┌─ Seeding Farma demo data ──────────────────────────────");

  // ─── Pharmacy ────────────────────────────────────────────────
  const pharmacy = await prisma.pharmacy.upsert({
    where: { cnpj: "00000000000000" },
    update: {},
    create: {
      cnpj: "00000000000000",
      razaoSocial: "Farmácia Demo Ltda",
      fantasia: "Farmácia Demo",
    },
  });
  console.log(`│ Pharmacy: ${pharmacy.fantasia}`);

  // ─── Medication catalog ──────────────────────────────────────
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
  console.log(`│ Catalog: ${MEDICATIONS.length} medications`);

  // ─── Team (5 users covering all roles) ───────────────────────
  console.log("│");
  console.log("│ Team (all using DEMO_PASSWORD):");
  for (const u of TEAM) {
    const passwordHash = await argon2.hash(u.password);
    const user = await prisma.user.upsert({
      where: { email: u.email },
      update: { passwordHash },
      create: {
        email: u.email,
        name: u.name,
        passwordHash,
        emailVerified: new Date(),
        consentVersion: "1.0",
      },
    });
    await prisma.membership.upsert({
      where: { userId_pharmacyId: { userId: user.id, pharmacyId: pharmacy.id } },
      update: { role: u.role, crf: u.crf },
      create: {
        userId: user.id,
        pharmacyId: pharmacy.id,
        role: u.role,
        crf: u.crf,
      },
    });
    console.log(`│   ${u.role.padEnd(10)} ${u.email}`);
  }

  // ─── Optional personal OWNER from env vars ──────────────────
  if (process.env.OWNER_EMAIL && process.env.OWNER_PASSWORD) {
    const email = process.env.OWNER_EMAIL.toLowerCase().trim();
    const name = process.env.OWNER_NAME?.trim() || "Admin";
    const password = process.env.OWNER_PASSWORD;
    const passwordHash = await argon2.hash(password);

    const user = await prisma.user.upsert({
      where: { email },
      update: { passwordHash, name },
      create: {
        email,
        name,
        passwordHash,
        emailVerified: new Date(),
        consentVersion: "1.0",
      },
    });
    await prisma.membership.upsert({
      where: { userId_pharmacyId: { userId: user.id, pharmacyId: pharmacy.id } },
      update: { role: Role.OWNER, crf: process.env.OWNER_CRF },
      create: {
        userId: user.id,
        pharmacyId: pharmacy.id,
        role: Role.OWNER,
        crf: process.env.OWNER_CRF,
      },
    });
    console.log("│");
    console.log(`│ Personal OWNER (your account):`);
    console.log(`│   ${email}  /  password set from OWNER_PASSWORD env var`);
  } else {
    console.log("│");
    console.log("│ ℹ Para criar sua conta pessoal de OWNER, rode com:");
    console.log("│   OWNER_EMAIL=seu@email.com OWNER_NAME='Seu Nome' OWNER_PASSWORD=suasenha pnpm prisma db seed");
  }

  // ─── Patients + prescriptions ────────────────────────────────
  console.log("│");
  console.log("│ Patients:");
  const ownerMembership = await prisma.membership.findFirst({
    where: { pharmacyId: pharmacy.id, role: Role.OWNER },
  });
  const createdById = ownerMembership!.userId;

  for (const p of PATIENTS) {
    const birthDate = new Date(p.birthYear, 0, 1);
    const patient = await prisma.patient.upsert({
      where: { pharmacyId_phone: { pharmacyId: pharmacy.id, phone: p.phone } },
      update: { name: p.name, comorbidities: p.comorbidities },
      create: {
        pharmacyId: pharmacy.id,
        name: p.name,
        phone: p.phone,
        cpf: p.cpf,
        birthDate,
        sex: p.sex,
        comorbidities: p.comorbidities,
        createdById,
      },
    });

    // Service consent granted (so reminders are allowed)
    const existingConsent = await prisma.patientConsent.findFirst({
      where: { patientId: patient.id, scope: ConsentScope.SERVICE },
    });
    if (!existingConsent) {
      await prisma.patientConsent.create({
        data: {
          patientId: patient.id,
          scope: ConsentScope.SERVICE,
          granted: true,
          termsVersion: "1.0",
          source: "seed",
        },
      });
    }

    for (const rx of p.prescriptions) {
      const med = await prisma.medicationCatalog.findFirst({
        where: { brandName: rx.brandName, dosage: rx.dosage },
      });
      if (!med) continue;

      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 21); // started 3 weeks ago

      const existing = await prisma.prescription.findFirst({
        where: { patientId: patient.id, medicationId: med.id, status: PrescriptionStatus.ACTIVE },
      });
      if (existing) continue;

      const endDate = rx.durationDays
        ? new Date(startDate.getTime() + rx.durationDays * 86_400_000)
        : null;

      const prescription = await prisma.prescription.create({
        data: {
          patientId: patient.id,
          medicationId: med.id,
          doseAmount: rx.doseAmount,
          intervalHours: rx.intervalHours,
          fixedTimes: rx.fixedTimes ?? [],
          durationDays: rx.durationDays,
          quantityDispensed: rx.quantityDispensed,
          instructions: rx.instructions,
          startDate,
          endDate,
          createdById,
        },
      });

      // Backfill ~14 days of adherence events for realistic dashboard
      // Mix outcomes by patient to give visual variety:
      // Maria 87% (good), João 65% (mediocre), Beatriz 92% (great),
      // Carlos 50% (bad), Teresa 71% (mediocre, polypharmacy)
      const adherenceTargets: Record<string, number> = {
        "Maria Silva": 0.87,
        "João Souza": 0.65,
        "Beatriz Lima": 0.92,
        "Carlos Pereira": 0.5,
        "Teresa Almeida": 0.71,
      };
      const target = adherenceTargets[patient.name] ?? 0.8;

      const dosesPerDay = (rx.fixedTimes?.length ?? 0) || (24 / (rx.intervalHours ?? 24));
      const totalDoses = Math.floor(14 * dosesPerDay);
      for (let i = 0; i < totalDoses; i++) {
        const scheduledFor = new Date(Date.now() - (14 - Math.floor(i / dosesPerDay)) * 86_400_000);
        scheduledFor.setHours(8 + (i % dosesPerDay) * 6, 0, 0, 0);
        const outcome =
          Math.random() < target
            ? AdherenceOutcome.TAKEN
            : Math.random() < 0.5
              ? AdherenceOutcome.MISSED
              : AdherenceOutcome.REFUSED;
        await prisma.adherenceEvent.create({
          data: {
            prescriptionId: prescription.id,
            scheduledFor,
            respondedAt: outcome === AdherenceOutcome.MISSED ? null : scheduledFor,
            outcome,
          },
        });
      }
    }
    console.log(`│   ${p.name.padEnd(20)} (${p.prescriptions.length} rx, ${p.comorbidities.length} cond.)`);
  }

  // ─── 1 sample RAM in pending review ──────────────────────────
  const johnRx = await prisma.prescription.findFirst({
    where: { patient: { name: "João Souza" }, status: PrescriptionStatus.ACTIVE },
    include: { patient: true },
  });
  if (johnRx) {
    const existingRam = await prisma.rAMReport.findFirst({
      where: { patientId: johnRx.patientId, status: RAMStatus.PENDING_REVIEW },
    });
    if (!existingRam) {
      await prisma.rAMReport.create({
        data: {
          patientId: johnRx.patientId,
          prescriptionId: johnRx.id,
          symptoms: ["tosse seca", "tontura"],
          freeText: "Comecei a sentir tosse seca uns 4 dias depois de começar o remédio novo. Hoje passei mal de manhã.",
          severity: RAMSeverity.MODERATE,
          startedAt: new Date(Date.now() - 4 * 86_400_000),
          status: RAMStatus.PENDING_REVIEW,
        },
      });
      console.log("│");
      console.log("│ RAM: 1 caso pendente (João Souza)");
    }
  }

  // ─── 1 sample ReturnExpectation SCHEDULED ───────────────────
  const teresaShortRx = await prisma.prescription.findFirst({
    where: { patient: { name: "Teresa Almeida" }, quantityDispensed: 30 },
  });
  if (teresaShortRx) {
    const existing = await prisma.returnExpectation.findFirst({
      where: { prescriptionId: teresaShortRx.id },
    });
    if (!existing) {
      await prisma.returnExpectation.create({
        data: {
          prescriptionId: teresaShortRx.id,
          expectedAt: new Date(Date.now() + 2 * 86_400_000),
          status: ReturnStatus.SCHEDULED,
        },
      });
      console.log("│ Returns: 1 expectativa SCHEDULED (Teresa Almeida)");
    }
  }

  console.log("└────────────────────────────────────────────────────────");

  if (demoPasswordWasSupplied) {
    console.log("\n✓ Seed complete. Demo users password was loaded from DEMO_PASSWORD env var.\n");
  } else {
    // Don't echo the password to stdout — in CI/Actions logs this would leak
    // a credential into a persistent log line. Write it to a file the
    // operator can read locally instead.
    const fs = await import("node:fs/promises");
    const path = await import("node:path");
    const file = path.join(process.cwd(), ".seed-password");
    await fs.writeFile(file, DEMO_PASSWORD + "\n", { mode: 0o600 });
    console.log("\n⚠ DEMO_PASSWORD env var was not set.");
    console.log(`   A random password was generated and written to ${file}`);
    console.log("   (file is gitignored; mode 0600). Read it with: cat .seed-password");
    console.log("   To use a fixed password, re-run with: DEMO_PASSWORD='your-choice' pnpm prisma db seed\n");
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
