import { createHash, randomInt, timingSafeEqual } from "node:crypto";
import { prisma } from "@/lib/db";
import { sendWhatsApp } from "@/lib/whatsapp/client";
import { signPatientToken } from "@/lib/patient-token";

/**
 * Patient self-login via WhatsApp OTP. We never reveal whether a phone exists;
 * a code is only sent when a matching patient is found. Verification issues a
 * signed hub token (see lib/patient-token).
 */

const sha256 = (s: string) => createHash("sha256").update(s).digest("hex");
const TTL_MS = 10 * 60_000;
const MAX_ATTEMPTS = 5;

const PHONE_RE = /^\+\d{10,15}$/;
export const isValidPhone = (p: string) => PHONE_RE.test(p);

function safeEq(a: string, b: string) {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}

/** Generates + sends a 6-digit code if a patient with that phone exists. */
export async function requestPatientCode(phone: string): Promise<{ sent: boolean }> {
  const patient = await prisma.patient.findFirst({ where: { phone }, select: { id: true } });
  if (!patient) return { sent: false }; // do not leak existence

  const code = String(randomInt(0, 1_000_000)).padStart(6, "0");
  await prisma.patientLoginCode.create({
    data: { phone, codeHash: sha256(code), expiresAt: new Date(Date.now() + TTL_MS) },
  });
  const res = await sendWhatsApp({
    kind: "text",
    phone,
    text: `🔐 Seu código de acesso ao *Meu Prontuário* é *${code}*.\nVálido por 10 minutos. Não compartilhe.`,
    template: { key: "otp" },
  });
  // Observability: the OTP is the patient's only way in — log the outcome so a
  // delivery failure (provider/template) is visible in prod logs.
  // eslint-disable-next-line no-console
  console.log(`[otp] send result for ${phone}: ${res.status}${res.error ? ` — ${res.error}` : ""}${res.providerId ? ` (${res.providerId})` : ""}`);
  return { sent: true };
}

/** Verifies a code and, on success, returns a signed hub token. */
export async function verifyPatientCode(phone: string, code: string): Promise<{ ok: true; token: string; patientId: string } | { ok: false; error: string }> {
  const rec = await prisma.patientLoginCode.findFirst({
    where: { phone, consumedAt: null, expiresAt: { gt: new Date() } },
    orderBy: { createdAt: "desc" },
  });
  if (!rec) return { ok: false, error: "Código inválido ou expirado" };
  if (rec.attempts >= MAX_ATTEMPTS) return { ok: false, error: "Muitas tentativas — solicite um novo código" };

  if (!safeEq(rec.codeHash, sha256(code))) {
    await prisma.patientLoginCode.update({ where: { id: rec.id }, data: { attempts: rec.attempts + 1 } });
    return { ok: false, error: "Código incorreto" };
  }
  await prisma.patientLoginCode.update({ where: { id: rec.id }, data: { consumedAt: new Date() } });

  const patient = await prisma.patient.findFirst({ where: { phone }, orderBy: { updatedAt: "desc" }, select: { id: true } });
  if (!patient) return { ok: false, error: "Paciente não encontrado" };
  return { ok: true, token: signPatientToken(patient.id), patientId: patient.id };
}
