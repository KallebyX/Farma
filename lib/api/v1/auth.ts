import { resolvePatientFromRequest } from "@/lib/patient-session";

/**
 * Resolves the authenticated patient behind a v1 request (Authorization: Bearer
 * <patient token> or the mp_hub cookie). Today this maps to a single Patient
 * record; as the PatientAccount model (global patient identity + M2M pharmacy
 * links) lands, this is the single place to evolve to account-scoped resolution.
 */
export async function getPatientFromBearer(req: Request): Promise<{ id: string; pharmacyId: string } | null> {
  return resolvePatientFromRequest(req);
}
