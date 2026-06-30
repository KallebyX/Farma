import { redirect } from "next/navigation";
import { getSessionContext } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { PageShell, PageHeader, Card, Badge, Icon } from "@/components/ui";

export const dynamic = "force-dynamic";

const brl = (cents: number) =>
  (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export default async function RelatoriosPage() {
  const ctx = await getSessionContext();
  if (!ctx) redirect("/sign-in");

  const since30d = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  const [
    activePatients,
    totalPatients,
    adherenceAgg,
    adherenceTotal,
    ramPending,
    ramReviewed,
    ramForwarded,
    returnScheduled,
    returnAsked,
    returnRestocked,
    remindersMonth,
    remindersConfirmed,
    prescriptionsActive,
    dispensationsMonth,
    newPatientsMonth,
    topPatients,
    pharmacists,
  ] = await Promise.all([
    prisma.patient.count({ where: { pharmacyId: ctx.pharmacyId, status: "ACTIVE" } }),
    prisma.patient.count({ where: { pharmacyId: ctx.pharmacyId } }),
    prisma.adherenceEvent.count({
      where: {
        outcome: { in: ["TAKEN", "TAKEN_LATE"] },
        prescription: { patient: { pharmacyId: ctx.pharmacyId } },
        scheduledFor: { gte: since30d },
      },
    }),
    prisma.adherenceEvent.count({
      where: {
        prescription: { patient: { pharmacyId: ctx.pharmacyId } },
        scheduledFor: { gte: since30d },
      },
    }),
    prisma.rAMReport.count({ where: { patient: { pharmacyId: ctx.pharmacyId }, status: "PENDING_REVIEW" } }),
    prisma.rAMReport.count({ where: { patient: { pharmacyId: ctx.pharmacyId }, status: "REVIEWED" } }),
    prisma.rAMReport.count({ where: { patient: { pharmacyId: ctx.pharmacyId }, status: "FORWARDED_VIGIMED" } }),
    prisma.returnExpectation.count({ where: { prescription: { patient: { pharmacyId: ctx.pharmacyId } }, status: "SCHEDULED" } }),
    prisma.returnExpectation.count({ where: { prescription: { patient: { pharmacyId: ctx.pharmacyId } }, status: "ASKED" } }),
    prisma.returnExpectation.count({
      where: {
        prescription: { patient: { pharmacyId: ctx.pharmacyId } },
        status: "RESTOCKED_HERE",
        respondedAt: { gte: since30d },
      },
    }),
    prisma.reminderJob.count({
      where: {
        prescription: { patient: { pharmacyId: ctx.pharmacyId } },
        scheduledFor: { gte: since30d },
        status: { not: "CANCELLED" },
      },
    }),
    prisma.reminderJob.count({
      where: {
        prescription: { patient: { pharmacyId: ctx.pharmacyId } },
        scheduledFor: { gte: since30d },
        status: "CONFIRMED",
      },
    }),
    prisma.prescription.count({ where: { patient: { pharmacyId: ctx.pharmacyId }, status: "ACTIVE" } }),
    prisma.dispensation.count({
      where: { pharmacyId: ctx.pharmacyId, createdAt: { gte: since30d } },
    }),
    prisma.patient.count({
      where: { pharmacyId: ctx.pharmacyId, createdAt: { gte: since30d } },
    }),
    prisma.patient.findMany({
      where: { pharmacyId: ctx.pharmacyId, status: "ACTIVE" },
      select: {
        name: true,
        prescriptions: {
          where: { status: "ACTIVE" },
          select: {
            adherence: {
              where: { scheduledFor: { gte: since30d } },
              select: { outcome: true },
            },
          },
        },
      },
      take: 200,
    }),
    prisma.membership.findMany({
      where: { pharmacyId: ctx.pharmacyId, status: "ACTIVE" },
      select: {
        role: true,
        user: { select: { name: true, email: true } },
      },
      orderBy: { joinedAt: "asc" },
    }),
  ]);

  const adherenceRate = adherenceTotal === 0 ? null : Math.round((adherenceAgg / adherenceTotal) * 100);
  const reminderConfirmRate = remindersMonth === 0 ? null : Math.round((remindersConfirmed / remindersMonth) * 100);

  const topByAdherence = topPatients
    .map((p) => {
      const events = p.prescriptions.flatMap((r) => r.adherence);
      const taken = events.filter((e) => e.outcome === "TAKEN" || e.outcome === "TAKEN_LATE").length;
      const rate = events.length === 0 ? null : Math.round((taken / events.length) * 100);
      return { name: p.name, total: events.length, rate };
    })
    .filter((p) => p.total > 0)
    .sort((a, b) => (b.rate ?? 0) - (a.rate ?? 0))
    .slice(0, 8);

  const ROLE_LABEL: Record<string, string> = {
    OWNER: "Dono", PHARMACIST: "Farmacêutico", ATTENDANT: "Atendente", READONLY: "Leitura",
  };

  return (
    <PageShell>
      <PageHeader
        eyebrow="Gestão"
        title="Relatórios"
        subtitle="Visão consolidada dos últimos 30 dias: adesão, farmacovigilância, retornos e equipe."
      />

      {/* KPIs */}
      <div className="mt-8 grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Kpi
          label="Pacientes ativos"
          value={String(activePatients)}
          sub={`${totalPatients} no total`}
          icon={<Icon.Users size={18} />}
        />
        <Kpi
          label="Adesão média (30d)"
          value={adherenceRate !== null ? `${adherenceRate}%` : "—"}
          sub={`${adherenceTotal} eventos registrados`}
          icon={<Icon.Activity size={18} />}
          highlight={adherenceRate !== null && adherenceRate >= 80}
          alert={adherenceRate !== null && adherenceRate < 65}
        />
        <Kpi
          label="Confirmação de lembretes"
          value={reminderConfirmRate !== null ? `${reminderConfirmRate}%` : "—"}
          sub={`${remindersMonth} lembretes enviados`}
          icon={<Icon.Bell size={18} />}
        />
        <Kpi
          label="Novos pacientes (30d)"
          value={String(newPatientsMonth)}
          sub={`${prescriptionsActive} prescrições ativas`}
          icon={<Icon.Plus size={18} />}
          highlight={newPatientsMonth > 0}
        />
      </div>

      <div className="mt-6 grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Kpi
          label="RAMs pendentes"
          value={String(ramPending)}
          sub={`${ramReviewed} revisadas · ${ramForwarded} no VigiMed`}
          icon={<Icon.Alert size={18} />}
          alert={ramPending > 0}
        />
        <Kpi
          label="Retornos resgatados"
          value={String(returnRestocked)}
          sub={`${returnAsked} perguntados · ${returnScheduled} agendados`}
          icon={<Icon.Cart size={18} />}
          highlight={returnRestocked > 0}
        />
        <Kpi
          label="Dispensações (30d)"
          value={String(dispensationsMonth)}
          sub="Receitas dispensadas"
          icon={<Icon.Pill size={18} />}
        />
        <Kpi
          label="Total da equipe"
          value={String(pharmacists.length)}
          sub="Membros ativos"
          icon={<Icon.Settings size={18} />}
        />
      </div>

      <div className="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Vigilance pipeline */}
        <Card className="p-6">
          <h2 className="text-[15px] font-semibold text-slate-800 flex items-center gap-2">
            <Icon.Alert size={16} className="text-rose-500" />
            Funil de farmacovigilância
          </h2>
          <div className="mt-5 flex items-center gap-3">
            <VigStep n={ramPending + ramReviewed + ramForwarded} label="Reportadas" color="slate" />
            <span className="text-slate-300 text-lg">→</span>
            <VigStep n={ramReviewed + ramForwarded} label="Revisadas" color="brand" />
            <span className="text-slate-300 text-lg">→</span>
            <VigStep n={ramForwarded} label="VigiMed" color="emerald" />
          </div>
          <p className="mt-4 text-[12px] text-slate-500">
            {ramPending > 0
              ? `${ramPending} caso${ramPending > 1 ? "s" : ""} aguardando revisão clínica.`
              : "Nenhum caso pendente. Ótimo!"}
          </p>
        </Card>

        {/* Adherence top patients */}
        <Card className="p-6">
          <h2 className="text-[15px] font-semibold text-slate-800 flex items-center gap-2">
            <Icon.Activity size={16} className="text-brand-600" />
            Adesão por paciente (30d)
          </h2>
          <div className="mt-4 space-y-2.5">
            {topByAdherence.length === 0 && (
              <p className="text-[13px] text-slate-500">Nenhum evento de adesão registrado nos últimos 30 dias.</p>
            )}
            {topByAdherence.map((p) => (
              <div key={p.name} className="flex items-center gap-3">
                <p className="text-[13px] text-slate-700 truncate flex-1 min-w-0">{p.name}</p>
                <AdesaoBar rate={p.rate ?? 0} />
                <span
                  className={`text-[12px] font-semibold tabular-nums w-9 text-right ${
                    (p.rate ?? 0) >= 80
                      ? "text-emerald-700"
                      : (p.rate ?? 0) >= 60
                        ? "text-amber-700"
                        : "text-rose-700"
                  }`}
                >
                  {p.rate}%
                </span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Team */}
      {pharmacists.length > 0 && (
        <Card className="mt-6 overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100">
            <h2 className="text-[15px] font-semibold text-slate-800 flex items-center gap-2">
              <Icon.Users size={16} />
              Equipe
            </h2>
          </div>
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-100 text-left text-[11px] uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-5 py-3 font-semibold">Nome</th>
                <th className="px-5 py-3 font-semibold hidden sm:table-cell">E-mail</th>
                <th className="px-5 py-3 font-semibold">Papel</th>
              </tr>
            </thead>
            <tbody>
              {pharmacists.map((m) => (
                <tr key={m.user.email} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/60 transition-colors">
                  <td className="px-5 py-3 font-medium text-slate-800">{m.user.name ?? "—"}</td>
                  <td className="px-5 py-3 text-slate-500 hidden sm:table-cell text-[12.5px]">{m.user.email}</td>
                  <td className="px-5 py-3">
                    <Badge
                      tone={
                        m.role === "OWNER"
                          ? "brand"
                          : m.role === "PHARMACIST"
                            ? "emerald"
                            : "slate"
                      }
                      size="sm"
                    >
                      {ROLE_LABEL[m.role] ?? m.role}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </PageShell>
  );
}

function Kpi({
  label,
  value,
  sub,
  icon,
  highlight,
  alert,
}: {
  label: string;
  value: string;
  sub?: string;
  icon: React.ReactNode;
  highlight?: boolean;
  alert?: boolean;
}) {
  return (
    <Card
      className={`p-5 ${
        alert
          ? "border-rose-200 bg-rose-50/50"
          : highlight
            ? "border-brand-200 bg-brand-50/50"
            : ""
      }`}
    >
      <div
        className={`w-8 h-8 rounded-lg flex items-center justify-center mb-3 ${
          alert
            ? "bg-rose-100 text-rose-600"
            : highlight
              ? "bg-brand-100 text-brand-700"
              : "bg-slate-100 text-slate-600"
        }`}
      >
        {icon}
      </div>
      <p className="text-[11px] uppercase tracking-[0.12em] text-slate-500 font-semibold">{label}</p>
      <p
        className={`mt-1.5 text-3xl font-bold tabular-nums ${
          alert ? "text-rose-700" : highlight ? "text-brand-800" : "text-slate-800"
        }`}
      >
        {value}
      </p>
      {sub && <p className="mt-0.5 text-[11.5px] text-slate-500">{sub}</p>}
    </Card>
  );
}

function VigStep({ n, label, color }: { n: number; label: string; color: "slate" | "brand" | "emerald" }) {
  const cls = {
    slate: "bg-slate-100 text-slate-700",
    brand: "bg-brand-100 text-brand-800",
    emerald: "bg-emerald-100 text-emerald-800",
  }[color];
  return (
    <div className={`flex-1 rounded-xl p-3 text-center ${cls}`}>
      <p className="text-2xl font-bold tabular-nums">{n}</p>
      <p className="text-[11px] font-medium mt-0.5">{label}</p>
    </div>
  );
}

function AdesaoBar({ rate }: { rate: number }) {
  const color =
    rate >= 80 ? "bg-emerald-500" : rate >= 60 ? "bg-amber-400" : "bg-rose-400";
  return (
    <div className="w-24 h-1.5 bg-slate-100 rounded-full overflow-hidden shrink-0">
      <div className={`h-full rounded-full ${color}`} style={{ width: `${Math.min(rate, 100)}%` }} />
    </div>
  );
}
