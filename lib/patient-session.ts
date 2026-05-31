import { cookies } from "next/headers";
import { prisma } from "@/lib/db";
import { verifyPatientToken } from "@/lib/patient-token";

/** Resolves the patient behind a hub token (Authorization: Bearer … or mp_hub cookie). */
export async function resolvePatientFromRequest(req: Request): Promise<{ id: string; pharmacyId: string } | null> {
  const auth = req.headers.get("authorization");
  const bearer = auth?.startsWith("Bearer ") ? auth.slice(7) : null;
  const cookieToken = (await cookies()).get("mp_hub")?.value ?? null;
  const patientId = verifyPatientToken(bearer ?? cookieToken);
  if (!patientId) return null;
  return prisma.patient.findUnique({ where: { id: patientId }, select: { id: true, pharmacyId: true } });
}
