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

import { getIntegrationConfig } from "@/lib/integration-config";

const ENV_PROVIDER = process.env.WHATSAPP_PROVIDER ?? "zapi"; // "zapi" | "meta" | "twilio" | "mock"
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

/** Flattens any outbound message to plain text (Twilio session messages). */
function asText(msg: WhatsAppOutbound): string {
  if (msg.kind === "buttons") return `${msg.text}\n${msg.buttons.map((b) => `• ${b.label}`).join("\n")}`;
  if (msg.kind === "list") return `${msg.text}\n${msg.items.map((i) => `• ${i.label}`).join("\n")}`;
  return msg.text;
}

type TwilioOpts = { from?: string | null; messagingServiceSid?: string | null; contentSid?: string | null };

async function sendViaTwilio(msg: WhatsAppOutbound, sid: string, token: string, opts: TwilioOpts): Promise<WhatsAppSendResult> {
  const body = new URLSearchParams();
  body.set("To", `whatsapp:+${digits(msg.phone)}`);
  // Prefer a Messaging Service (carries the approved WhatsApp sender); else a From number.
  if (opts.messagingServiceSid) body.set("MessagingServiceSid", opts.messagingServiceSid);
  else if (opts.from) body.set("From", opts.from.startsWith("whatsapp:") ? opts.from : `whatsapp:${opts.from}`);
  // Business-initiated WhatsApp requires an approved Content template; pass the
  // message text as variable {{1}}. Without a template we send plain Body
  // (works only inside the 24h session window / sandbox).
  if (opts.contentSid) {
    body.set("ContentSid", opts.contentSid);
    body.set("ContentVariables", JSON.stringify({ "1": asText(msg).slice(0, 1000) }));
  } else {
    body.set("Body", asText(msg));
  }
  try {
    const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization: "Basic " + Buffer.from(`${sid}:${token}`).toString("base64"),
      },
      body,
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      return { status: "FAILED", error: `HTTP ${res.status}: ${text.slice(0, 200)}` };
    }
    const json = (await res.json().catch(() => null)) as { sid?: string } | null;
    return { status: "SENT", providerId: json?.sid };
  } catch (err) {
    return { status: "FAILED", error: err instanceof Error ? err.message : String(err) };
  }
}

export async function sendWhatsApp(msg: WhatsAppOutbound): Promise<WhatsAppSendResult> {
  // DB config (set via MCP) overrides env — lets us activate without Vercel env.
  const cfg = await getIntegrationConfig();
  const provider = cfg.whatsappProvider ?? ENV_PROVIDER;

  if (provider === "twilio") {
    const sid = cfg.twilioAccountSid ?? process.env.TWILIO_ACCOUNT_SID;
    const token = cfg.twilioAuthToken ?? process.env.TWILIO_AUTH_TOKEN;
    const from = cfg.twilioWhatsappFrom ?? process.env.TWILIO_WHATSAPP_FROM;
    const messagingServiceSid = cfg.twilioMessagingServiceSid ?? process.env.TWILIO_MESSAGING_SERVICE_SID;
    const contentSid = cfg.twilioContentSid ?? process.env.TWILIO_CONTENT_SID;
    if (!sid || !token || (!from && !messagingServiceSid)) return mockLog("text", msg.phone, asText(msg));
    return sendViaTwilio(msg, sid, token, { from, messagingServiceSid, contentSid });
  }

  const isMock = provider === "mock" || !API_KEY || !INSTANCE_ID;

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
