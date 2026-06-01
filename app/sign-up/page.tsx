import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth/config";
import { SignUpForm } from "./sign-up-form";

export const dynamic = "force-dynamic";

export default async function SignUpPage() {
  const session = await auth();
  if (session?.user) redirect("/dashboard");

  return (
    <main className="min-h-screen flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-lg">
        <div className="mb-6 text-center">
          <p className="text-xs font-bold tracking-[0.2em] text-brand-500 uppercase">
            Farma · Adesão e Farmacovigilância
          </p>
          <h1 className="mt-3 text-2xl font-bold text-brand-800">Criar conta da farmácia</h1>
          <p className="mt-2 text-sm text-slate-500">
            Cadastre sua farmácia e comece a acompanhar adesão e farmacovigilância.
          </p>
        </div>

        <div className="rounded-xl bg-white border border-slate-200 shadow-sm p-6">
          <SignUpForm />
        </div>

        <p className="mt-6 text-center text-sm text-slate-600">
          Já tem conta?{" "}
          <Link href="/sign-in" className="text-brand-600 font-semibold hover:underline">
            Entrar
          </Link>
        </p>
      </div>
    </main>
  );
}
