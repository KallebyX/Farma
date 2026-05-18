import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionContext } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { PageShell, PageHeader, Card, Button, Input, Select, EmptyState, Illus, PatientStatusBadge, Badge, Icon } from "@/components/ui";
import { maskCpf } from "@/components/ui/utils";

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
  const STATUS_VALUES = ["ACTIVE", "PAUSED", "WITHDRAWN", "ALL"] as const;
  type StatusFilter = typeof STATUS_VALUES[number];
  const rawStatus = typeof params.status === "string" ? params.status : "ACTIVE";
  const status: StatusFilter = (STATUS_VALUES as readonly string[]).includes(rawStatus)
    ? (rawStatus as StatusFilter)
    : "ACTIVE";

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
      consents: {
        where: { scope: "SERVICE" },
        select: { granted: true },
        orderBy: { capturedAt: "desc" as const },
        take: 1,
      },
    },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return (
    <PageShell>
      <div className="flex items-start justify-between gap-4">
        <PageHeader
          eyebrow="Gestão"
          title="Pacientes"
          subtitle="Cadastro, lembretes de medicação e histórico de adesão."
        />
        <Link href="/patients/new">
          <Button icon={<Icon.Plus size={15}/>}>
            Cadastrar paciente
          </Button>
        </Link>
      </div>

      <form className="mt-6 flex gap-2">
        <Input
          type="search"
          name="q"
          defaultValue={q}
          placeholder="Buscar por nome, telefone ou CPF"
          icon={<Icon.Search size={15}/>}
          className="flex-1"
        />
        <Select name="status" defaultValue={status} className="w-40">
          <option value="ACTIVE">Ativos</option>
          <option value="PAUSED">Pausados</option>
          <option value="WITHDRAWN">Retirados</option>
          <option value="ALL">Todos</option>
        </Select>
        <Button type="submit" variant="secondary" icon={<Icon.Filter size={14}/>}>
          Filtrar
        </Button>
      </form>

      <Card className="mt-6 overflow-hidden">
        {patients.length === 0 ? (
          <EmptyState
            illustration={<Illus.Empty size={100}/>}
            title={q ? "Nenhum paciente encontrado" : "Nenhum paciente cadastrado"}
            hint={q ? `Nenhum resultado para "${q}". Tente outros termos.` : "Cadastre o primeiro paciente da farmácia."}
            action={
              !q ? (
                <Link href="/patients/new">
                  <Button icon={<Icon.Plus size={15}/>}>Cadastrar paciente</Button>
                </Link>
              ) : undefined
            }
          />
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200 text-left text-[11px] uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3 font-semibold">Nome</th>
                <th className="px-4 py-3 font-semibold">Telefone</th>
                <th className="px-4 py-3 font-semibold hidden sm:table-cell">CPF</th>
                <th className="px-4 py-3 font-semibold">Medicamentos</th>
                <th className="px-4 py-3 font-semibold hidden md:table-cell">LGPD</th>
                <th className="px-4 py-3 font-semibold">Status</th>
              </tr>
            </thead>
            <tbody>
              {patients.map((p) => {
                const polypharmacy = p.prescriptions.length >= 5;
                return (
                  <tr key={p.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/70 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Link href={`/patients/${p.id}`} className="font-medium text-brand-700 hover:text-brand-900 hover:underline">
                          {p.name}
                        </Link>
                        {polypharmacy && (
                          <Badge tone="amber" size="sm">Polifarmácia</Badge>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-slate-600 text-[13px]">{p.phone}</td>
                    <td className="px-4 py-3 text-slate-500 text-[12.5px] font-mono hidden sm:table-cell">
                      {maskCpf(p.cpf)}
                    </td>
                    <td className="px-4 py-3 text-slate-600 text-[13px]">
                      {p.prescriptions.length === 0 ? (
                        <span className="text-slate-400">—</span>
                      ) : (
                        <span>{p.prescriptions.length} ativo{p.prescriptions.length > 1 ? "s" : ""}</span>
                      )}
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      {p.consentGiven || p.consents[0]?.granted ? (
                        <Badge tone="emerald" size="sm">Sim</Badge>
                      ) : (
                        <Badge tone="slate" size="sm">Não</Badge>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <PatientStatusBadge status={p.status} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </Card>
    </PageShell>
  );
}
