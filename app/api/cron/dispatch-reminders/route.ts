import { NextResponse } from "next/server";
import { dispatchDueReminders, materializeAllActive } from "@/lib/scheduler/dispatch";

export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = req.headers.get("authorization");
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }
  }

  const now = new Date();
  const materialized = await materializeAllActive(now);
  const summary = await dispatchDueReminders(now);
  return NextResponse.json({ ok: true, materialized, ...summary });
}
