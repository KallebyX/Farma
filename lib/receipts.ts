import { prisma } from "@/lib/db";
import { awardPoints } from "@/lib/loyalty/service";

/** NF-e/NFC-e receipts scanned by the patient → loyalty points. */

export const RECEIPT_POINTS = 20;

/** Extracts the 44-digit NF-e/NFC-e access key from a QR payload or URL. */
export function extractAccessKey(input: string): string | null {
  if (!input) return null;
  const inline = input.match(/\d{44}/)?.[0];
  if (inline) return inline;
  const digits = input.replace(/\D/g, "");
  return digits.length >= 44 ? digits.slice(0, 44) : null;
}

export async function registerReceipt(patientId: string, pharmacyId: string, code: string) {
  const key = extractAccessKey(code);
  if (!key) return { ok: false as const, status: 400, error: "QR inválido - esperado a chave de 44 dígitos da nota" };
  try {
    const receipt = await prisma.receipt.create({
      data: { patientId, pharmacyId, accessKey: key, rawUrl: code.slice(0, 500), pointsAwarded: RECEIPT_POINTS },
    });
    await awardPoints({ patientId, delta: RECEIPT_POINTS, reason: "receipt", refType: "receipt", refId: key });
    return { ok: true as const, points: RECEIPT_POINTS, receiptId: receipt.id };
  } catch (e) {
    if ((e as { code?: string })?.code === "P2002") return { ok: false as const, status: 409, error: "Esta nota já foi registrada" };
    throw e;
  }
}

export function listReceipts(patientId: string) {
  return prisma.receipt.findMany({
    where: { patientId },
    orderBy: { createdAt: "desc" },
    take: 50,
    select: { id: true, accessKey: true, pointsAwarded: true, createdAt: true },
  });
}
