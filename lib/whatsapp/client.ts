/**
 * WhatsApp client. Wraps Z-API (default) or Meta Cloud API. Falls back to a
 * mock that just logs when credentials are missing — useful for dev/E2E.
 */

export type WhatsAppButton = {
  id: string;
  label: string;
};

export type WhatsAppOutbound =
  | { kind: "text"; phone: string; text: string }
  | { kind: "buttons"; phone: string; text: string; buttons: WhatsAppButton[] }
  | { kind: "list"; phone: string; text: string; sectionTitle: string; items: { id: string; label: string; description?: string }[] };

export type WhatsAppSendResult = {
  status: "SENT" | "FAILED" | "MOCK";
  providerId?: string;
  error?: string;
};

const PROVIDER = process.env.WHATSAPP_PROVIDER ?? "zapi"; // "zapi" | "meta" | "mock"
const API_KEY = process.env.WHATSAPP_API_KEY;
const INSTANCE_ID = process.env.WHATSAPP_INSTANCE_ID;
const BASE_URL = process.env.WHATSAPP_API_BASE_URL ?? "https://api.z-api.io";

function mockLog(kind: string, phone: string, text: string): WhatsAppSendResult {
  // eslint-disable-next-line no-console
  console.log(`[wa:mock] → ${phone} (${kind})\n${text}\n`);
  return { status: "MOCK", providerId: `mock-${Date.now()}` };
}

function digits(phone: string): string {
  return phone.replace(/\D/g, "");
}

export async function sendWhatsApp(msg: WhatsAppOutbound): Promise<WhatsAppSendResult> {
  const isMock = PROVIDER === "mock" || !API_KEY || !INSTANCE_ID;

  if (isMock) {
    if (msg.kind === "buttons") {
      const labels = msg.buttons.map((b) => `[${b.label}]`).join(" ");
      return mockLog("buttons", msg.phone, `${msg.text}\n${labels}`);
    }
    if (msg.kind === "list") {
      const labels = msg.items.map((i) => `• ${i.label}`).join("\n");
      return mockLog("list", msg.phone, `${msg.text}\n${labels}`);
    }
    return mockLog("text", msg.phone, msg.text);
  }

  // Z-API implementation (Meta Cloud API would be similar)
  try {
    const path = msg.kind === "buttons" ? "send-button-actions" : msg.kind === "list" ? "send-option-list" : "send-text";
    const url = `${BASE_URL}/instances/${INSTANCE_ID}/token/${API_KEY}/${path}`;

    let body: unknown;
    if (msg.kind === "text") {
      body = { phone: digits(msg.phone), message: msg.text };
    } else if (msg.kind === "buttons") {
      body = {
        phone: digits(msg.phone),
        message: msg.text,
        buttonActions: msg.buttons.map((b) => ({ id: b.id, label: b.label, type: "REPLY" })),
      };
    } else {
      body = {
        phone: digits(msg.phone),
        message: msg.text,
        optionList: {
          title: msg.sectionTitle,
          buttonLabel: "Selecionar",
          options: msg.items.map((i) => ({ id: i.id, title: i.label, description: i.description ?? "" })),
        },
      };
    }

    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      return { status: "FAILED", error: `HTTP ${res.status}: ${text.slice(0, 200)}` };
    }
    const json = (await res.json().catch(() => null)) as { messageId?: string; id?: string } | null;
    return { status: "SENT", providerId: json?.messageId ?? json?.id };
  } catch (err) {
    return { status: "FAILED", error: err instanceof Error ? err.message : String(err) };
  }
}
