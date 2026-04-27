import Link from "next/link";
import { redirect } from "next/navigation";
import { auth, signIn } from "@/lib/auth/config";

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
    await signIn("credentials", { email, password, redirectTo: from });
  }

  return (
    <main className="min-h-screen flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <p className="text-xs font-bold tracking-[0.2em] text-brand-500 uppercase">
            Farma · Adesão e Farmacovigilância
          </p>
          <h1 className="mt-3 text-2xl font-bold text-brand-800">Entrar na plataforma</h1>
        </div>

        <form action={action} className="rounded-xl bg-white p-8 shadow-sm border border-slate-200 space-y-5">
          {error ? (
            <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 border border-red-100">
              Email ou senha inválidos.
            </p>
          ) : null}
          <div>
            <label className="block text-sm font-medium text-slate-700" htmlFor="email">
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700" htmlFor="password">
              Senha
            </label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
          <button
            type="submit"
            className="w-full rounded-md bg-brand-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-600"
          >
            Entrar
          </button>
        </form>

        <p className="mt-6 text-center text-xs text-slate-500">
          Recebeu um convite? Use o link enviado por email ou WhatsApp.
          <br />
          <Link href="/" className="text-brand-600 hover:underline">
            ← voltar
          </Link>
        </p>
      </div>
    </main>
  );
}
