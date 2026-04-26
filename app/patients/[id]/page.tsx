import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getSessionContext } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { summarizePosology } from "@/lib/prescriptions/posology";
import { AddPrescription } from "./add-prescription";

export const dynamic = "force-dynamic";

export default async function PatientDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const ctx = await getSessionContext();
  if (!ctx) redirect("/sign-in");
  const { id } = await params;

  const patient = await prisma.patient.findFirst({
    where: { id, pharmacyId: ctx.pharmacyId },
    include: {
      prescriptions: {
        orderBy: [{ status: "asc" }, { createdAt: "desc" }],
        include: {
          medication: true,
          adherence: { orderBy: { scheduledFor: "desc" }, take: 30 },
        },
      },
      consents: { orderBy: { capturedAt: "desc" }, take: 5 },
      ramReports: { orderBy: { createdAt: "desc" }, take: 5 },
    },
  });
  if (!patient) notFound();

  const allAdherence = patient.prescriptions.flatMap((p) => p.adherence);
  const taken = allAdherence.filter((e) => e.outcome === "TAKEN" || e.outcome === "TAKEN_LATE").length;
  const adherenceRate = allAdherence.length === 0 ? null : Math.round((taken / allAdherence.length) * 100);
  const activeRx = patient.prescriptions.filter((p) => p.status === "ACTIVE");
  const polypharmacy = activeRx.length >= 5;
  const serviceConsent = patient.consents.find((c) => c.scope === "SERVICE");

  return (
    <main className="min-h-screen px-6 py-10">
      <div className="mx-auto max-w-5xl">
        <Link href="/patients" className="text-xs text-slate-500 hover:underline">
          ← Pacientes
        </Link>

        <header className="mt-2 flex items-start justify-between gap-6">
          <div>
            <h1 className="text-2xl font-bold text-brand-800">{patient.name}</h1>
            <p className="text-sm text-slate-500">
              {patient.phone}
              {patient.cpf ? ` · CPF ${maskCpf(patient.cpf)}` : ""}
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <PatientStatusBadge status={patient.status} />
              {polypharmacy ? (
                <span className="inline-flex items-center rounded-full bg-amber-50 px-2 py-0.5 text-xs font-semibold text-amber-700 border border-amber-200">
                  Polifarmácia ({activeRx.length})
                </span>
              ) : null}
              {serviceConsent ? (
                <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium border ${
                  serviceConsent.granted
                    ? "bg-green-50 text-green-700 border-green-100"
                    : "bg-red-50 text-red-700 border-red-100"
                }`}>
                  Consentimento {serviceConsent.granted ? "concedido" : "negado"}
                </span>
              ) : (
                <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600 border border-slate-200">
                  Consentimento pendente
                </span>
              )}
            </div>
          </div>
          <div className="text-right">
            <div className="rounded-lg bg-white border border-slate-200 px-4 py-3">
              <p className="text-[11px] uppercase tracking-wide text-slate-500">Adesão (30 últimas)</p>
              <p className={`mt-0.5 text-2xl font-bold ${adherenceColor(adherenceRate)}`}>
                {adherenceRate === null ? "—" : `${adherenceRate}%`}
              </p>
            </div>
          </div>
        </header>

        <section className="mt-8">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-700">
              Medicamentos ({activeRx.length} ativo{activeRx.length === 1 ? "" : "s"})
            </h2>
            <AddPrescription patientId={patient.id} />
          </div>
          {patient.prescriptions.length === 0 ? (
            <p className="mt-3 rounded-xl border border-dashed border-slate-300 bg-white px-4 py-8 text-center text-sm text-slate-500">
              Nenhum medicamento cadastrado.
            </p>
          ) : (
            <div className="mt-3 space-y-3">
              {patient.prescriptions.map((p) => (
                <article key={p.id} className="rounded-xl border border-slate-200 bg-white p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-slate-800">
                        💊 {p.medication.brandName} {p.medication.dosage}
                      </p>
                      <p className="text-xs text-slate-500">
                        {p.medication.activeIngredient}
                        {p.medication.manufacturerName ? ` · ${p.medication.manufacturerName}` : ""}
                      </p>
                      <p className="mt-2 text-sm text-slate-700">
                        {summarizePosology({
                          intervalHours: p.intervalHours,
                          fixedTimes: p.fixedTimes,
                          startDate: p.startDate,
                          endDate: p.endDate,
                          durationDays: p.durationDays,
                          doseAmount: p.doseAmount,
                          instructions: p.instructions,
                        })}
                      </p>
                    </div>
                    <RxStatusBadge status={p.status} />
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>

        <section className="mt-8">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-700">
            RAMs reportadas
          </h2>
          {patient.ramReports.length === 0 ? (
            <p className="mt-3 text-sm text-slate-500">Nenhum relato.</p>
          ) : (
            <ul className="mt-3 space-y-2">
              {patient.ramReports.map((r) => (
                <li key={r.id} className="rounded-md border border-slate-200 bg-white px-3 py-2 text-sm">
                  <span className="font-medium">{severityLabel(r.severity)}</span>{" "}
                  · {r.symptoms.join(", ") || "(sintomas não informados)"}{" "}
                  <span className="text-slate-500">
                    · {new Intl.DateTimeFormat("pt-BR").format(r.createdAt)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </main>
  );
}

function PatientStatusBadge({ status }: { status: "ACTIVE" | "PAUSED" | "WITHDRAWN" }) {
  const map = {
    ACTIVE: { label: "Ativo", cls: "bg-green-50 text-green-700 border-green-100" },
    PAUSED: { label: "Pausado", cls: "bg-amber-50 text-amber-700 border-amber-100" },
    WITHDRAWN: { label: "Retirado", cls: "bg-slate-100 text-slate-600 border-slate-200" },
  } as const;
  const m = map[status];
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium border ${m.cls}`}>
      {m.label}
    </span>
  );
}

function RxStatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    ACTIVE: "bg-green-50 text-green-700 border-green-100",
    PAUSED: "bg-amber-50 text-amber-700 border-amber-100",
    COMPLETED: "bg-slate-100 text-slate-600 border-slate-200",
    CANCELLED: "bg-red-50 text-red-700 border-red-100",
  };
  return (
    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${map[status] ?? ""}`}>
      {status.toLowerCase()}
    </span>
  );
}

function adherenceColor(rate: number | null) {
  if (rate === null) return "text-slate-400";
  if (rate >= 80) return "text-green-700";
  if (rate >= 60) return "text-amber-700";
  return "text-red-700";
}

function severityLabel(s: string) {
  return s === "MILD" ? "Leve" : s === "MODERATE" ? "Moderada" : "Grave";
}

function maskCpf(cpf: string): string {
  if (cpf.length !== 11) return cpf;
  return `***.${cpf.slice(3, 6)}.${cpf.slice(6, 9)}-**`;
}
