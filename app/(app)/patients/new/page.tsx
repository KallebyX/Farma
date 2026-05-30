import { redirect } from "next/navigation";
import Link from "next/link";
import { getSessionContext } from "@/lib/auth/session";
import { NewPatientForm } from "./form";
import { PageShell, PageHeader, Card, Icon } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function NewPatientPage() {
  const ctx = await getSessionContext();
  if (!ctx) redirect("/sign-in");

  return (
    <PageShell narrow>
      <Link href="/patients" className="inline-flex items-center gap-1.5 text-[12.5px] text-slate-500 hover:text-brand-700 transition-colors mb-4">
        <Icon.ArrowBack size={14}/>
        Voltar a Pacientes
      </Link>
      <PageHeader
        eyebrow="Pacientes"
        title="Cadastrar paciente"
        subtitle="Registre o paciente e (opcionalmente) já adicione o primeiro medicamento. Um pedido de consentimento será enviado por WhatsApp para o telefone informado."
      />

      <Card className="mt-6 p-6">
        <NewPatientForm />
      </Card>
    </PageShell>
  );
}
