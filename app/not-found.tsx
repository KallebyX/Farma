import Link from "next/link";

export default function NotFound() {
  return (
    <main className="min-h-screen flex items-center justify-center px-4">
      <div className="max-w-md text-center">
        <p className="text-xs font-bold tracking-[0.2em] text-brand-500 uppercase">
          Farma · Adesão e Farmacovigilância
        </p>
        <h1 className="mt-4 text-6xl font-bold text-brand-800">404</h1>
        <p className="mt-3 text-slate-600">Página não encontrada.</p>
        <div className="mt-8 flex justify-center gap-3">
          <Link
            href="/"
            className="rounded-lg border border-slate-300 px-5 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            Início
          </Link>
          <Link
            href="/dashboard"
            className="rounded-lg bg-brand-500 px-5 py-3 text-sm font-semibold text-white hover:bg-brand-600"
          >
            Dashboard
          </Link>
        </div>
      </div>
    </main>
  );
}
