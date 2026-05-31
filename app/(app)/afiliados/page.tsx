import { redirect } from "next/navigation";
import { getSessionContext } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { PageShell, PageHeader, Card, Badge, Icon } from "@/components/ui";

export const dynamic = "force-dynamic";

const brl = (cents: number) => (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const CONV_TONE: Record<string, "amber" | "emerald" | "rose"> = { PENDING: "amber", CONFIRMED: "emerald", REVERSED: "rose" };
const CONV_LABEL: Record<string, string> = { PENDING: "Pendente", CONFIRMED: "Confirmada", REVERSED: "Estornada" };

export default async function AfiliadosPage() {
  const ctx = await getSessionContext();
  if (!ctx) redirect("/sign-in");
  const tenant = { patient: { pharmacyId: ctx.pharmacyId } };

  const [partners, clicks, convAgg, conversions] = await Promise.all([
    prisma.affiliatePartner.findMany({ where: { active: true }, orderBy: { name: "asc" } }),
    prisma.affiliateClick.count({ where: tenant }),
    prisma.affiliateConversion.aggregate({
      where: { ...tenant, status: "CONFIRMED" },
      _sum: { amountCents: true, commissionCents: true, pointsAwarded: true }, _count: true,
    }),
    prisma.affiliateConversion.findMany({
      where: tenant,
      orderBy: { createdAt: "desc" }, take: 12,
      select: { id: true, amountCents: true, commissionCents: true, status: true, createdAt: true, partner: { select: { name: true } }, patient: { select: { name: true } } },
    }),
  ]);

  return (
    <PageShell>
      <PageHeader eyebrow="Crescimento" title="Laboratórios parceiros" subtitle="Laboratórios (Eurofarma, Cimed…) com link rastreável: o paciente ganha pontos e a farmácia, comissão." />

      <div className="mt-8 grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Stat label="Laboratórios ativos" value={String(partners.length)} icon={<Icon.Link size={18} />} />
        <Stat label="Cliques rastreados" value={clicks.toLocaleString("pt-BR")} icon={<Icon.Cart size={18} />} />
        <Stat label="Vendas confirmadas" value={String(convAgg._count)} icon={<Icon.Check size={18} />} />
        <Stat label="Comissão (confirmada)" value={brl(convAgg._sum.commissionCents ?? 0)} icon={<Icon.TrendUp size={18} />} highlight />
      </div>

      <div className="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-6">
          <h2 className="text-[15px] font-semibold text-slate-800 flex items-center gap-2"><Icon.Link size={16} /> Laboratórios</h2>
          <div className="mt-4 space-y-2.5">
            {partners.length === 0 && <p className="text-[13px] text-slate-500">Nenhum laboratório cadastrado.</p>}
            {partners.map((p) => (
              <div key={p.id} className="flex items-center justify-between rounded-lg border border-slate-100 px-3.5 py-2.5">
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className="text-lg">{p.logo ?? "🏪"}</span>
                  <div className="min-w-0">
                    <p className="text-[13.5px] font-medium text-slate-800 truncate">{p.name}</p>
                    <p className="text-[12px] text-slate-500 truncate">{p.commissionPct}% comissão · {p.pointsPerReal} pts/R$</p>
                  </div>
                </div>
                <Badge tone="slate" className="shrink-0 font-mono">/{p.slug}</Badge>
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-6">
          <h2 className="text-[15px] font-semibold text-slate-800 flex items-center gap-2"><Icon.Cart size={16} /> Conversões recentes</h2>
          <div className="mt-4 space-y-2">
            {conversions.length === 0 && <p className="text-[13px] text-slate-500">Ainda sem conversões. Compartilhe os links do hub do paciente.</p>}
            {conversions.map((c) => (
              <div key={c.id} className="flex items-center justify-between rounded-lg border border-slate-100 px-3.5 py-2.5">
                <div className="min-w-0">
                  <p className="text-[13.5px] font-medium text-slate-800 truncate">{c.partner.name} · {c.patient?.name ?? "—"}</p>
                  <p className="text-[12px] text-slate-500">{c.createdAt.toLocaleDateString("pt-BR")} · {brl(c.amountCents)}</p>
                </div>
                <Badge tone={CONV_TONE[c.status]} dot className="shrink-0">{CONV_LABEL[c.status]}</Badge>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </PageShell>
  );
}

function Stat({ label, value, icon, highlight }: { label: string; value: string; icon: React.ReactNode; highlight?: boolean }) {
  return (
    <Card className={`p-5 ${highlight ? "border-emerald-200 bg-emerald-50/50" : ""}`}>
      <div className={`w-8 h-8 rounded-lg flex items-center justify-center mb-3 ${highlight ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-600"}`}>{icon}</div>
      <p className="text-[11px] uppercase tracking-[0.12em] text-slate-500 font-semibold">{label}</p>
      <p className={`mt-1.5 text-2xl font-bold tabular-nums ${highlight ? "text-emerald-700" : "text-slate-800"}`}>{value}</p>
    </Card>
  );
}
