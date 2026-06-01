import { getPatientFromBearer } from "@/lib/api/v1/auth";
import { paginated, fail, preflight } from "@/lib/api/v1/respond";
import { listForPatient } from "@/lib/rx";

export const dynamic = "force-dynamic";

/** GET /api/v1/prescriptions — the authenticated patient's digital prescriptions. */
export async function GET(req: Request) {
  try {
    const p = await getPatientFromBearer(req);
    if (!p) return fail(req, "Sessão inválida", 401);
    const prescriptions = await listForPatient(p.id);
    return paginated(req, prescriptions);
  } catch {
    return fail(req, "Erro", 500);
  }
}

export const OPTIONS = preflight;
