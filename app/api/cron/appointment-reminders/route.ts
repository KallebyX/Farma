import { NextResponse } from "next/server";
import { dispatchAppointmentReminders } from "@/lib/appointments";

export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = req.headers.get("authorization");
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }
  }

  const summary = await dispatchAppointmentReminders(new Date());
  return NextResponse.json({ ok: true, ...summary });
}
