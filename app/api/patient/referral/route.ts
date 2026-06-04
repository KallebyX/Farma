import { NextResponse } from "next/server";
import { resolvePatientFromRequest } from "@/lib/patient-session";
import { referralStats } from "@/lib/referral";

/** GET /api/patient/referral - the patient's referral code, link and earnings. */
export async function GET(req: Request) {
  try {
    const p = await resolvePatientFromRequest(req);
    if (!p) return NextResponse.json({ ok: false, error: "Sessão inválida" }, { status: 401 });
    const stats = await referralStats(p.id);
    return NextResponse.json({ ok: true, ...stats });
  } catch {
    return NextResponse.json({ ok: false, error: "Erro" }, { status: 500 });
  }
}
