import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getSessionContext } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { summarizePosology } from "@/lib/prescriptions/posology";
import { AddPrescription } from "./add-prescription";
import { ConsentButton } from "./consent-button";
import { CustomMedications } from "./custom-medications";
import { MessagesThread } from "@/components/messages/messages-thread";
import {
  PageShell, Card, Badge, PatientStatusBadge, RxStatusBadge, Button, Icon,
} from "@/components/ui";
import { maskCpf, severityLabel, severityTone, fmtDateBR } from "@/components/ui/utils";

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
      consents: { where: { scope: "SERVICE" }, orderBy: { capturedAt: "desc" }, take: 1 },
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
    <PageShell>
      <Link href="/patients" className="inline-flex items-center gap-1.5 text-[12.5px] text-slate-500 hover:text-brand-700 transition-colors mb-4">
        <Icon.ArrowBack size={14}/>
        Voltar a Pacientes
      </Link>

      <Card className="p-6">
        <div className="flex items-start justify-between gap-6">
          <div>
            <h1 className="text-[22px] font-semibold text-slate-900">{patient.name}</h1>
            <p className="text-[13px] text-slate-500 mt-0.5">
              {patient.phone}
              {patient.cpf ? ` · CPF ${maskCpf(patient.cpf)}` : ""}
              {patient.age != null ? ` · ${patient.age} anos` : ""}
            </p>
            {patient.allergies && (patient.allergies as string[]).length > 0 && (
              <p className="text-[12px] text-rose-600 mt-0.5">
                Alergias: {(patient.allergies as string[]).join(", ")}
              </p>
            )}
            <div className="mt-3 flex flex-wrap gap-2">
              <PatientStatusBadge status={patient.status} />
              {polypharmacy && (
                <Badge tone="amber">Polifarmácia ({activeRx.length})</Badge>
              )}
              {serviceConsent ? (
                <Badge tone={serviceConsent.granted ? "emerald" : "rose"}>
                  Consentimento {serviceConsent.granted ? "concedido" : "negado"}
                </Badge>
              ) : (
                <ConsentButton patientId={patient.id} />
              )}
            </div>
          </div>
          <div className="text-right shrink-0">
            <Card className="px-5 py-4">
              <p className="text-[10.5px] uppercase tracking-[0.12em] text-slate-500 font-semibold">Adesão</p>
              <p className={`mt-1 text-3xl font-bold tabular-nums ${adherenceColor(adherenceRate)}`}>
                {adherenceRate === null ? "—" : `${adherenceRate}%`}
              </p>
              <p className="text-[10.5px] text-slate-400 mt-0.5">30 últimas doses</p>
            </Card>
          </div>
        </div>
      </Card>

      <section className="mt-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-[13px] font-semibold uppercase tracking-wide text-slate-600">
            Medicamentos prescritos ({activeRx.length} ativo{activeRx.length !== 1 ? "s" : ""})
          </h2>
          <AddPrescription patientId={patient.id} />
        </div>

        {patient.prescriptions.length === 0 ? (
          <Card className="p-8 text-center">
            <p className="text-[13px] text-slate-500">Nenhum medicamento cadastrado.</p>
          </Card>
        ) : (
          <div className="space-y-3">
            {patient.prescriptions.map((p) => (
              <Card key={p.id} className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <Icon.Pill size={14} className="text-brand-600 shrink-0"/>
                      <p className="text-[13.5px] font-semibold text-slate-800">
                        {p.medication.brandName} {p.medication.dosage}
                      </p>
                    </div>
                    <p className="text-[12px] text-slate-500 mt-0.5 ml-5">
                      {p.medication.activeIngredient}
                      {p.medication.manufacturerName ? ` · ${p.medication.manufacturerName}` : ""}
                    </p>
                    <p className="mt-2 text-[13px] text-slate-700">
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
                    {(p.batchLot || p.expiryDate) && (
                      <div className="mt-2 ml-5 flex flex-wrap items-center gap-2">
                        {p.batchLot && <Badge tone="slate">Lote {p.batchLot}</Badge>}
                        {p.expiryDate && <ExpiryBadge date={p.expiryDate} />}
                      </div>
                    )}
                  </div>
                  <RxStatusBadge status={p.status} />
                </div>
              </Card>
            ))}
          </div>
        )}
      </section>

      {patient.customMedications && (patient.customMedications as string[]).length > 0 && (
        <section className="mt-6">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-[13px] font-semibold uppercase tracking-wide text-slate-600">
              Medicamentos avulsos
            </h2>
          </div>
          <CustomMedications
            patientId={patient.id}
            initialMeds={patient.customMedications as string[]}
          />
        </section>
      )}

      <section className="mt-6">
        <h2 className="text-[13px] font-semibold uppercase tracking-wide text-slate-600 mb-3">
          RAMs reportadas
        </h2>
        {patient.ramReports.length === 0 ? (
          <p className="text-[13px] text-slate-500">Nenhum relato.</p>
        ) : (
          <div className="space-y-2">
            {patient.ramReports.map((r) => {
              const tone = severityTone(r.severity) as "sky" | "amber" | "danger";
              return (
                <Card key={r.id} className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <Badge tone={tone}>{severityLabel(r.severity)}</Badge>
                    <p className="text-[13px] text-slate-700 flex-1">
                      {r.symptoms.join(", ") || "(sintomas não informados)"}
                    </p>
                    <p className="text-[11.5px] text-slate-400">{fmtDateBR(r.createdAt)}</p>
                  </div>
                  {r.freeText && (
                    <p className="mt-1 text-[12px] italic text-slate-500 ml-0">&ldquo;{r.freeText}&rdquo;</p>
                  )}
                </Card>
              );
            })}
          </div>
        )}
      </section>

      <section className="mt-6">
        <MessagesThread apiBase={`/api/patients/${patient.id}/messages`} />
      </section>
    </PageShell>
  );
}

function ExpiryBadge({ date }: { date: Date }) {
  const days = Math.ceil((new Date(date).getTime() - Date.now()) / 86_400_000);
  const tone = days < 0 ? "danger" : days <= 30 ? "rose" : days <= 90 ? "amber" : "emerald";
  return <Badge tone={tone}>⚠ {days < 0 ? `Vencido em ${fmtDateBR(date)}` : `Vence ${fmtDateBR(date)}`}</Badge>;
}

function adherenceColor(rate: number | null) {
  if (rate === null) return "text-slate-400";
  if (rate >= 80) return "text-emerald-700";
  if (rate >= 60) return "text-amber-700";
  return "text-rose-700";
}
