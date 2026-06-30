import { NextResponse } from "next/server";
import { z } from "zod";
import { authenticatePartner, hasScope } from "@/lib/partner/auth";
import { prisma } from "@/lib/db";
import { emitWebhook } from "@/lib/webhooks/dispatch";
import { getConnection, logSync, notifyEcosystem } from "@/lib/integrations/ecosystem";

export const dynamic = "force-dynamic";

/**
 * Partner Prescriptions API v1 — inbound clinic→pharmacy bridge.
 *
 * The AtendeBem clinical system (or any partner) pushes a prescription here using
 * the pharmacy's Bearer API key (scope `prescriptions:write`). We match/create
 * the patient by phone within the pharmacy, then store a DigitalPrescription as a
 * dispensation lead, tagged with its source + externalId so re-pushes are
 * idempotent and the dispensation status can later flow back to the clinic.
 */

const itemSchema = z.object({
  name: z.string().trim().min(1).max(200),
  dosage: z.string().trim().max(80).optional(),
  posology: z.string().trim().max(200).optional(),
  quantity: z.string().trim().max(40).optional(),
});

const pushSchema = z.object({
  externalId: z.string().trim().min(1).max(120),
  source: z.string().trim().max(40).default("atendebem"),
  patient: z.object({
    name: z.string().trim().min(2).max(120),
    phone: z.string().trim().regex(/^\+\d{10,15}$/, "telefone E.164"),
    cpf: z.string().trim().regex(/^\d{11}$/).optional(),
    birthDate: z.string().datetime().optional(),
  }),
  prescriber: z
    .object({
      name: z.string().trim().max(120).optional(),
      crm: z.string().trim().max(40).optional(),
    })
    .optional(),
  items: z.array(itemSchema).min(1).max(30),
  signed: z.boolean().optional(), // electronically signed at the clinic (ICP-Brasil)
  issuedAt: z.string().datetime().optional(),
});

export async function POST(req: Request) {
  const auth = await authenticatePartner(req);
  if (!auth || !hasScope(auth, "prescriptions:write")) {
    return NextResponse.json({ ok: false, error: "API key inválida ou sem escopo prescriptions:write" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "JSON inválido" }, { status: 400 });
  }
  const parsed = pushSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "Dados inválidos", issues: parsed.error.issues }, { status: 400 });
  }
  const d = parsed.data;
  const pharmacyId = auth.pharmacyId;

  // A partner key has no user; attribute patient creation to the first OWNER.
  const owner = await prisma.membership.findFirst({
    where: { pharmacyId, role: "OWNER", status: "ACTIVE" },
    orderBy: { joinedAt: "asc" },
    select: { userId: true },
  });
  if (!owner) return NextResponse.json({ ok: false, error: "Farmácia sem proprietário" }, { status: 409 });

  // 1) Match or create the patient by phone within this pharmacy.
  //    Writing patient IDENTITY (name/CPF/birthDate) is gated behind
  //    `patients:write` — a prescriptions-only key may link to an existing
  //    patient but must not create one or overwrite their identity/PII (LGPD).
  const canWritePatients = hasScope(auth, "patients:write");
  const existing = await prisma.patient.findUnique({
    where: { pharmacyId_phone: { pharmacyId, phone: d.patient.phone } },
    select: { id: true },
  });
  if (!existing && !canWritePatients) {
    return NextResponse.json(
      { ok: false, error: "Paciente não encontrado — criar exige o escopo patients:write" },
      { status: 403 },
    );
  }
  const patient = existing
    ? canWritePatients
      ? await prisma.patient.update({
          where: { id: existing.id },
          data: {
            name: d.patient.name,
            cpf: d.patient.cpf ?? undefined,
            birthDate: d.patient.birthDate ? new Date(d.patient.birthDate) : undefined,
          },
          select: { id: true },
        })
      : existing // link only — do not overwrite identity without patients:write
    : await prisma.patient.create({
        data: {
          pharmacyId,
          name: d.patient.name,
          phone: d.patient.phone,
          cpf: d.patient.cpf,
          birthDate: d.patient.birthDate ? new Date(d.patient.birthDate) : undefined,
          createdById: owner.userId,
        },
        select: { id: true },
      });

  // 2) Respect the pharmacy's auto-accept toggle for this partner.
  const conn = await getConnection(pharmacyId, "ATENDEBEM").catch(() => null);
  const autoAccept = conn?.autoAcceptPrescriptions ?? true;

  const summary = d.items
    .map((i) => [i.name, i.dosage, i.posology, i.quantity].filter(Boolean).join(" · "))
    .join("\n")
    .slice(0, 500);

  // 3) Upsert the digital prescription (idempotent on source+externalId).
  const rx = await prisma.digitalPrescription.upsert({
    where: {
      pharmacyId_source_externalId: { pharmacyId, source: d.source, externalId: d.externalId },
    },
    create: {
      patientId: patient.id,
      pharmacyId,
      source: d.source,
      externalId: d.externalId,
      fileKey: `external/${d.source}/${d.externalId}`,
      fileName: `Receita ${d.source === "atendebem" ? "AtendeBem" : d.source}`,
      mimeType: "application/json",
      sizeBytes: 0,
      signature: d.signed ? "VERIFIED_ICP" : "UNSIGNED",
      status: autoAccept ? "LEAD" : "SUBMITTED",
      crm: d.prescriber?.crm,
      signerName: d.prescriber?.name,
      issuedAt: d.issuedAt ? new Date(d.issuedAt) : undefined,
      notes: summary,
    },
    update: {
      patientId: patient.id,
      crm: d.prescriber?.crm,
      signerName: d.prescriber?.name,
      issuedAt: d.issuedAt ? new Date(d.issuedAt) : undefined,
      notes: summary,
    },
    select: { id: true, status: true },
  });

  // 4) Observability + downstream notifications (best-effort).
  void logSync({
    pharmacyId,
    partner: "ATENDEBEM",
    direction: "INBOUND",
    event: "prescription.received",
    ok: true,
    detail: `${d.items.length} item(ns) · paciente ${d.patient.name}`,
    externalId: d.externalId,
  });
  if (!existing) {
    void emitWebhook(pharmacyId, "patient.created", { patientId: patient.id, phone: d.patient.phone });
    void notifyEcosystem(pharmacyId, "patient.linked", { id: patient.id, name: d.patient.name });
  }

  return NextResponse.json(
    { ok: true, data: { id: rx.id, status: rx.status, patientId: patient.id }, created: !existing },
    { status: 201 },
  );
}
