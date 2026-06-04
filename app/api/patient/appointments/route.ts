import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyPatientToken } from "@/lib/patient-token";
import { listForPatient } from "@/lib/appointments";

/** GET /api/patient/appointments - the patient's own appointments (hub token). */
export async function GET(req: Request) {
  try {
    const auth = req.headers.get("authorization");
    const bearer = auth?.startsWith("Bearer ") ? auth.slice(7) : null;
    const cookieToken = (await cookies()).get("mp_hub")?.value ?? null;
    const patientId = verifyPatientToken(bearer ?? cookieToken);
    if (!patientId) return NextResponse.json({ ok: false, error: "Sessão inválida" }, { status: 401 });
    const appointments = await listForPatient(patientId);
    return NextResponse.json({ ok: true, appointments });
  } catch {
    return NextResponse.json({ ok: false, error: "Erro" }, { status: 500 });
  }
}
