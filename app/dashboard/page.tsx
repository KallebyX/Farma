import Link from "next/link";
import { redirect } from "next/navigation";
import { roleLabel } from "@/lib/auth/permissions";
import { getSessionContext } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { signOut } from "@/lib/auth/config";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const ctx = await getSessionContext();
  if (!ctx) redirect("/sign-in");

  const [pharmacy, user, memberCount, pendingInvites, patientCount, ramPending] = await Promise.all([
    prisma.pharmacy.findUnique({ where: { id: ctx.pharmacyId } }),
    prisma.user.findUnique({ where: { id: ctx.userId } }),
    prisma.membership.count({ where: { pharmacyId: ctx.pharmacyId, status: "ACTIVE" } }),
    prisma.invitation.count({
      where: { pharmacyId: ctx.pharmacyId, status: "PENDING" },
    }),
    prisma.patient.count({ where: { pharmacyId: ctx.pharmacyId, status: "ACTIVE" } }),
    prisma.rAMReport.count({
      where: {
        patient: { pharmacyId: ctx.pharmacyId },
        status: "PENDING_REVIEW",
      },
    }),
  ]);

  async function handleSignOut() {
    "use server";
    await signOut({ redirectTo: "/sign-in" });
  }

  return (
    <main className="min-h-screen px-6 py-10">
      <div className="mx-auto max-w-4xl">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-bold tracking-[0.2em] text-brand-500 uppercase">
              {pharmacy?.fantasia ?? pharmacy?.razaoSocial}
            </p>
            <h1 className="mt-1 text-2xl font-bold text-brand-800">
              Olá, {user?.name?.split(" ")[0] ?? "tudo bem"}
            </h1>
            <p className="text-sm text-slate-500">
              Você está logado como {roleLabel(ctx.role)}.
            </p>
          </div>
          <form action={handleSignOut}>
            <button type="submit" className="text-sm text-slate-500 hover:text-slate-700">
              Sair
            </button>
          </form>
        </div>

        <div className="mt-8 grid grid-cols-2 sm:grid-cols-4 gap-3">
          <StatCard label="Pacientes ativos" value={patientCount} />
          <StatCard label="RAMs pendentes" value={ramPending} />
          <StatCard label="Membros" value={memberCount} />
          <StatCard label="Convites" value={pendingInvites} />
        </div>

        <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-3">
          <NavCard href="/patients" title="Pacientes" desc="Cadastro, lembretes e histórico" />
          <NavCard href="/ram" title="Inbox de RAM" desc="Reações adversas para revisão" />
          <NavCard href="/catalog" title="Catálogo" desc="Medicamentos da base" />
          <NavCard href="/settings/team" title="Equipe" desc="Membros e convites" />
        </div>
      </div>
    </main>
  );
}

function NavCard({ href, title, desc }: { href: string; title: string; desc: string }) {
  return (
    <Link
      href={href}
      className="block rounded-xl border border-slate-200 bg-white p-5 hover:border-brand-300 transition"
    >
      <p className="text-sm font-semibold text-brand-800">{title} →</p>
      <p className="mt-1 text-xs text-slate-500">{desc}</p>
    </Link>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl bg-white border border-slate-200 p-5">
      <p className="text-xs uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-2 text-3xl font-bold text-brand-800">{value}</p>
    </div>
  );
}
