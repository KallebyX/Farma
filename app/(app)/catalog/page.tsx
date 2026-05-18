import { redirect } from "next/navigation";
import { getSessionContext } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { AddMedication } from "./add-medication";
import { FORM_LABELS } from "./constants";
import { PageShell, PageHeader, Card, Button, Input, EmptyState, Illus, Icon } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function CatalogPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const ctx = await getSessionContext();
  if (!ctx) redirect("/sign-in");
  const params = await searchParams;
  const q = typeof params.q === "string" ? params.q.trim() : "";

  const meds = await prisma.medicationCatalog.findMany({
    where: q
      ? {
          OR: [
            { brandName: { contains: q, mode: "insensitive" } },
            { activeIngredient: { contains: q, mode: "insensitive" } },
          ],
        }
      : undefined,
    orderBy: [{ brandName: "asc" }, { dosage: "asc" }],
    take: 200,
  });

  return (
    <PageShell>
      <div className="flex items-start justify-between gap-4">
        <PageHeader
          eyebrow="Base de dados"
          title="Catálogo de medicamentos"
          subtitle="Base compartilhada usada nas prescrições. Cada item liga ao detentor do registro."
        />
        {(ctx.role === "OWNER" || ctx.role === "PHARMACIST") && <AddMedication />}
      </div>

      <form className="mt-6 flex gap-2">
        <Input
          type="search"
          name="q"
          defaultValue={q}
          placeholder="Buscar por nome comercial ou princípio ativo"
          icon={<Icon.Search size={15}/>}
          className="flex-1"
        />
        <Button type="submit" variant="secondary" icon={<Icon.Search size={14}/>}>
          Buscar
        </Button>
      </form>

      <Card className="mt-6 overflow-hidden">
        {meds.length === 0 ? (
          <EmptyState
            illustration={<Illus.PillBottle size={100}/>}
            title={q ? "Nenhum medicamento encontrado" : "Catálogo vazio"}
            hint={q ? `Nenhum resultado para "${q}".` : "Adicione o primeiro medicamento ao catálogo."}
          />
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200 text-left text-[11px] uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3 font-semibold">Marca</th>
                <th className="px-4 py-3 font-semibold">Princípio ativo</th>
                <th className="px-4 py-3 font-semibold">Dosagem</th>
                <th className="px-4 py-3 font-semibold hidden md:table-cell">Forma</th>
                <th className="px-4 py-3 font-semibold hidden lg:table-cell">Fabricante</th>
              </tr>
            </thead>
            <tbody>
              {meds.map((m) => (
                <tr key={m.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/70 transition-colors">
                  <td className="px-4 py-3 font-medium text-slate-800 text-[13px]">{m.brandName}</td>
                  <td className="px-4 py-3 text-slate-600 text-[13px]">{m.activeIngredient}</td>
                  <td className="px-4 py-3 text-slate-600 text-[13px]">{m.dosage}</td>
                  <td className="px-4 py-3 text-slate-600 text-[13px] hidden md:table-cell">
                    {FORM_LABELS[m.form] ?? m.form.toLowerCase()}
                  </td>
                  <td className="px-4 py-3 text-slate-600 text-[13px] hidden lg:table-cell">
                    {m.manufacturerName ?? "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </PageShell>
  );
}
