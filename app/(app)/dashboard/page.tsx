import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionContext, listMemberships } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { PageShell, PageHeader, Card, Icon } from "@/components/ui";
import { TenantSwitcher } from "./tenant-switcher";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const ctx = await getSessionContext();
  if (!ctx) redirect("/sign-in");

  const memberships = await listMemberships(ctx.userId);
  const [pharmacy, user, memberCount, pendingInvites, patientCount, ramPending, ramSevere, returnsAsked, restockedMonth] = await Promise.all([
    prisma.pharmacy.findUnique({ where: { id: ctx.pharmacyId }, select: { fantasia: true, razaoSocial: true } }).catch(() => null),
    prisma.user.findUnique({ where: { id: ctx.userId }, select: { name: true } }).catch(() => null),
    prisma.membership.count({ where: { pharmacyId: ctx.pharmacyId, status: "ACTIVE" } }).catch(() => 0),
    prisma.invitation.count({ where: { pharmacyId: ctx.pharmacyId, status: "PENDING" } }).catch(() => 0),
    prisma.patient.count({ where: { pharmacyId: ctx.pharmacyId, status: "ACTIVE" } }).catch(() => 0),
    prisma.rAMReport.count({ where: { patient: { pharmacyId: ctx.pharmacyId }, status: "PENDING_REVIEW" } }).catch(() => 0),
    prisma.rAMReport.count({ where: { patient: { pharmacyId: ctx.pharmacyId }, status: "PENDING_REVIEW", severity: "SEVERE" } }).catch(() => 0),
    prisma.returnExpectation.count({ where: { prescription: { patient: { pharmacyId: ctx.pharmacyId } }, status: "ASKED" } }).catch(() => 0),
    prisma.returnExpectation.count({
      where: {
        prescription: { patient: { pharmacyId: ctx.pharmacyId } },
        status: "RESTOCKED_HERE",
        respondedAt: { gte: new Date(Date.now() - 30 * 86400000) },
      },
    }).catch(() => 0),
  ]);

  const firstName = user?.name?.split(" ")[0] ?? "tudo bem";

  return (
    <PageShell>
      <div className="flex items-start justify-between gap-6">
        <PageHeader
          eyebrow={pharmacy?.fantasia ?? pharmacy?.razaoSocial ?? undefined}
          title={`Olá, ${firstName}`}
          subtitle="Visão geral da sua farmácia hoje."
        />
        <TenantSwitcher memberships={memberships} activePharmacyId={ctx.pharmacyId} />
      </div>

      <div className="mt-8 grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard label="Pacientes ativos" value={patientCount} icon={<Icon.Users size={18}/>} href="/patients"/>
        <StatCard label="RAMs pendentes" value={ramPending} icon={<Icon.Alert size={18}/>} href="/ram" alert={ramSevere > 0}/>
        <StatCard label="Retornos perguntados" value={returnsAsked} icon={<Icon.Cart size={18}/>} href="/returns"/>
        <StatCard label="Resgatados (30d)" value={restockedMonth} icon={<Icon.TrendUp size={18}/>} href="/returns" highlight/>
      </div>

      <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-4">
        <NavCard href="/patients" title="Pacientes" desc="Cadastro, lembretes e histórico de adesão." icon={<Icon.Users size={20}/>}/>
        <NavCard href="/receitas" title="Receitas digitais" desc="Receitas enviadas (qualificadas/ICP e comuns) e dispensação rastreável." icon={<Icon.Pill size={20}/>}/>
        <NavCard href="/returns" title="Retornos esperados" desc="Resgate de pacientes cujo estoque está acabando." icon={<Icon.Cart size={20}/>}/>
        <NavCard href="/ram" title="Inbox de RAM" desc="Reações adversas reportadas pelos pacientes." icon={<Icon.Alert size={20}/>}/>
        <NavCard href="/afiliados" title="Laboratórios" desc="Parcerias (Eurofarma, Cimed…), cliques, conversões e comissão." icon={<Icon.TrendUp size={20}/>}/>
        <NavCard href="/engajamento" title="Gamificação" desc="Missões, recompensas e níveis do programa de fidelidade." icon={<Icon.Heart size={20}/>}/>
        <NavCard href="/catalog" title="Catálogo" desc="Base de medicamentos usada nas prescrições." icon={<Icon.Book size={20}/>}/>
        <NavCard href="/integracoes" title="Integrações" desc="Chaves de API e webhooks para conectar seu sistema." icon={<Icon.Link size={20}/>}/>
        <NavCard href="/configuracoes" title="Configurações" desc="Localização/rede, catálogo e programa de indicação." icon={<Icon.Settings size={20}/>}/>
        <NavCard href="/settings/team" title="Equipe" desc={`${memberCount} membro${memberCount !== 1 ? "s" : ""}${pendingInvites > 0 ? ` · ${pendingInvites} convite${pendingInvites !== 1 ? "s" : ""} pendente${pendingInvites !== 1 ? "s" : ""}` : ""}`} icon={<Icon.Settings size={20}/>}/>
      </div>
    </PageShell>
  );
}

function StatCard({
  label, value, icon, href, alert, highlight,
}: {
  label: string; value: number; icon: React.ReactNode; href: string; alert?: boolean; highlight?: boolean;
}) {
  return (
    <Link href={href}>
      <Card className={`p-5 hover:shadow-md transition-shadow cursor-pointer ${alert ? "border-rose-200 bg-rose-50/50" : highlight ? "border-brand-200 bg-brand-50/50" : ""}`}>
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center mb-3 ${
          alert ? "bg-rose-100 text-rose-600" :
          highlight ? "bg-brand-100 text-brand-700" :
          "bg-slate-100 text-slate-600"
        }`}>
          {icon}
        </div>
        <p className="text-[11px] uppercase tracking-[0.12em] text-slate-500 font-semibold">{label}</p>
        <p className={`mt-1.5 text-3xl font-bold tabular-nums ${
          alert ? "text-rose-700" : highlight ? "text-brand-800" : "text-slate-800"
        }`}>{value}</p>
      </Card>
    </Link>
  );
}

function NavCard({ href, title, desc, icon }: { href: string; title: string; desc: string; icon: React.ReactNode }) {
  return (
    <Link href={href}>
      <Card className="p-5 hover:shadow-md transition-shadow cursor-pointer group">
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 rounded-xl bg-brand-50 flex items-center justify-center text-brand-700 shrink-0 group-hover:bg-brand-100 transition-colors">
            {icon}
          </div>
          <div className="min-w-0">
            <p className="text-[14px] font-semibold text-slate-800 group-hover:text-brand-800 transition-colors">{title}</p>
            <p className="mt-0.5 text-[12.5px] text-slate-500">{desc}</p>
          </div>
          <Icon.ChevronRight size={16} className="text-slate-300 group-hover:text-brand-400 transition-colors mt-0.5 shrink-0"/>
        </div>
      </Card>
    </Link>
  );
}
