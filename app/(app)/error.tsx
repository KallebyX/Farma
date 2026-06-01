"use client";

import { useEffect } from "react";

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[AppError]", error);
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-10 bg-[#FAFBFC]">
      <div className="w-full max-w-md text-center">
        <div className="rounded-2xl bg-white border border-slate-200 shadow-[0_2px_8px_rgba(15,23,42,0.06)] p-8">
          <div className="w-12 h-12 rounded-full bg-rose-50 flex items-center justify-center mx-auto mb-4">
            <svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke="#e11d48" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
              <line x1="12" y1="9" x2="12" y2="13"/>
              <line x1="12" y1="17" x2="12.01" y2="17"/>
            </svg>
          </div>
          <h1 className="text-[18px] font-semibold text-slate-900 mb-1">Algo deu errado</h1>
          <p className="text-[13px] text-slate-500 mb-6">
            Ocorreu um erro ao carregar esta página.
            {error.digest && (
              <span className="block mt-1 font-mono text-[11px] text-slate-400">
                Código: {error.digest}
              </span>
            )}
          </p>
          <div className="flex gap-3 justify-center">
            <button
              onClick={reset}
              className="h-9 px-4 text-[13px] font-medium rounded-lg bg-brand-700 text-white hover:bg-brand-800 transition"
            >
              Tentar novamente
            </button>
            <a
              href="/dashboard"
              className="h-9 px-4 text-[13px] font-medium rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50 transition inline-flex items-center"
            >
              Ir ao início
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
