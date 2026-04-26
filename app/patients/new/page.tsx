import { redirect } from "next/navigation";
import Link from "next/link";
import { getSessionContext } from "@/lib/auth/session";
import { NewPatientForm } from "./form";

export const dynamic = "force-dynamic";

export default async function NewPatientPage() {
  const ctx = await getSessionContext();
  if (!ctx) redirect("/sign-in");

  return (
    <main className="min-h-screen px-6 py-10">
      <div className="mx-auto max-w-2xl">
        <Link href="/patients" className="text-xs text-slate-500 hover:underline">
          ← Pacientes
        </Link>
        <h1 className="mt-2 text-2xl font-bold text-brand-800">Cadastrar paciente</h1>
        <p className="text-sm text-slate-500">
          Registre o paciente e (opcionalmente) já adicione o primeiro medicamento. Um pedido de
          consentimento será enviado por WhatsApp para o telefone informado.
        </p>

        <div className="mt-6 rounded-xl border border-slate-200 bg-white p-6">
          <NewPatientForm />
        </div>
      </div>
    </main>
  );
}
