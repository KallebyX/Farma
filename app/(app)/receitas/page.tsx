import { redirect } from "next/navigation";
import { getSessionContext } from "@/lib/auth/session";
import { listLeads, recentDispensations } from "@/lib/rx";
import { PageShell, PageHeader } from "@/components/ui";
import { DispensePanel } from "@/components/rx/dispense-panel";

export const dynamic = "force-dynamic";

export default async function ReceitasPage() {
  const ctx = await getSessionContext();
  if (!ctx) redirect("/sign-in");

  const [leads, dispensations] = await Promise.all([
    listLeads(ctx.pharmacyId),
    recentDispensations(ctx.pharmacyId),
  ]);

  return (
    <PageShell>
      <PageHeader
        eyebrow="Dispensação"
        title="Receitas digitais"
        subtitle="Receitas enviadas pelos pacientes (qualificadas/ICP e comuns) e dispensações com rastreabilidade (lote, nota, CRM)."
      />
      <div className="mt-8">
        <DispensePanel
          leads={leads.map((l) => ({ ...l, createdAt: l.createdAt.toISOString() }))}
          dispensations={dispensations.map((d) => ({ ...d, createdAt: d.createdAt.toISOString() }))}
        />
      </div>
    </PageShell>
  );
}
