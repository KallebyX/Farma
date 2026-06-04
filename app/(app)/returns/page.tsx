import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionContext } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { PageShell, PageHeader, Card, Badge, EmptyState, Illus, Icon } from "@/components/ui";
import { fmtDateTimeBR, fmtRelative } from "@/components/ui/utils";

export const dynamic = "force-dynamic";

export default async function ReturnsPage() {
  const ctx = await getSessionContext();
  if (!ctx) redirect("/sign-in");

  const expectations = await prisma.returnExpectation.findMany({
    where: { prescription: { patient: { pharmacyId: ctx.pharmacyId } } },
    include: {
      prescription: {
        include: {
          patient: { select: { id: true, name: true, phone: true } },
          medication: { select: { brandName: true, dosage: true } },
        },
      },
    },
    orderBy: [{ status: "asc" }, { expectedAt: "asc" }],
    take: 200,
  });

  const scheduled = expectations.filter((e) => e.status === "SCHEDULED");
  const asked = expectations.filter((e) => e.status === "ASKED");
  const responded = expectations.filter((e) =>
    ["RESTOCKED_HERE", "RESTOCKED_AWAY", "STOPPING", "EXPIRED"].includes(e.status),
  );

  const lastMonth = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const restockedCount = await prisma.returnExpectation.count({
    where: {
      prescription: { patient: { pharmacyId: ctx.pharmacyId } },
      status: "RESTOCKED_HERE",
      respondedAt: { gte: lastMonth },
    },
  });

  return (
    <PageShell>
      <PageHeader
        eyebrow="Retenção"
        title="Retornos esperados"
        subtitle="Pacientes cujo estoque está acabando. O bot pergunta automaticamente se compraram reposição."
      />

      <div className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="p-5">
          <p className="text-[11px] uppercase tracking-[0.12em] text-slate-500 font-semibold">A perguntar</p>
          <p className="mt-2 text-3xl font-bold tabular-nums text-slate-800">{scheduled.length}</p>
        </Card>
        <Card className="p-5">
          <p className="text-[11px] uppercase tracking-[0.12em] text-slate-500 font-semibold">Perguntados</p>
          <p className="mt-2 text-3xl font-bold tabular-nums text-slate-800">{asked.length}</p>
        </Card>
        <Card className="p-5 border-brand-200 bg-brand-50/50">
          <p className="text-[11px] uppercase tracking-[0.12em] text-brand-700 font-semibold">Resgatados (30d)</p>
          <p className="mt-2 text-3xl font-bold tabular-nums text-brand-800">{restockedCount}</p>
        </Card>
      </div>

      <section className="mt-10">
        <h2 className="text-[12px] font-bold tracking-[0.15em] uppercase text-slate-500 mb-3">
          Perguntados - aguardando resposta ({asked.length})
        </h2>
        {asked.length === 0 ? (
          <Card>
            <EmptyState
              illustration={<Illus.Chat size={90}/>}
              title="Nenhuma pergunta aguardando resposta"
              hint="Nenhum paciente está aguardando resposta no momento."
            />
          </Card>
        ) : (
          <div className="space-y-2">
            {asked.map((e) => (
              <Card key={e.id} className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <Link href={`/patients/${e.prescription.patient.id}`}
                      className="text-[14px] font-semibold text-brand-700 hover:text-brand-900">
                      {e.prescription.patient.name}
                    </Link>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <Icon.Pill size={12} className="text-slate-400"/>
                      <p className="text-[12.5px] text-slate-600">
                        {e.prescription.medication.brandName} {e.prescription.medication.dosage}
                      </p>
                    </div>
                  </div>
                  {e.askedAt && (
                    <p className="text-[12px] text-slate-500 shrink-0">Perguntado {fmtRelative(e.askedAt)}</p>
                  )}
                </div>
              </Card>
            ))}
          </div>
        )}
      </section>

      <section className="mt-10">
        <h2 className="text-[12px] font-bold tracking-[0.15em] uppercase text-slate-500 mb-3">
          A perguntar ({scheduled.length})
        </h2>
        {scheduled.length === 0 ? (
          <p className="text-[13px] text-slate-500">Nenhum retorno previsto no momento.</p>
        ) : (
          <div className="space-y-2">
            {scheduled.map((e) => (
              <Card key={e.id} className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <Link href={`/patients/${e.prescription.patient.id}`}
                      className="text-[14px] font-semibold text-brand-700 hover:text-brand-900">
                      {e.prescription.patient.name}
                    </Link>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <Icon.Pill size={12} className="text-slate-400"/>
                      <p className="text-[12.5px] text-slate-600">
                        {e.prescription.medication.brandName} {e.prescription.medication.dosage}
                      </p>
                    </div>
                  </div>
                  <p className="text-[12px] text-slate-500 shrink-0">
                    Estoque acaba {fmtRelative(e.expectedAt)}
                  </p>
                </div>
              </Card>
            ))}
          </div>
        )}
      </section>

      <section className="mt-10">
        <h2 className="text-[12px] font-bold tracking-[0.15em] uppercase text-slate-500 mb-3">
          Respostas recentes ({responded.length})
        </h2>
        {responded.length === 0 ? (
          <p className="text-[13px] text-slate-500">Nenhuma resposta ainda.</p>
        ) : (
          <div className="space-y-2">
            {responded.map((e) => (
              <Card key={e.id} className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <Link href={`/patients/${e.prescription.patient.id}`}
                      className="text-[14px] font-semibold text-brand-700 hover:text-brand-900">
                      {e.prescription.patient.name}
                    </Link>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <Icon.Pill size={12} className="text-slate-400"/>
                      <p className="text-[12.5px] text-slate-600">
                        {e.prescription.medication.brandName} {e.prescription.medication.dosage}
                      </p>
                    </div>
                  </div>
                  <ResponseBadge status={e.status} />
                </div>
              </Card>
            ))}
          </div>
        )}
      </section>
    </PageShell>
  );
}

function ResponseBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; tone: "emerald" | "amber" | "rose" | "slate" }> = {
    RESTOCKED_HERE: { label: "Comprou aqui", tone: "emerald" },
    RESTOCKED_AWAY: { label: "Comprou em outro lugar", tone: "amber" },
    STOPPING: { label: "Vai parar tratamento", tone: "rose" },
    EXPIRED: { label: "Sem resposta", tone: "slate" },
  };
  const m = map[status] ?? { label: status, tone: "slate" as const };
  return <Badge tone={m.tone}>{m.label}</Badge>;
}
