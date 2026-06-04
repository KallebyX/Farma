import { NextResponse } from "next/server";
import { verifyPatientCode, isValidPhone } from "@/lib/patient-auth";

/** POST /api/patient-auth/verify { phone, code } - verifies OTP → hub token + cookie. */
export async function POST(req: Request) {
  let body: { phone?: string; code?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "JSON inválido" }, { status: 400 });
  }
  const phone = (body.phone ?? "").trim();
  const code = (body.code ?? "").trim();
  if (!isValidPhone(phone) || !/^\d{6}$/.test(code)) {
    return NextResponse.json({ ok: false, error: "Dados inválidos" }, { status: 400 });
  }

  const result = await verifyPatientCode(phone, code);
  if (!result.ok) return NextResponse.json({ ok: false, error: result.error }, { status: 401 });

  const res = NextResponse.json({ ok: true, token: result.token, url: `/hub/${result.token}` });
  res.cookies.set("mp_hub", result.token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 90,
  });
  return res;
}
