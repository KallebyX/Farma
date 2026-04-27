import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionContext } from "@/lib/auth/session";
import { prisma } from "@/lib/db";

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
    <main className="min-h-screen px-6 py-10">
      <div className="mx-auto max-w-5xl">
        <Link href="/dashboard" className="text-xs text-slate-500 hover:underline">
          ← Voltar
        </Link>
        <h1 className="mt-2 text-2xl font-bold text-brand-800">Catálogo de medicamentos</h1>
        <p className="text-sm text-slate-500">
          Base compartilhada usada nas prescrições. Cada item liga ao detentor do registro.
        </p>

        <form className="mt-6 flex gap-2">
          <input
            type="search"
            name="q"
            defaultValue={q}
            placeholder="Buscar por nome ou princípio ativo"
            className="flex-1 rounded-md border border-slate-300 px-3 py-2 text-sm"
          />
          <button
            type="submit"
            className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium hover:bg-slate-50"
          >
            Buscar
          </button>
        </form>

        <div className="mt-6 rounded-xl border border-slate-200 bg-white overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3 font-semibold">Marca</th>
                <th className="px-4 py-3 font-semibold">Princípio ativo</th>
                <th className="px-4 py-3 font-semibold">Dosagem</th>
                <th className="px-4 py-3 font-semibold">Forma</th>
                <th className="px-4 py-3 font-semibold">Fabricante</th>
              </tr>
            </thead>
            <tbody>
              {meds.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-slate-500">
                    Nenhum medicamento encontrado.
                  </td>
                </tr>
              ) : (
                meds.map((m) => (
                  <tr key={m.id} className="border-b border-slate-100 last:border-0">
                    <td className="px-4 py-3 font-medium text-slate-800">{m.brandName}</td>
                    <td className="px-4 py-3 text-slate-600">{m.activeIngredient}</td>
                    <td className="px-4 py-3 text-slate-600">{m.dosage}</td>
                    <td className="px-4 py-3 text-slate-600 lowercase">{m.form}</td>
                    <td className="px-4 py-3 text-slate-600">{m.manufacturerName ?? "—"}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
}
