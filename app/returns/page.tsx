import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionContext } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { formatRelativeDays } from "@/lib/utils";

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
    ["RESTOCKED_HERE", "RESTOCKED_AWAY", "STOPPING"].includes(e.status),
  );

  // Aggregate ROI metric for the pharmacy
  const lastMonth = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const restockedCount = await prisma.returnExpectation.count({
    where: {
      prescription: { patient: { pharmacyId: ctx.pharmacyId } },
      status: "RESTOCKED_HERE",
      respondedAt: { gte: lastMonth },
    },
  });

  return (
    <main className="min-h-screen px-6 py-10">
      <div className="mx-auto max-w-5xl">
        <Link href="/dashboard" className="text-xs text-slate-500 hover:underline">
          ← Voltar
        </Link>
        <h1 className="mt-2 text-2xl font-bold text-brand-800">Retornos esperados</h1>
        <p className="text-sm text-slate-500">
          Pacientes cujo estoque está acabando. O bot pergunta automaticamente se compraram
          reposição. Esta é a feature que mais gera retorno direto à farmácia.
        </p>

        <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Stat label="Aguardando perguntar" value={scheduled.length} />
          <Stat label="Perguntados (sem resposta)" value={asked.length} />
          <Stat label="Resgatados (30d)" value={restockedCount} highlight />
        </div>

        <Section title={`Perguntados — aguardando resposta (${asked.length})`}>
          {asked.length === 0 ? (
            <Empty>Nenhuma pergunta aguardando resposta.</Empty>
          ) : (
            <List>
              {asked.map((e) => (
                <Card key={e.id}>
                  <Header
                    name={e.prescription.patient.name}
                    medication={`${e.prescription.medication.brandName} ${e.prescription.medication.dosage}`}
                    patientId={e.prescription.patient.id}
                  />
                  <p className="mt-1 text-xs text-slate-500">
                    Perguntado em{" "}
                    {e.askedAt
                      ? new Intl.DateTimeFormat("pt-BR", {
                          dateStyle: "short",
                          timeStyle: "short",
                        }).format(e.askedAt)
                      : "—"}
                  </p>
                </Card>
              ))}
            </List>
          )}
        </Section>

        <Section title={`A perguntar (${scheduled.length})`}>
          {scheduled.length === 0 ? (
            <Empty>Nenhum retorno previsto no momento.</Empty>
          ) : (
            <List>
              {scheduled.map((e) => (
                <Card key={e.id}>
                  <Header
                    name={e.prescription.patient.name}
                    medication={`${e.prescription.medication.brandName} ${e.prescription.medication.dosage}`}
                    patientId={e.prescription.patient.id}
                  />
                  <p className="mt-1 text-xs text-slate-500">
                    Estoque deve acabar — {formatRelativeDays(e.expectedAt)}
                  </p>
                </Card>
              ))}
            </List>
          )}
        </Section>

        <Section title={`Respostas recentes (${responded.length})`}>
          {responded.length === 0 ? (
            <Empty>Nenhuma resposta ainda.</Empty>
          ) : (
            <List>
              {responded.map((e) => (
                <Card key={e.id}>
                  <Header
                    name={e.prescription.patient.name}
                    medication={`${e.prescription.medication.brandName} ${e.prescription.medication.dosage}`}
                    patientId={e.prescription.patient.id}
                  />
                  <ResponseBadge status={e.status} />
                </Card>
              ))}
            </List>
          )}
        </Section>
      </div>
    </main>
  );
}

function Stat({ label, value, highlight }: { label: string; value: number; highlight?: boolean }) {
  return (
    <div className={`rounded-xl border p-4 ${highlight ? "bg-brand-50 border-brand-200" : "bg-white border-slate-200"}`}>
      <p className="text-xs uppercase tracking-wide text-slate-500">{label}</p>
      <p className={`mt-1 text-2xl font-bold ${highlight ? "text-brand-800" : "text-slate-800"}`}>{value}</p>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-8">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-700">{title}</h2>
      <div className="mt-3">{children}</div>
    </section>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return (
    <p className="rounded-xl border border-dashed border-slate-300 bg-white px-4 py-8 text-center text-sm text-slate-500">
      {children}
    </p>
  );
}

function List({ children }: { children: React.ReactNode }) {
  return <div className="space-y-2">{children}</div>;
}

function Card({ children }: { children: React.ReactNode }) {
  return <article className="rounded-xl border border-slate-200 bg-white p-4">{children}</article>;
}

function Header({
  name,
  medication,
  patientId,
}: {
  name: string;
  medication: string;
  patientId: string;
}) {
  return (
    <div className="flex items-start justify-between">
      <div>
        <Link href={`/patients/${patientId}`} className="text-sm font-semibold text-brand-700 hover:underline">
          {name}
        </Link>
        <p className="text-xs text-slate-500">💊 {medication}</p>
      </div>
    </div>
  );
}

function ResponseBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    RESTOCKED_HERE: { label: "Comprou aqui", cls: "bg-green-50 text-green-700 border-green-100" },
    RESTOCKED_AWAY: { label: "Comprou em outro lugar", cls: "bg-amber-50 text-amber-700 border-amber-100" },
    STOPPING: { label: "Vai parar tratamento", cls: "bg-red-50 text-red-700 border-red-100" },
    EXPIRED: { label: "Sem resposta", cls: "bg-slate-100 text-slate-600 border-slate-200" },
  };
  const m = map[status] ?? { label: status, cls: "bg-slate-100 text-slate-600 border-slate-200" };
  return (
    <span className={`mt-2 inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${m.cls}`}>
      {m.label}
    </span>
  );
}
