import { NextResponse } from "next/server";
import { verifyPatientToken } from "@/lib/patient-token";
import { completeMission } from "@/lib/loyalty/service";

/** POST /api/loyalty/mission { token, code } — completes a mission for the patient. */
export async function POST(req: Request) {
  let body: { token?: string; code?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "JSON inválido" }, { status: 400 });
  }
  const patientId = verifyPatientToken(body.token);
  if (!patientId) return NextResponse.json({ ok: false, error: "Sessão inválida" }, { status: 401 });
  if (!body.code) return NextResponse.json({ ok: false, error: "code obrigatório" }, { status: 400 });

  const result = await completeMission(patientId, body.code);
  if (!result.ok) return NextResponse.json({ ok: false, error: result.error }, { status: 409 });
  return NextResponse.json({ ok: true, points: result.points, balance: result.account?.points });
}
