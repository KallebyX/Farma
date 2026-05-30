import { redirect } from "next/navigation";
import { getSessionContext } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { AppShell } from "@/components/layout/app-shell";
import { SignOutForm } from "@/components/layout/sign-out-form";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const ctx = await getSessionContext();
  if (!ctx) redirect("/sign-in");

  const [pharmacy, user, ramPending, ramSevere, returnsAsked, activePatients] = await Promise.all([
    prisma.pharmacy.findUnique({
      where: { id: ctx.pharmacyId },
      select: { fantasia: true, razaoSocial: true, cnpj: true },
    }).catch(() => null),
    prisma.user.findUnique({
      where: { id: ctx.userId },
      select: { name: true, email: true },
    }).catch(() => null),
    prisma.rAMReport.count({
      where: { patient: { pharmacyId: ctx.pharmacyId }, status: "PENDING_REVIEW" },
    }).catch(() => 0),
    prisma.rAMReport.count({
      where: { patient: { pharmacyId: ctx.pharmacyId }, status: "PENDING_REVIEW", severity: "SEVERE" },
    }).catch(() => 0),
    prisma.returnExpectation.count({
      where: { prescription: { patient: { pharmacyId: ctx.pharmacyId } }, status: "ASKED" },
    }).catch(() => 0),
    prisma.patient.count({
      where: { pharmacyId: ctx.pharmacyId, status: "ACTIVE" },
    }).catch(() => 0),
  ]);

  return (
    <AppShell
      pharmacy={pharmacy ?? null}
      user={user ? { ...user, role: ctx.role } : null}
      counts={{ ramPending, ramSevere, returnsAsked, activePatients }}
      signOutSlot={<SignOutForm />}
    >
      {children}
    </AppShell>
  );
}
