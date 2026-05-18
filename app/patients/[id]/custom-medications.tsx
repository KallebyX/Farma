"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

export function CustomMedications({
  patientId,
  initialMeds,
}: {
  patientId: string;
  initialMeds: string[];
}) {
  const router = useRouter();
  const [meds, setMeds] = useState<string[]>(initialMeds);
  const [input, setInput] = useState("");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  async function patch(newMeds: string[]) {
    const res = await fetch(`/api/patients/${patientId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ customMedications: newMeds }),
    });
    const json = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string };
    if (!res.ok || !json.ok) throw new Error(json.error ?? "Falha ao salvar");
    return newMeds;
  }

  function addMed() {
    const trimmed = input.trim();
    if (!trimmed) return;
    if (meds.map((m) => m.toLowerCase()).includes(trimmed.toLowerCase())) {
      setError("Medicamento já adicionado");
      return;
    }
    const newMeds = [...meds, trimmed];
    setError(null);
    startTransition(async () => {
      try {
        await patch(newMeds);
        setMeds(newMeds);
        setInput("");
        router.refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Falha ao salvar");
      }
    });
  }

  function removeMed(med: string) {
    const newMeds = meds.filter((m) => m !== med);
    setError(null);
    startTransition(async () => {
      try {
        await patch(newMeds);
        setMeds(newMeds);
        router.refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Falha ao remover");
      }
    });
  }

  return (
    <div className="mt-3 space-y-3">
      {meds.map((med) => (
        <article key={med} className="rounded-xl border border-amber-200 bg-amber-50 p-4 flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-slate-800">💊 {med}</p>
            <span className="mt-1 inline-flex items-center rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold text-amber-700 border border-amber-300">
              AVULSO
            </span>
          </div>
          <button
            type="button"
            onClick={() => removeMed(med)}
            disabled={pending}
            className="text-xs text-red-600 hover:underline disabled:opacity-50"
          >
            remover
          </button>
        </article>
      ))}

      <div className="flex gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              addMed();
            }
          }}
          placeholder="Nome do medicamento não cadastrado"
          className="flex-1 rounded-md border border-slate-300 px-3 py-2 text-sm"
        />
        <button
          type="button"
          onClick={addMed}
          disabled={pending || !input.trim()}
          className="rounded-md bg-brand-500 px-3 py-2 text-sm font-semibold text-white hover:bg-brand-600 disabled:opacity-60"
        >
          {pending ? "…" : "Adicionar"}
        </button>
      </div>
      {error ? <p className="text-xs text-red-600">{error}</p> : null}
    </div>
  );
}
