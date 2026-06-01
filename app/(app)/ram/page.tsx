import { redirect } from "next/navigation";
import Link from "next/link";
import { getSessionContext } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { ReviewRamButton } from "./review-button";
import { PageShell, PageHeader, Card, Badge, EmptyState, Illus, Icon } from "@/components/ui";
import { fmtDateTimeBR, severityLabel } from "@/components/ui/utils";

export const dynamic = "force-dynamic";

export default async function RamInboxPage() {
  const ctx = await getSessionContext();
  if (!ctx) redirect("/sign-in");

  const reports = await prisma.rAMReport.findMany({
    where: {
      patient: { pharmacyId: ctx.pharmacyId },
    },
    include: {
      patient: { select: { id: true, name: true, phone: true } },
      prescription: {
        include: { medication: { select: { brandName: true, dosage: true, manufacturerName: true } } },
      },
      reviewedBy: { select: { name: true } },
    },
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
    take: 100,
  });

  const pending = reports.filter((r) => r.status === "PENDING_REVIEW");
  const reviewed = reports.filter((r) => r.status !== "PENDING_REVIEW");

  return (
    <PageShell>
      <PageHeader
        eyebrow="Farmacovigilância"
        title="Inbox de RAM"
        subtitle="Reações adversas reportadas pelos pacientes. Casos graves são destacados."
      />

      <section className="mt-8">
        <h2 className="text-[12px] font-bold tracking-[0.15em] uppercase text-slate-500 mb-3">
          Pendentes ({pending.length})
        </h2>
        {pending.length === 0 ? (
          <Card>
            <EmptyState
              illustration={<Illus.Chat size={90}/>}
              title="Nenhum caso pendente"
              hint="Ótimo! Todas as RAMs reportadas foram revisadas."
            />
          </Card>
        ) : (
          <div className="space-y-3">
            {pending.map((r) => (
              <Card key={r.id} className={`p-5 ${r.severity === "SEVERE" ? "border-rose-200 bg-rose-50/30" : ""}`}>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <SeverityBadge severity={r.severity} />
                      <span className="text-[12px] text-slate-500">{fmtDateTimeBR(r.createdAt)}</span>
                    </div>
                    <Link href={`/patients/${r.patient.id}`} className="mt-1.5 block text-[14px] font-semibold text-brand-700 hover:text-brand-900">
                      {r.patient.name}
                    </Link>
                    {r.prescription && (
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <Icon.Pill size={12} className="text-slate-400"/>
                        <p className="text-[12.5px] text-slate-600">
                          {r.prescription.medication.brandName} {r.prescription.medication.dosage}
                          {r.prescription.medication.manufacturerName
                            ? ` · ${r.prescription.medication.manufacturerName}`
                            : ""}
                        </p>
                      </div>
                    )}
                    {r.symptoms.length > 0 && (
                      <p className="mt-1.5 text-[12.5px] text-slate-700">
                        <span className="font-medium">Sintomas:</span> {r.symptoms.join(", ")}
                      </p>
                    )}
                    {r.freeText && (
                      <p className="mt-1 text-[12px] italic text-slate-500">&ldquo;{r.freeText}&rdquo;</p>
                    )}
                  </div>
                  <ReviewRamButton ramId={r.id} />
                </div>
              </Card>
            ))}
          </div>
        )}
      </section>

      <section className="mt-10">
        <h2 className="text-[12px] font-bold tracking-[0.15em] uppercase text-slate-500 mb-3">
          Revisados ({reviewed.length})
        </h2>
        {reviewed.length === 0 ? (
          <p className="text-[13px] text-slate-500">Nada revisado ainda.</p>
        ) : (
          <div className="space-y-2">
            {reviewed.map((r) => (
              <Card key={r.id} className="px-4 py-3">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3 min-w-0">
                    <SeverityBadge severity={r.severity} />
                    <Link href={`/patients/${r.patient.id}`} className="text-[13px] font-medium text-slate-700 hover:text-brand-700 truncate">
                      {r.patient.name}
                    </Link>
                    {r.vigimedProtocol && (
                      <span className="text-[11px] text-brand-700 font-mono shrink-0">
                        VigiMed {r.vigimedProtocol}
                      </span>
                    )}
                  </div>
                  <span className="text-[12px] text-slate-500 shrink-0">
                    {r.status === "FORWARDED_VIGIMED" ? "encaminhado" : "revisado"} por{" "}
                    {r.reviewedBy?.name ?? "—"}
                  </span>
                </div>
              </Card>
            ))}
          </div>
        )}
      </section>
    </PageShell>
  );
}

function SeverityBadge({ severity }: { severity: "MILD" | "MODERATE" | "SEVERE" }) {
  const map = {
    MILD: { label: "Leve", tone: "sky" as const },
    MODERATE: { label: "Moderada", tone: "amber" as const },
    SEVERE: { label: "Grave", tone: "danger" as const },
  };
  const { label, tone } = map[severity];
  return <Badge tone={tone}>{label}</Badge>;
}
