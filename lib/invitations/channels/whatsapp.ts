import { roleLabel } from "@/lib/auth/permissions";
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
  const apiKey = process.env.WHATSAPP_API_KEY;
  const instanceId = process.env.WHATSAPP_INSTANCE_ID;
  const baseUrl = process.env.WHATSAPP_API_BASE_URL ?? "https://api.z-api.io";

  if (!apiKey || !instanceId) {
    return {
      status: "SKIPPED",
      providerId: waMeFallback(params.phone, message),
      error: "WhatsApp API não configurada — gerado link wa.me como fallback",
    };
  }

  try {
    const url = `${baseUrl}/instances/${instanceId}/token/${apiKey}/send-text`;
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        phone: params.phone.replace(/\D/g, ""),
        message,
      }),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      return { status: "FAILED", error: `HTTP ${res.status}: ${text.slice(0, 200)}` };
    }

    const json = (await res.json().catch(() => null)) as { messageId?: string; id?: string } | null;
    return { status: "SENT", providerId: json?.messageId ?? json?.id };
  } catch (err) {
    return {
      status: "FAILED",
      error: err instanceof Error ? err.message : String(err),
    };
  }
}
