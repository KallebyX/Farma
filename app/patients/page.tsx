import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionContext } from "@/lib/auth/session";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function PatientsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const ctx = await getSessionContext();
  if (!ctx) redirect("/sign-in");

  const params = await searchParams;
  const q = typeof params.q === "string" ? params.q.trim() : "";
  const status = (typeof params.status === "string" ? params.status : "ACTIVE") as
    | "ACTIVE"
    | "PAUSED"
    | "WITHDRAWN"
    | "ALL";

  const patients = await prisma.patient.findMany({
    where: {
      pharmacyId: ctx.pharmacyId,
      ...(status !== "ALL" ? { status } : {}),
      ...(q
        ? {
            OR: [
              { name: { contains: q, mode: "insensitive" } },
              { phone: { contains: q } },
              { cpf: { contains: q } },
            ],
          }
        : {}),
    },
    include: {
      prescriptions: {
        where: { status: "ACTIVE" },
        select: { id: true, medication: { select: { brandName: true, dosage: true } } },
      },
    },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return (
    <main className="min-h-screen px-6 py-10">
      <div className="mx-auto max-w-5xl">
        <div className="flex items-start justify-between">
          <div>
            <Link href="/dashboard" className="text-xs text-slate-500 hover:underline">
              ← Voltar
            </Link>
            <h1 className="mt-2 text-2xl font-bold text-brand-800">Pacientes</h1>
            <p className="text-sm text-slate-500">
              Cadastro, lembretes e histórico de adesão.
            </p>
          </div>
          <Link
            href="/patients/new"
            className="rounded-md bg-brand-500 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-600"
          >
            Cadastrar paciente
          </Link>
        </div>

        <form className="mt-6 flex gap-2">
          <input
            type="search"
            name="q"
            defaultValue={q}
            placeholder="Buscar por nome, telefone ou CPF"
            className="flex-1 rounded-md border border-slate-300 px-3 py-2 text-sm"
          />
          <select
            name="status"
            defaultValue={status}
            className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
          >
            <option value="ACTIVE">Ativos</option>
            <option value="PAUSED">Pausados</option>
            <option value="WITHDRAWN">Retirados</option>
            <option value="ALL">Todos</option>
          </select>
          <button
            type="submit"
            className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium hover:bg-slate-50"
          >
            Filtrar
          </button>
        </form>

        <div className="mt-6 rounded-xl border border-slate-200 bg-white overflow-hidden">
          {patients.length === 0 ? (
            <p className="px-4 py-10 text-center text-sm text-slate-500">
              Nenhum paciente encontrado.
            </p>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3 font-semibold">Nome</th>
                  <th className="px-4 py-3 font-semibold">Telefone</th>
                  <th className="px-4 py-3 font-semibold">Medicamentos</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody>
                {patients.map((p) => {
                  const polypharmacy = p.prescriptions.length >= 5;
                  return (
                    <tr key={p.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
                      <td className="px-4 py-3">
                        <Link href={`/patients/${p.id}`} className="font-medium text-brand-700 hover:underline">
                          {p.name}
                        </Link>
                        {polypharmacy ? (
                          <span className="ml-2 inline-flex items-center rounded bg-amber-50 px-1.5 py-0.5 text-[10px] font-semibold text-amber-700 border border-amber-200">
                            POLIFARMÁCIA
                          </span>
                        ) : null}
                      </td>
                      <td className="px-4 py-3 text-slate-600">{p.phone}</td>
                      <td className="px-4 py-3 text-slate-600">
                        {p.prescriptions.length === 0 ? (
                          <span className="text-slate-400">—</span>
                        ) : (
                          <span>
                            {p.prescriptions.length} ativo{p.prescriptions.length > 1 ? "s" : ""}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge status={p.status} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </main>
  );
}

function StatusBadge({ status }: { status: "ACTIVE" | "PAUSED" | "WITHDRAWN" }) {
  const map = {
    ACTIVE: { label: "Ativo", className: "bg-green-50 text-green-700 border-green-100" },
    PAUSED: { label: "Pausado", className: "bg-amber-50 text-amber-700 border-amber-100" },
    WITHDRAWN: { label: "Retirado", className: "bg-slate-100 text-slate-600 border-slate-200" },
  } as const;
  const m = map[status];
  return (
    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${m.className}`}>
      {m.label}
    </span>
  );
}
