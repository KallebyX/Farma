import { roleLabel } from "@/lib/auth/permissions";
import { sendWhatsApp } from "@/lib/whatsapp/client";
import type { Role } from "@prisma/client";

export type WhatsAppDeliveryResult = {
  status: "SENT" | "FAILED" | "SKIPPED";
  providerId?: string;
  error?: string;
};

type WhatsAppParams = {
  phone: string;
  pharmacyName: string;
  role: Role;
  inviterName: string;
  inviteUrl: string;
};

function buildMessage(p: WhatsAppParams): string {
  return [
    `Olá! ${p.inviterName} convidou você para a equipe da *${p.pharmacyName}* como ${roleLabel(p.role)}.`,
    "",
    "Para aceitar e criar sua senha, abra:",
    p.inviteUrl,
    "",
    "Esse convite expira em 7 dias.",
  ].join("\n");
}

function waMeFallback(phone: string, message: string): string {
  const digits = phone.replace(/\D/g, "");
  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
}

export async function sendInviteWhatsApp(params: WhatsAppParams): Promise<WhatsAppDeliveryResult> {
  const message = buildMessage(params);
  // Send through the unified WhatsApp client (Twilio/Z-API per IntegrationConfig).
  // The invite is business-initiated, so it needs an approved template on the WABA;
  // we pass the "generic" key. If the provider isn't configured (MOCK) or the send
  // fails (e.g. no approved template), we degrade to a wa.me click-to-send link.
  try {
    const res = await sendWhatsApp({ kind: "text", phone: params.phone, text: message, template: { key: "generic" } });
    if (res.status === "SENT") return { status: "SENT", providerId: res.providerId };
    return {
      status: "SKIPPED",
      providerId: waMeFallback(params.phone, message),
      error: res.error
        ? `Envio automático indisponível (${res.error}) - gerado link wa.me`
        : "WhatsApp não configurado - gerado link wa.me como fallback",
    };
  } catch (err) {
    return {
      status: "SKIPPED",
      providerId: waMeFallback(params.phone, message),
      error: `Falha no envio (${err instanceof Error ? err.message : String(err)}) - gerado link wa.me`,
    };
  }
}
