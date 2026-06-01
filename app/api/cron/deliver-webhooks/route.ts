import { NextResponse } from "next/server";
import { deliverPending } from "@/lib/webhooks/dispatch";

/** Cron: retry pending/failed outbound webhook deliveries. */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = req.headers.get("authorization");
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }
  }
  const { attempted, ok: delivered, failed } = await deliverPending(100);
  return NextResponse.json({ ok: true, attempted, delivered, failed });
}
