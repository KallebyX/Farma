import { prisma } from "@/lib/db";
import { buildExamKey, uploadObject, storageConfigured, EXAM_MAX_BYTES } from "@/lib/storage";
import { detectSignature } from "@/lib/icp-brasil";
import { notifyEcosystem } from "@/lib/integrations/ecosystem";

/** Digital prescriptions + dispensation (Phase 8 foundation). */

const RX_ALLOWED = new Set([
  "application/pdf", "image/jpeg", "image/png", "image/heic", "image/heif", "image/webp",
  "application/pkcs7-signature", "application/x-pkcs7-signature", "application/cms",
]);

const rxSelect = {
  id: true, fileName: true, mimeType: true, sizeBytes: true, signature: true,
  signerName: true, crm: true, status: true, notes: true, createdAt: true,
} as const;

export async function createPrescriptionFromFile(args: { patientId: string; pharmacyId: string; file: File; notes?: string | null }) {
  if (!storageConfigured()) return { ok: false as const, status: 503, error: "Armazenamento não configurado (SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY)" };
  const { file } = args;
  if (!(file instanceof File) || file.size === 0) return { ok: false as const, status: 400, error: "Arquivo obrigatório" };
  if (file.size > EXAM_MAX_BYTES) return { ok: false as const, status: 413, error: "Arquivo acima de 10 MB" };
  if (file.type && !RX_ALLOWED.has(file.type) && !file.name.toLowerCase().endsWith(".p7s")) {
    return { ok: false as const, status: 415, error: "Envie PDF, imagem ou .p7s" };
  }

  const bytes = new Uint8Array(await file.arrayBuffer());
  const sig = detectSignature(bytes, file.type, file.name);
  const key = `rx/${buildExamKey(args.pharmacyId, args.patientId, file.name)}`;
  const up = await uploadObject(key, bytes, file.type || "application/octet-stream");
  if (!up.ok) return { ok: false as const, status: 502, error: "Falha ao enviar o arquivo" };

  const rx = await prisma.digitalPrescription.create({
    data: {
      patientId: args.patientId, pharmacyId: args.pharmacyId,
      fileKey: key, fileName: file.name.slice(0, 200), mimeType: file.type || "application/octet-stream", sizeBytes: file.size,
      signature: sig.signed ? "SIGNED_DETECTED" : "UNSIGNED",
      // A signed (qualified) prescription is immediately offered to the pharmacy as a lead.
      status: sig.signed ? "LEAD" : "SUBMITTED",
      notes: args.notes?.slice(0, 500) ?? sig.note,
    },
    select: rxSelect,
  });
  return { ok: true as const, prescription: rx, signatureNote: sig.note };
}

export function listForPatient(patientId: string) {
  return prisma.digitalPrescription.findMany({ where: { patientId }, orderBy: { createdAt: "desc" }, take: 50, select: rxSelect });
}

/** Prescriptions awaiting the pharmacy (leads + just-submitted), newest first. */
export function listLeads(pharmacyId: string) {
  return prisma.digitalPrescription.findMany({
    where: { pharmacyId, status: { in: ["SUBMITTED", "LEAD"] } },
    orderBy: { createdAt: "desc" }, take: 100,
    select: { ...rxSelect, patient: { select: { id: true, name: true, phone: true } } },
  });
}

export function recentDispensations(pharmacyId: string) {
  return prisma.dispensation.findMany({
    where: { pharmacyId }, orderBy: { createdAt: "desc" }, take: 50,
    select: { id: true, medication: true, batchLot: true, quantity: true, nfeAccessKey: true, crm: true, sngpcStatus: true, createdAt: true, patient: { select: { name: true } } },
  });
}

export async function dispense(args: {
  prescriptionId?: string | null; patientId: string; pharmacyId: string;
  medication: string; batchLot?: string | null; quantity?: number; nfeAccessKey?: string | null; crm?: string | null; dispensedBy?: string;
  controlled?: boolean;
}) {
  if (!args.medication?.trim()) return { ok: false as const, error: "Informe o medicamento" };
  const d = await prisma.dispensation.create({
    data: {
      prescriptionId: args.prescriptionId ?? null, patientId: args.patientId, pharmacyId: args.pharmacyId,
      medication: args.medication.trim().slice(0, 160), batchLot: args.batchLot?.slice(0, 60) ?? null,
      quantity: Number.isFinite(args.quantity) && (args.quantity ?? 0) > 0 ? Math.floor(args.quantity!) : 1,
      nfeAccessKey: args.nfeAccessKey?.replace(/\D/g, "").slice(0, 44) || null,
      crm: args.crm?.slice(0, 40) ?? null, dispensedBy: args.dispensedBy ?? null,
      // Controlled drugs are queued for SNGPC transmission (gated until credentials exist).
      sngpcStatus: args.controlled ? "PENDING" : "NA",
    },
    select: { id: true },
  });
  if (args.prescriptionId) {
    await prisma.digitalPrescription.updateMany({ where: { id: args.prescriptionId, pharmacyId: args.pharmacyId }, data: { status: "DISPENSED" } });
  }
  // Tell the ecosystem (AtendeBem clinic + Meu Prontuário patient app) the drug
  // was picked up — closes the loop on the prescription. Best-effort.
  void notifyEcosystem(args.pharmacyId, "prescription.dispensed", {
    id: d.id,
    prescriptionId: args.prescriptionId ?? null,
    patientId: args.patientId,
    medication: args.medication.trim().slice(0, 160),
    quantity: Number.isFinite(args.quantity) && (args.quantity ?? 0) > 0 ? Math.floor(args.quantity!) : 1,
    crm: args.crm ?? null,
  });
  return { ok: true as const, dispensationId: d.id };
}
