import { redirect } from "next/navigation";
import { getSessionContext } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { PageShell, PageHeader, Card, Badge, Icon } from "@/components/ui";

export const dynamic = "force-dynamic";

const TIER_TONE: Record<string, "amber" | "slate" | "brand" | "violet"> = {
  BRONZE: "amber", SILVER: "slate", GOLD: "brand", PLATINUM: "violet",
};
const TIER_LABEL: Record<string, string> = { BRONZE: "Bronze", SILVER: "Prata", GOLD: "Ouro", PLATINUM: "Platina" };

export default async function EngajamentoPage() {
  const ctx = await getSessionContext();
  if (!ctx) redirect("/sign-in");
  const where = { patient: { pharmacyId: ctx.pharmacyId } };

  const [missions, rewards, accounts, agg, topPatients, redemptions] = await Promise.all([
    prisma.mission.findMany({ where: { active: true }, orderBy: { sortOrder: "asc" } }),
    prisma.reward.findMany({ where: { active: true }, orderBy: { costPoints: "asc" } }),
    prisma.loyaltyAccount.count({ where }),
    prisma.loyaltyAccount.aggregate({ where, _sum: { points: true, lifetime: true } }),
    prisma.loyaltyAccount.findMany({
      where, orderBy: { lifetime: "desc" }, take: 8,
      select: { points: true, lifetime: true, tier: true, patient: { select: { name: true } } },
    }),
    prisma.redemption.count({ where }),
  ]);

  return (
    <PageShell>
      <PageHeader eyebrow="Engajamento & Fidelidade" title="Gamificação" subtitle="Missões, pontos, níveis e recompensas que transformam adesão em hábito." />

      <div className="mt-8 grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Stat label="Pacientes no programa" value={accounts} icon={<Icon.Users size={18} />} />
        <Stat label="Pontos em circulação" value={agg._sum.points ?? 0} icon={<Icon.Heart size={18} />} highlight />
        <Stat label="Pontos já concedidos" value={agg._sum.lifetime ?? 0} icon={<Icon.TrendUp size={18} />} />
        <Stat label="Recompensas resgatadas" value={redemptions} icon={<Icon.Check size={18} />} />
      </div>

      <div className="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-6">
          <h2 className="text-[15px] font-semibold text-slate-800 flex items-center gap-2"><Icon.Activity size={16} /> Missões ativas</h2>
          <div className="mt-4 space-y-2.5">
            {missions.length === 0 && <p className="text-[13px] text-slate-500">Nenhuma missão ativa.</p>}
            {missions.map((m) => (
              <div key={m.id} className="flex items-center justify-between rounded-lg border border-slate-100 px-3.5 py-2.5">
                <div className="min-w-0">
                  <p className="text-[13.5px] font-medium text-slate-800 truncate">{m.icon ? `${m.icon} ` : ""}{m.title}</p>
                  <p className="text-[12px] text-slate-500 truncate">{m.description}</p>
                </div>
                <Badge tone="emerald" className="shrink-0">+{m.points} pts</Badge>
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-6">
          <h2 className="text-[15px] font-semibold text-slate-800 flex items-center gap-2"><Icon.Heart size={16} /> Catálogo de recompensas</h2>
          <div className="mt-4 space-y-2.5">
            {rewards.length === 0 && <p className="text-[13px] text-slate-500">Nenhuma recompensa cadastrada.</p>}
            {rewards.map((r) => (
              <div key={r.id} className="flex items-center justify-between rounded-lg border border-slate-100 px-3.5 py-2.5">
                <div className="min-w-0">
                  <p className="text-[13.5px] font-medium text-slate-800 truncate">{r.title}</p>
                  <p className="text-[12px] text-slate-500 truncate">{r.description} · {r.stock == null ? "ilimitado" : `${r.stock} em estoque`}</p>
                </div>
                <Badge tone="brand" className="shrink-0">{r.costPoints} pts</Badge>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <Card className="mt-6 p-6">
        <h2 className="text-[15px] font-semibold text-slate-800 flex items-center gap-2"><Icon.TrendUp size={16} /> Pacientes mais engajados</h2>
        <div className="mt-4 overflow-hidden rounded-lg border border-slate-100">
          <table className="w-full text-[13px]">
            <thead className="bg-slate-50 text-slate-500">
              <tr><th className="text-left font-medium px-4 py-2">Paciente</th><th className="text-left font-medium px-4 py-2">Nível</th><th className="text-right font-medium px-4 py-2">Saldo</th><th className="text-right font-medium px-4 py-2">Acumulado</th></tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {topPatients.length === 0 && <tr><td colSpan={4} className="px-4 py-6 text-center text-slate-500">Ainda sem pacientes no programa.</td></tr>}
              {topPatients.map((a, i) => (
                <tr key={i}>
                  <td className="px-4 py-2.5 font-medium text-slate-800">{a.patient.name}</td>
                  <td className="px-4 py-2.5"><Badge tone={TIER_TONE[a.tier]} dot>{TIER_LABEL[a.tier]}</Badge></td>
                  <td className="px-4 py-2.5 text-right tabular-nums text-slate-700">{a.points}</td>
                  <td className="px-4 py-2.5 text-right tabular-nums text-slate-500">{a.lifetime}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </PageShell>
  );
}

function Stat({ label, value, icon, highlight }: { label: string; value: number; icon: React.ReactNode; highlight?: boolean }) {
  return (
    <Card className={`p-5 ${highlight ? "border-brand-200 bg-brand-50/50" : ""}`}>
      <div className={`w-8 h-8 rounded-lg flex items-center justify-center mb-3 ${highlight ? "bg-brand-100 text-brand-700" : "bg-slate-100 text-slate-600"}`}>{icon}</div>
      <p className="text-[11px] uppercase tracking-[0.12em] text-slate-500 font-semibold">{label}</p>
      <p className={`mt-1.5 text-2xl font-bold tabular-nums ${highlight ? "text-brand-800" : "text-slate-800"}`}>{value.toLocaleString("pt-BR")}</p>
    </Card>
  );
}
