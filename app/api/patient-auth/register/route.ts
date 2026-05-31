import { NextResponse } from "next/server";
import { registerPatient } from "@/lib/patient-register";
import { patientOtpRateLimit } from "@/lib/rate-limit";

/** POST /api/patient-auth/register { name, phone, pharmacyId?, ref? } — self-signup + OTP. */
export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as { name?: string; phone?: string; pharmacyId?: string; ref?: string };
  const name = (body.name ?? "").trim();
  const phone = (body.phone ?? "").trim();
  const pharmacyId = body.pharmacyId?.trim() || undefined;
  const refCode = body.ref?.trim() || undefined;
  if (!name || !phone) return NextResponse.json({ ok: false, error: "Preencha nome e telefone" }, { status: 400 });

  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const rl = await patientOtpRateLimit.limit(`register:${phone}:${ip}`);
  if (!rl.success) return NextResponse.json({ ok: false, error: "Muitas tentativas — aguarde um minuto" }, { status: 429 });

  const result = await registerPatient({ name, phone, pharmacyId, refCode });
  if (!result.ok) return NextResponse.json({ ok: false, error: result.error }, { status: 400 });
  return NextResponse.json({ ok: true });
}
