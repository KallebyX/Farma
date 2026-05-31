import { NextResponse } from "next/server";
import { syncAllDue } from "@/lib/wearables/sync";

/** Cron: pull fresh samples for every connected OAuth wearable (Fitbit/Oura/…). */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = req.headers.get("authorization");
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }
  }
  const summary = await syncAllDue(200);
  return NextResponse.json({ ok: true, ...summary });
}
