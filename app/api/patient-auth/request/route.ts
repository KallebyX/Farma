import { NextResponse } from "next/server";
import { requestPatientCode, isValidPhone } from "@/lib/patient-auth";
import { patientOtpRateLimit } from "@/lib/rate-limit";

/** POST /api/patient-auth/request { phone } - sends a WhatsApp OTP. */
export async function POST(req: Request) {
  let body: { phone?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "JSON inválido" }, { status: 400 });
  }
  const phone = (body.phone ?? "").trim();
  if (!isValidPhone(phone)) {
    return NextResponse.json({ ok: false, error: "Telefone inválido (use formato +55...)" }, { status: 400 });
  }

  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const rl = await patientOtpRateLimit.limit(`otp:${phone}:${ip}`);
  if (!rl.success) {
    return NextResponse.json({ ok: false, error: "Muitas solicitações - aguarde um minuto" }, { status: 429 });
  }

  await requestPatientCode(phone);
  // Always ok (don't reveal whether the phone is registered).
  return NextResponse.json({ ok: true });
}
