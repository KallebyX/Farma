import { redirect } from "next/navigation";
import { getSessionContext } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { PageShell, PageHeader, Card, Badge, Icon } from "@/components/ui";
import { PROVIDERS } from "@/lib/wearables/providers";

export const dynamic = "force-dynamic";

const STATUS_TONE: Record<string, "emerald" | "amber" | "rose" | "slate"> = {
  CONNECTED: "emerald", PENDING: "amber", ERROR: "rose", REVOKED: "slate",
};
const METRIC_LABEL: Record<string, string> = {
  HEART_RATE: "FC", RESTING_HR: "FC repouso", STEPS: "Passos", SLEEP_MINUTES: "Sono (min)",
  SPO2: "SpO₂", HRV: "VFC", CALORIES: "Calorias", WEIGHT: "Peso", GLUCOSE: "Glicose",
  BLOOD_PRESSURE_SYS: "PA sis", BLOOD_PRESSURE_DIA: "PA dia", TEMPERATURE: "Temp",
};

export default async function SaudeConectadaPage() {
  const ctx = await getSessionContext();
  if (!ctx) redirect("/sign-in");
  const tenant = { patient: { pharmacyId: ctx.pharmacyId } };

  const [connections, sampleCount, patientsWithData, recent] = await Promise.all([
    prisma.wearableConnection.findMany({
      where: tenant, orderBy: { lastSyncAt: "desc" }, take: 50,
      select: { provider: true, status: true, lastSyncAt: true, patient: { select: { name: true } } },
    }),
    prisma.wearableSample.count({ where: tenant }),
    prisma.wearableConnection.findMany({ where: { ...tenant, status: "CONNECTED" }, distinct: ["patientId"], select: { patientId: true } }),
    prisma.wearableSample.findMany({
      where: tenant, orderBy: { recordedAt: "desc" }, take: 12,
      select: { metric: true, value: true, unit: true, recordedAt: true, source: true, patient: { select: { name: true } } },
    }),
  ]);

  const byStatus = connections.reduce<Record<string, number>>((a, c) => ({ ...a, [c.status]: (a[c.status] ?? 0) + 1 }), {});

  return (
    <PageShell>
      <PageHeader eyebrow="Wearables" title="Saúde conectada" subtitle="Apple Watch, Galaxy Watch, Fitbit, Oura e mais — dados dos pacientes em tempo quase real." />

      <div className="mt-8 grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Stat label="Conexões ativas" value={byStatus.CONNECTED ?? 0} icon={<Icon.Activity size={18} />} highlight />
        <Stat label="Pacientes monitorados" value={patientsWithData.length} icon={<Icon.Users size={18} />} />
        <Stat label="Amostras coletadas" value={sampleCount} icon={<Icon.Heart size={18} />} />
        <Stat label="Aguardando 1ª sync" value={byStatus.PENDING ?? 0} icon={<Icon.Clock size={18} />} />
      </div>

      <div className="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-6">
          <h2 className="text-[15px] font-semibold text-slate-800 flex items-center gap-2"><Icon.Phone size={16} /> Dispositivos conectados</h2>
          <div className="mt-4 space-y-2">
            {connections.length === 0 && <p className="text-[13px] text-slate-500">Nenhum dispositivo conectado. Os pacientes conectam pelo hub (Meu Prontuário).</p>}
            {connections.map((c, i) => {
              const def = PROVIDERS[c.provider];
              return (
                <div key={i} className="flex items-center justify-between rounded-lg border border-slate-100 px-3.5 py-2.5">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="text-lg">{def?.logo ?? "⌚"}</span>
                    <div className="min-w-0">
                      <p className="text-[13.5px] font-medium text-slate-800 truncate">{c.patient.name}</p>
                      <p className="text-[12px] text-slate-500 truncate">{def?.name ?? c.provider} · {c.lastSyncAt ? `sync ${c.lastSyncAt.toLocaleDateString("pt-BR")}` : "sem sync"}</p>
                    </div>
                  </div>
                  <Badge tone={STATUS_TONE[c.status]} dot className="shrink-0">{c.status === "CONNECTED" ? "conectado" : c.status.toLowerCase()}</Badge>
                </div>
              );
            })}
          </div>
        </Card>

        <Card className="p-6">
          <h2 className="text-[15px] font-semibold text-slate-800 flex items-center gap-2"><Icon.TrendUp size={16} /> Leituras recentes</h2>
          <div className="mt-4 space-y-2">
            {recent.length === 0 && <p className="text-[13px] text-slate-500">Sem leituras ainda.</p>}
            {recent.map((s, i) => (
              <div key={i} className="flex items-center justify-between rounded-lg border border-slate-100 px-3.5 py-2.5">
                <div className="min-w-0">
                  <p className="text-[13.5px] font-medium text-slate-800 truncate">{s.patient.name}</p>
                  <p className="text-[12px] text-slate-500 truncate">{METRIC_LABEL[s.metric] ?? s.metric} · {s.recordedAt.toLocaleString("pt-BR")}</p>
                </div>
                <span className="shrink-0 text-[14px] font-semibold tabular-nums text-slate-800">{s.value}<span className="text-[11px] font-normal text-slate-400"> {s.unit}</span></span>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </PageShell>
  );
}

function Stat({ label, value, icon, highlight }: { label: string; value: number; icon: React.ReactNode; highlight?: boolean }) {
  return (
    <Card className={`p-5 ${highlight ? "border-emerald-200 bg-emerald-50/50" : ""}`}>
      <div className={`w-8 h-8 rounded-lg flex items-center justify-center mb-3 ${highlight ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-600"}`}>{icon}</div>
      <p className="text-[11px] uppercase tracking-[0.12em] text-slate-500 font-semibold">{label}</p>
      <p className={`mt-1.5 text-2xl font-bold tabular-nums ${highlight ? "text-emerald-700" : "text-slate-800"}`}>{value.toLocaleString("pt-BR")}</p>
    </Card>
  );
}
