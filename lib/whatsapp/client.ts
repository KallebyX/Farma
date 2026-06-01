/**
 * WhatsApp client. Wraps Z-API (default) or Meta Cloud API or Twilio. Falls back
 * to a mock that just logs when credentials are missing — useful for dev/E2E.
 *
 * Business-initiated WhatsApp (Twilio) requires an approved Content template.
 * Each outbound message may carry a `template` hint (a logical key like "otp"
 * or "reminder"); the Twilio path resolves that key to an approved ContentSid
 * via the DB config (IntegrationConfig.twilioTemplates) so the right WhatsApp
 * template category is used per message type (e.g. authentication vs utility).
 */

export type WhatsAppButton = {
  id: string;
  label: string;
};

/** Logical template categories. Each maps to an approved Twilio ContentSid in config. */
export type TemplateKey =
  | "otp"
  | "welcome"
  | "reminder"
  | "return"
  | "appointment"
  | "appointment_reminder"
  | "generic";

export type TemplateHint = {
  key: TemplateKey;
  /** Optional explicit ContentVariables. When omitted, the rendered text is sent as {{1}}. */
  variables?: Record<string, string>;
};

type Base = { phone: string; template?: TemplateHint };

export type WhatsAppOutbound =
  | (Base & { kind: "text"; text: string })
  | (Base & { kind: "buttons"; text: string; buttons: WhatsAppButton[] })
  | (Base & { kind: "list"; text: string; sectionTitle: string; items: { id: string; label: string; description?: string }[] });

export type WhatsAppSendResult = {
  status: "SENT" | "FAILED" | "MOCK";
  providerId?: string;
  error?: string;
};

import { getIntegrationConfig, resolveTemplateSid } from "@/lib/integration-config";

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

/** Flattens any outbound message to plain text (Twilio session messages / template {{1}}). */
export function asText(msg: WhatsAppOutbound): string {
  if (msg.kind === "buttons") return `${msg.text}\n${msg.buttons.map((b) => `• ${b.label}`).join("\n")}`;
  if (msg.kind === "list") return `${msg.text}\n${msg.items.map((i) => `• ${i.label}`).join("\n")}`;
  return msg.text;
}

export type TwilioFormOpts = {
  from?: string | null;
  messagingServiceSid?: string | null;
  /** Generic fallback template (used when the message has no keyed template). */
  contentSid?: string | null;
  /** Already-resolved ContentSid for this message's template key (takes precedence). */
  templateSid?: string | null;
  /** Absolute URL Twilio POSTs delivery status to (sent/delivered/undelivered + ErrorCode). */
  statusCallback?: string | null;
};

/**
 * Pure helper: builds the Twilio Messages API form body for a WhatsApp send.
 * Kept side-effect free so the From/MessagingService and template/Body branching
 * can be unit-tested without Twilio credentials.
 */
export function buildTwilioForm(msg: WhatsAppOutbound, opts: TwilioFormOpts): URLSearchParams {
  const body = new URLSearchParams();
  body.set("To", `whatsapp:+${digits(msg.phone)}`);
  // Prefer a Messaging Service (carries the approved WhatsApp sender); else a From number.
  if (opts.messagingServiceSid) body.set("MessagingServiceSid", opts.messagingServiceSid);
  else if (opts.from) body.set("From", opts.from.startsWith("whatsapp:") ? opts.from : `whatsapp:${opts.from}`);

  // A keyed template SID wins over the generic one. Both are business-initiated.
  const sid = opts.templateSid || opts.contentSid;
  if (sid) {
    body.set("ContentSid", sid);
    const explicit = msg.template?.variables;
    const vars = explicit && Object.keys(explicit).length > 0 ? explicit : { "1": asText(msg).slice(0, 1000) };
    body.set("ContentVariables", JSON.stringify(vars));
  } else {
    // No template configured: plain Body (works only inside the 24h session window / sandbox).
    body.set("Body", asText(msg));
  }
  // Ask Twilio to POST delivery-status updates so undelivered/failed (+ ErrorCode)
  // are observable in prod (the create-call only reports the initial "queued").
  if (opts.statusCallback) body.set("StatusCallback", opts.statusCallback);
  return body;
}

async function sendViaTwilio(
  msg: WhatsAppOutbound,
  sid: string,
  token: string,
  opts: TwilioFormOpts,
): Promise<WhatsAppSendResult> {
  const body = buildTwilioForm(msg, opts);
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
      // Surface the Twilio error in prod logs — the most common causes are an
      // unapproved template, a freeform Body outside the 24h window, or
      // ContentVariables that don't match the template's placeholders.
      const usedTemplate = body.get("ContentSid") ?? "(Body)";
      // eslint-disable-next-line no-console
      console.error(`[wa:twilio] send FAILED → ${msg.phone} via ${usedTemplate}: HTTP ${res.status} ${text.slice(0, 300)}`);
      return { status: "FAILED", error: `HTTP ${res.status}: ${text.slice(0, 200)}` };
    }
    const json = (await res.json().catch(() => null)) as { sid?: string } | null;
    return { status: "SENT", providerId: json?.sid };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    // eslint-disable-next-line no-console
    console.error(`[wa:twilio] send threw → ${msg.phone}: ${message}`);
    return { status: "FAILED", error: message };
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
    // Resolve the message's keyed template (e.g. "otp" → authentication template SID).
    const templateSid = msg.template ? resolveTemplateSid(cfg, msg.template.key) : null;
    // Delivery-status webhook (absolute URL). Lets us see undelivered/ErrorCode in logs.
    const base = process.env.APP_URL?.replace(/\/$/, "");
    const statusCallback = base ? `${base}/api/twilio/status` : null;
    return sendViaTwilio(msg, sid, token, { from, messagingServiceSid, contentSid, templateSid, statusCallback });
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
