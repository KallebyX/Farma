import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionContext } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { ReviewRamButton } from "./review-button";

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
    <main className="min-h-screen px-6 py-10">
      <div className="mx-auto max-w-5xl">
        <Link href="/dashboard" className="text-xs text-slate-500 hover:underline">
          ← Voltar
        </Link>
        <h1 className="mt-2 text-2xl font-bold text-brand-800">Inbox de RAM</h1>
        <p className="text-sm text-slate-500">
          Reações adversas reportadas pelos pacientes. Casos graves são destacados.
        </p>

        <section className="mt-6">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-700">
            Pendentes ({pending.length})
          </h2>
          {pending.length === 0 ? (
            <p className="mt-3 text-sm text-slate-500">Nenhum caso pendente.</p>
          ) : (
            <ul className="mt-3 space-y-3">
              {pending.map((r) => (
                <li
                  key={r.id}
                  className={`rounded-xl border bg-white p-4 ${
                    r.severity === "SEVERE" ? "border-red-200 bg-red-50" : "border-slate-200"
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <SeverityBadge severity={r.severity} />
                        <span className="text-xs text-slate-500">
                          {new Intl.DateTimeFormat("pt-BR", {
                            dateStyle: "short",
                            timeStyle: "short",
                          }).format(r.createdAt)}
                        </span>
                      </div>
                      <p className="mt-1 text-sm font-semibold text-slate-800">{r.patient.name}</p>
                      {r.prescription ? (
                        <p className="text-xs text-slate-600">
                          💊 {r.prescription.medication.brandName} {r.prescription.medication.dosage}
                          {r.prescription.medication.manufacturerName
                            ? ` · ${r.prescription.medication.manufacturerName}`
                            : ""}
                        </p>
                      ) : null}
                      {r.symptoms.length > 0 ? (
                        <p className="mt-1 text-xs text-slate-700">
                          Sintomas: {r.symptoms.join(", ")}
                        </p>
                      ) : null}
                      {r.freeText ? (
                        <p className="mt-1 text-xs italic text-slate-500">"{r.freeText}"</p>
                      ) : null}
                    </div>
                    <ReviewRamButton ramId={r.id} />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="mt-10">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-700">
            Revisados ({reviewed.length})
          </h2>
          {reviewed.length === 0 ? (
            <p className="mt-3 text-sm text-slate-500">Nada revisado ainda.</p>
          ) : (
            <ul className="mt-3 space-y-2">
              {reviewed.map((r) => (
                <li key={r.id} className="rounded-md border border-slate-200 bg-white px-3 py-2 text-sm">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-medium">{r.patient.name}</span>{" "}
                      <SeverityBadge severity={r.severity} />
                      {r.vigimedProtocol ? (
                        <span className="ml-2 text-[11px] text-brand-700 font-mono">
                          VigiMed {r.vigimedProtocol}
                        </span>
                      ) : null}
                    </div>
                    <span className="text-xs text-slate-500">
                      {r.status === "FORWARDED_VIGIMED" ? "encaminhado" : "revisado"} por{" "}
                      {r.reviewedBy?.name ?? "—"}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </main>
  );
}

function SeverityBadge({ severity }: { severity: "MILD" | "MODERATE" | "SEVERE" }) {
  const map = {
    MILD: { label: "Leve", cls: "bg-blue-50 text-blue-700 border-blue-100" },
    MODERATE: { label: "Moderada", cls: "bg-amber-50 text-amber-700 border-amber-100" },
    SEVERE: { label: "Grave", cls: "bg-red-100 text-red-800 border-red-200" },
  } as const;
  const m = map[severity];
  return (
    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-semibold ${m.cls}`}>
      {m.label}
    </span>
  );
}
