import Link from "next/link";
import { redirect } from "next/navigation";
import { AuthError } from "next-auth";
import { auth, signIn } from "@/lib/auth/config";
import { FarmaLogo } from "@/components/ui";

type SearchParams = Record<string, string | string[] | undefined>;

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const session = await auth();
  if (session?.user) redirect("/dashboard");

  const error = typeof params.error === "string" ? params.error : null;
  const from = typeof params.from === "string" ? params.from : "/dashboard";

  async function action(formData: FormData) {
    "use server";
    const email = String(formData.get("email") ?? "");
    const password = String(formData.get("password") ?? "");
    try {
      await signIn("credentials", { email, password, redirectTo: from });
    } catch (err) {
      if (err instanceof AuthError) {
        const code = err.type === "CredentialsSignin" ? "CredentialsSignin" : "AuthError";
        redirect(`/sign-in?error=${code}&from=${encodeURIComponent(from)}`);
      }
      throw err;
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center px-4 py-10 bg-[#FAFBFC]">
      <div className="w-full max-w-[400px]">
        <div className="mb-8 flex flex-col items-center text-center">
          <FarmaLogo size={44}/>
          <p className="mt-4 text-[10.5px] font-bold tracking-[0.18em] text-brand-700 uppercase">
            Farma · Adesão e Farmacovigilância
          </p>
          <h1 className="mt-2 text-[24px] font-semibold tracking-tight text-slate-900">
            Entrar na plataforma
          </h1>
        </div>

        <div className="rounded-2xl bg-white border border-slate-200 shadow-[0_2px_8px_rgba(15,23,42,0.06)] p-8">
          <form action={action} className="space-y-5">
            {error && (
              <div className="rounded-lg bg-rose-50 border border-rose-200 px-4 py-3 text-[13px] text-rose-700">
                Email ou senha inválidos.
              </div>
            )}
            <div>
              <label className="block text-[12px] font-medium text-slate-700 mb-1.5" htmlFor="email">
                Email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                className="w-full h-10 rounded-lg border border-slate-300 bg-white px-3 text-[13.5px] text-slate-800 placeholder:text-slate-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100 transition"
              />
            </div>
            <div>
              <label className="block text-[12px] font-medium text-slate-700 mb-1.5" htmlFor="password">
                Senha
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                className="w-full h-10 rounded-lg border border-slate-300 bg-white px-3 text-[13.5px] text-slate-800 placeholder:text-slate-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100 transition"
              />
            </div>
            <button
              type="submit"
              className="w-full h-11 rounded-lg bg-brand-700 text-white text-[13px] font-semibold hover:bg-brand-800 transition border border-brand-700 shadow-[inset_0_1px_0_rgba(255,255,255,0.15),0_1px_2px_rgba(22,54,89,0.18)]"
            >
              Entrar
            </button>
          </form>
        </div>

        <p className="mt-6 text-center text-[12.5px] text-slate-500">
          Não tem conta?{" "}
          <Link href="/sign-up" className="text-brand-600 font-semibold hover:underline">
            Criar conta da farmácia
          </Link>
        </p>
        <p className="mt-2 text-center text-[12px] text-slate-400">
          Recebeu um convite? Use o link enviado por email ou WhatsApp.
        </p>
      </div>
    </main>
  );
}
