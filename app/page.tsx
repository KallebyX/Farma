import Link from "next/link";

export default function Home() {
  return (
    <main className="min-h-screen flex items-center justify-center px-4">
      <div className="max-w-xl text-center">
        <p className="text-xs font-bold tracking-[0.2em] text-brand-500 uppercase">
          Farma · Adesão e Farmacovigilância
        </p>
        <h1 className="mt-4 text-4xl font-bold text-brand-800">
          Cuidado farmacêutico, no WhatsApp.
        </h1>
        <p className="mt-4 text-slate-600">
          Plataforma de lembretes de medicação e notificação de reações adversas para farmácias.
        </p>
        <div className="mt-8 flex justify-center gap-3">
          <Link
            href="/sign-in"
            className="rounded-lg bg-brand-500 px-5 py-3 text-sm font-semibold text-white hover:bg-brand-600"
          >
            Entrar na plataforma
          </Link>
        </div>
      </div>
    </main>
  );
}
