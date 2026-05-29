import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth/config";
import { SignUpForm } from "./sign-up-form";

export default async function SignUpPage() {
  const session = await auth();
  if (session?.user) redirect("/dashboard");

  return (
    <main className="min-h-screen flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <p className="text-xs font-bold tracking-[0.2em] text-brand-500 uppercase">
            Farma · Adesão e Farmacovigilância
          </p>
          <h1 className="mt-3 text-2xl font-bold text-brand-800">Criar conta da farmácia</h1>
          <p className="mt-2 text-sm text-slate-500">
            Cadastre sua farmácia e comece a usar a plataforma. Você será o
            proprietário e poderá convidar sua equipe depois.
          </p>
        </div>

        <div className="rounded-xl bg-white p-8 shadow-sm border border-slate-200">
          <SignUpForm />
        </div>

        <p className="mt-6 text-center text-xs text-slate-500">
          Já tem conta?{" "}
          <Link href="/sign-in" className="text-brand-600 hover:underline">
            Entrar
          </Link>
        </p>
      </div>
    </main>
  );
}
