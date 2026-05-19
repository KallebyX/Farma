"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

export function ConsentButton({ patientId }: { patientId: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function register() {
    setError(null);
    startTransition(async () => {
      try {
        const res = await fetch(`/api/patients/${patientId}/consent`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
        });
        const json = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string };
        if (res.ok && json.ok) {
          setDone(true);
          router.refresh();
        } else {
          setError(json.error ?? "Falha ao registrar");
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Erro inesperado");
      }
    });
  }

  if (done) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-green-100 bg-green-50 px-2 py-0.5 text-xs font-medium text-green-700">
        ✓ Consentimento registrado
      </span>
    );
  }

  return (
    <span className="inline-flex flex-col items-start gap-0.5">
      <button
        type="button"
        onClick={register}
        disabled={pending}
        className="inline-flex items-center rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700 hover:bg-amber-100 disabled:opacity-60 cursor-pointer"
      >
        {pending ? "Registrando…" : "⚠ Registrar consentimento LGPD"}
      </button>
      {error ? <span className="text-[10px] text-red-600 pl-1">{error}</span> : null}
    </span>
  );
}
