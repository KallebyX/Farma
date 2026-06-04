import { redirect } from "next/navigation";
import { ensureDemoPatient } from "@/lib/demo";
import { signPatientToken } from "@/lib/patient-token";

/**
 * DEMO - Meu Prontuário. Instead of a static mockup, this provisions a real demo
 * patient (idempotent) and redirects into the ACTUAL patient hub, so the demo
 * behaves exactly like production (real APIs, gamification, multi-pharmacy, etc.).
 */
export const dynamic = "force-dynamic";

export default async function DemoProntuarioPage() {
  const patientId = await ensureDemoPatient();
  const token = signPatientToken(patientId, 7); // short-lived demo token
  redirect(`/hub/${token}`);
}
