"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

export function ReviewRamButton({ ramId }: { ramId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [notes, setNotes] = useState("");
  const [forward, setForward] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<{ vigimedProtocol?: string } | null>(null);

  function submit() {
    setError(null);
    startTransition(async () => {
      const res = await fetch(`/api/ram/${ramId}/review`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notes: notes || undefined, forwardToVigimed: forward }),
      });
      const json = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        error?: string;
        vigimedProtocol?: string;
      };
      if (!res.ok || !json.ok) {
        setError(json.error ?? "Falha ao revisar");
        return;
      }
      setSuccess({ vigimedProtocol: json.vigimedProtocol });
    });
  }

  function close() {
    setOpen(false);
    setNotes("");
    setForward(false);
    setError(null);
    setSuccess(null);
    router.refresh();
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-md bg-brand-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-brand-600"
      >
        Revisar
      </button>
      {open ? (
        <div
          className="fixed inset-0 z-40 flex items-center justify-center bg-slate-900/50 px-4 py-6"
          onClick={close}
        >
          <div
            role="dialog"
            aria-modal="true"
            className="w-full max-w-lg rounded-xl bg-white shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
              <h2 className="text-base font-semibold text-slate-800">Revisar RAM</h2>
              <button onClick={close} className="text-slate-400 hover:text-slate-600">
                ×
              </button>
            </div>

            {success ? (
              <div className="px-5 py-5 space-y-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-50 text-green-600">
                    ✓
                  </div>
                  <div>
                    <p className="text-sm font-semibold">Revisão registrada</p>
                    {success.vigimedProtocol ? (
                      <p className="text-xs text-slate-600">
                        Protocolo VigiMed:{" "}
                        <span className="font-mono">{success.vigimedProtocol}</span>
                      </p>
                    ) : (
                      <p className="text-xs text-slate-500">RAM marcada como revisada.</p>
                    )}
                  </div>
                </div>
                <button
                  onClick={close}
                  className="rounded-md bg-brand-500 px-4 py-2 text-sm font-semibold text-white"
                >
                  Concluir
                </button>
              </div>
            ) : (
              <div className="px-5 py-5 space-y-4">
                {error ? (
                  <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 border border-red-100">
                    {error}
                  </p>
                ) : null}

                <div>
                  <label className="block text-sm font-medium text-slate-700">
                    Notas clínicas (opcional)
                  </label>
                  <textarea
                    rows={4}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                    placeholder="Avaliação clínica, conduta, contato com paciente..."
                  />
                </div>

                <label className="flex items-start gap-2 text-sm text-slate-700">
                  <input
                    type="checkbox"
                    checked={forward}
                    onChange={(e) => setForward(e.target.checked)}
                    className="mt-0.5 h-4 w-4 rounded border-slate-300 text-brand-500"
                  />
                  <span>
                    Encaminhar para o VigiMed (Anvisa) — gera protocolo simulado nessa versão; a
                    integração real precisa de credenciais do VigiMed.
                  </span>
                </label>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    onClick={close}
                    className="rounded-md px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={submit}
                    disabled={pending}
                    className="rounded-md bg-brand-500 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
                  >
                    {pending ? "Salvando..." : forward ? "Revisar e encaminhar" : "Marcar como revisada"}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      ) : null}
    </>
  );
}
