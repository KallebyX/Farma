import Link from "next/link";

export function InviteError({ message }: { message: string }) {
  return (
    <main className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-md text-center">
        <div className="mx-auto mb-6 inline-flex h-14 w-14 items-center justify-center rounded-full bg-red-50 text-red-600">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
        </div>
        <h1 className="text-xl font-bold text-slate-800">Não foi possível abrir esse convite</h1>
        <p className="mt-2 text-sm text-slate-600">{message}</p>
        <p className="mt-6 text-xs text-slate-500">
          Se você acredita que deveria ter acesso, peça para o administrador da farmácia enviar um
          novo convite.
        </p>
        <Link href="/" className="mt-6 inline-block text-sm text-brand-600 hover:underline">
          Voltar à página inicial
        </Link>
      </div>
    </main>
  );
}
