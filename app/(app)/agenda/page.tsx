import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionContext } from "@/lib/auth/session";
import { upcomingForPharmacy } from "@/lib/appointments";
import { PageShell, PageHeader, Card, Badge, Icon, EmptyState, Illus } from "@/components/ui";

export const dynamic = "force-dynamic";

const KIND_LABEL: Record<string, string> = { CONSULTATION: "Consulta", FOLLOWUP: "Retorno", EXAM: "Exame", VACCINE: "Vacina", OTHER: "Outro" };

function dayLabel(d: Date): string {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const target = new Date(d); target.setHours(0, 0, 0, 0);
  const diff = Math.round((target.getTime() - today.getTime()) / 86400000);
  if (diff === 0) return "Hoje";
  if (diff === 1) return "Amanhã";
  return d.toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "short" });
}

export default async function AgendaPage() {
  const ctx = await getSessionContext();
  if (!ctx) redirect("/sign-in");

  const appts = await upcomingForPharmacy(ctx.pharmacyId, 100);

  // group by day
  const groups = new Map<string, typeof appts>();
  for (const a of appts) {
    const key = dayLabel(a.scheduledAt);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(a);
  }

  return (
    <PageShell>
      <PageHeader eyebrow="Atendimento" title="Agenda" subtitle="Próximas consultas, retornos, exames e vacinas da farmácia." />

      {appts.length === 0 ? (
        <Card className="mt-8">
          <EmptyState illustration={<Illus.Empty />} title="Nenhum agendamento futuro"
            hint="Agende consultas pela ficha do paciente (aba Consultas & agendamentos)." />
        </Card>
      ) : (
        <div className="mt-8 space-y-6">
          {[...groups.entries()].map(([day, list]) => (
            <div key={day}>
              <h2 className="text-[12px] font-bold uppercase tracking-[0.14em] text-slate-500 mb-2 capitalize">{day}</h2>
              <div className="space-y-2">
                {list.map((a) => (
                  <Card key={a.id} className="px-4 py-3">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="text-center shrink-0 w-12">
                          <p className="text-[15px] font-bold tabular-nums text-brand-800">{a.scheduledAt.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}</p>
                          <p className="text-[10px] text-slate-400">{a.durationMin}min</p>
                        </div>
                        <div className="min-w-0 border-l border-slate-100 pl-3">
                          <p className="text-[13.5px] font-medium text-slate-800 truncate">{a.title}</p>
                          <Link href={`/patients/${a.patient.id}`} className="text-[12px] text-brand-600 hover:underline">{a.patient.name}</Link>
                          <span className="text-[12px] text-slate-400"> · {KIND_LABEL[a.kind] ?? a.kind}{a.professional ? ` · ${a.professional}` : ""}</span>
                        </div>
                      </div>
                      <Badge tone="brand" dot className="shrink-0"><Icon.Clock size={11} /> agendada</Badge>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </PageShell>
  );
}
