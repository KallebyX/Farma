import { NextResponse } from "next/server";
import { handleInbound } from "@/lib/whatsapp/handle";

/**
 * WhatsApp inbound webhook (Z-API or Meta Cloud API). Both providers have
 * different payloads — we accept a permissive shape and pull the fields we
 * need. If the secret is configured, validates a shared header.
 */
export async function POST(req: Request) {
  const expected = process.env.WHATSAPP_WEBHOOK_SECRET;
  if (expected) {
    const got = req.headers.get("x-webhook-secret");
    if (got !== expected) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = extractMessage(body);
  if (!parsed) {
    return NextResponse.json({ ok: true, ignored: true });
  }

  const result = await handleInbound(parsed);
  return NextResponse.json({ ok: true, dispatched: result.status });
}

type InboundShape = { phone: string; text?: string; buttonId?: string };

function extractMessage(body: unknown): InboundShape | null {
  if (typeof body !== "object" || body === null) return null;
  const b = body as Record<string, unknown>;

  // Z-API shape: { phone, text: { message }, buttonsResponseMessage: { buttonId } }
  const phone = stringOf(b.phone) ?? stringOf((b as { from?: unknown }).from);
  if (!phone) return null;

  const textObj = b.text;
  const text =
    typeof textObj === "string"
      ? textObj
      : typeof textObj === "object" && textObj !== null
        ? stringOf((textObj as { message?: unknown }).message)
        : undefined;

  const btn = (b.buttonsResponseMessage ?? b.button ?? null) as Record<string, unknown> | null;
  const buttonId = btn ? stringOf(btn.buttonId) ?? stringOf(btn.id) : undefined;

  return { phone, text, buttonId };
}

function stringOf(v: unknown): string | undefined {
  return typeof v === "string" && v.length > 0 ? v : undefined;
}
