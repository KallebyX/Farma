import { NextResponse } from "next/server";
import { runReturnsCron } from "@/lib/returns/dispatch";

export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = req.headers.get("authorization");
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }
  }

  const summary = await runReturnsCron();
  return NextResponse.json({ ok: true, ...summary });
}
