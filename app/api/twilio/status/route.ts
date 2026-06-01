import { NextResponse } from "next/server";

/**
 * Twilio delivery-status webhook. Twilio POSTs here (application/x-www-form-urlencoded)
 * each time a message's status changes: queued → sent → delivered/undelivered (+ ErrorCode).
 * We only log it so non-delivery (e.g. 63016 template not approved, 63024, 131026) is
 * visible in prod runtime logs. No state is mutated, so we don't hard-require signature
 * validation here; the body is treated as untrusted and only logged.
 */
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const form = await req.formData();
    const get = (k: string) => {
      const v = form.get(k);
      return typeof v === "string" ? v : "";
    };
    const sid = get("MessageSid") || get("SmsSid");
    const status = get("MessageStatus") || get("SmsStatus");
    const errorCode = get("ErrorCode");
    const to = get("To");
    const from = get("From");
    const channel = get("ChannelInstallSid") || "";
    // eslint-disable-next-line no-console
    console.log(
      `[wa:status] ${sid} ${status}${errorCode ? ` ErrorCode=${errorCode}` : ""} to=${to} from=${from}${channel ? ` ch=${channel}` : ""}`,
    );
  } catch {
    // eslint-disable-next-line no-console
    console.error("[wa:status] failed to parse Twilio status callback");
  }
  // Twilio ignores the body; just acknowledge.
  return new NextResponse(null, { status: 204 });
}
