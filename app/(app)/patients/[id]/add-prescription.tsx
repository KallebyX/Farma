"use client";

import { useState, useTransition, useEffect } from "react";
import { useRouter } from "next/navigation";

type Med = {
  id: string;
  brandName: string;
  dosage: string;
  form: string;
  activeIngredient: string;
};

type Mode = "interval" | "fixed";

export function AddPrescription({ patientId }: { patientId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Med[]>([]);
  const [selected, setSelected] = useState<Med | null>(null);
  const [mode, setMode] = useState<Mode>("interval");
  const [intervalHours, setIntervalHours] = useState("24");
  const [fixedTimes, setFixedTimes] = useState<string[]>(["08:00"]);
  const [doseAmount, setDoseAmount] = useState("1 comprimido");
  const [durationDays, setDurationDays] = useState<string>("");
  const [instructions, setInstructions] = useState("");
  const [quantity, setQuantity] = useState<string>("");

  useEffect(() => {
    if (!open) return;
    const q = query.trim();
    if (q.length < 1) {
      setResults([]);
      return;
    }
    const t = setTimeout(async () => {
      const res = await fetch(`/api/medications/search?q=${encodeURIComponent(q)}`);
      const json = (await res.json().catch(() => ({}))) as { ok?: boolean; results?: Med[] };
      if (json.ok) setResults(json.results ?? []);
    }, 200);
    return () => clearTimeout(t);
  }, [query, open]);

  function reset() {
    setQuery("");
    setResults([]);
    setSelected(null);
    setMode("interval");
    setIntervalHours("24");
    setFixedTimes(["08:00"]);
    setDoseAmount("1 comprimido");
    setDurationDays("");
    setInstructions("");
    setQuantity("");
    setError(null);
  }

  function close() {
    setOpen(false);
    reset();
  }

  function submit() {
    if (!selected) {
      setError("Selecione um medicamento");
      return;
    }
    setError(null);
    const payload: Record<string, unknown> = {
      patientId,
      medicationId: selected.id,
      doseAmount,
      instructions: instructions || undefined,
      quantityDispensed: quantity ? Number(quantity) : undefined,
      durationDays: durationDays ? Number(durationDays) : undefined,
    };
    if (mode === "interval") payload.intervalHours = Number(intervalHours);
    else payload.fixedTimes = fixedTimes.filter(Boolean);

    startTransition(async () => {
      const res = await fetch("/api/prescriptions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string };
      if (!res.ok || !json.ok) {
        setError(json.error ?? "Falha ao adicionar prescrição");
        return;
      }
      close();
      router.refresh();
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-md bg-brand-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-brand-600"
      >
        + Adicionar medicamento
      </button>

      {open ? (
        <div
          className="fixed inset-0 z-40 flex items-center justify-center bg-slate-900/50 px-4 py-6"
          onClick={close}
        >
          <div
            role="dialog"
            aria-modal="true"
            className="w-full max-w-xl rounded-xl bg-white shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
              <h2 className="text-base font-semibold text-slate-800">Adicionar medicamento</h2>
              <button onClick={close} className="text-slate-400 hover:text-slate-600">
                ×
              </button>
            </div>

            <div className="px-5 py-5 space-y-4 max-h-[70vh] overflow-y-auto">
              {error ? (
                <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 border border-red-100">
                  {error}
                </p>
              ) : null}

              {!selected ? (
                <div>
                  <label className="block text-sm font-medium text-slate-700">Buscar medicamento</label>
                  <input
                    autoFocus
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Nome comercial ou princípio ativo"
                    className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                  />
                  {results.length > 0 ? (
                    <ul className="mt-2 max-h-60 overflow-y-auto rounded-md border border-slate-200 divide-y divide-slate-100">
                      {results.map((m) => (
                        <li key={m.id}>
                          <button
                            type="button"
                            onClick={() => setSelected(m)}
                            className="block w-full px-3 py-2 text-left text-sm hover:bg-slate-50"
                          >
                            <span className="font-medium">{m.brandName} {m.dosage}</span>
                            <span className="ml-2 text-xs text-slate-500">{m.activeIngredient}</span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  ) : query.length > 0 ? (
                    <p className="mt-2 text-xs text-slate-500">Nenhum resultado.</p>
                  ) : null}
                </div>
              ) : (
                <div className="rounded-md border border-brand-100 bg-brand-50 px-3 py-2.5 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-brand-800">{selected.brandName} {selected.dosage}</p>
                    <p className="text-xs text-brand-700">{selected.activeIngredient}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelected(null)}
                    className="text-xs text-brand-700 hover:underline"
                  >
                    Trocar
                  </button>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-slate-700">Dose por tomada</label>
                <input
                  value={doseAmount}
                  onChange={(e) => setDoseAmount(e.target.value)}
                  className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                />
              </div>

              <fieldset>
                <legend className="text-sm font-medium text-slate-700">Frequência</legend>
                <div className="mt-2 flex gap-2">
                  <ModeBtn label="A cada N horas" active={mode === "interval"} onClick={() => setMode("interval")} />
                  <ModeBtn label="Horários fixos" active={mode === "fixed"} onClick={() => setMode("fixed")} />
                </div>
                {mode === "interval" ? (
                  <div className="mt-2">
                    <input
                      type="number"
                      min={1}
                      max={168}
                      value={intervalHours}
                      onChange={(e) => setIntervalHours(e.target.value)}
                      className="w-32 rounded-md border border-slate-300 px-3 py-2 text-sm"
                    />
                    <span className="ml-2 text-sm text-slate-500">horas</span>
                  </div>
                ) : (
                  <div className="mt-2 space-y-2">
                    {fixedTimes.map((t, i) => (
                      <div key={i} className="flex gap-2">
                        <input
                          type="time"
                          value={t}
                          onChange={(e) => {
                            const next = [...fixedTimes];
                            next[i] = e.target.value;
                            setFixedTimes(next);
                          }}
                          className="rounded-md border border-slate-300 px-3 py-2 text-sm"
                        />
                        <button
                          type="button"
                          onClick={() => setFixedTimes(fixedTimes.filter((_, j) => j !== i))}
                          className="text-xs text-red-600 hover:underline"
                        >
                          remover
                        </button>
                      </div>
                    ))}
                    <button
                      type="button"
                      onClick={() => setFixedTimes([...fixedTimes, "20:00"])}
                      className="text-xs text-brand-600 hover:underline"
                    >
                      + adicionar horário
                    </button>
                  </div>
                )}
              </fieldset>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-slate-700">Duração (dias)</label>
                  <input
                    type="number"
                    min={1}
                    placeholder="Em branco = contínuo"
                    value={durationDays}
                    onChange={(e) => setDurationDays(e.target.value)}
                    className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700">Quantidade dispensada</label>
                  <input
                    type="number"
                    min={1}
                    placeholder="Unidades"
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                    className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700">
                  Instruções (opcional)
                </label>
                <input
                  value={instructions}
                  onChange={(e) => setInstructions(e.target.value)}
                  placeholder="ex: em jejum, antes do café"
                  className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 border-t border-slate-200 px-5 py-3">
              <button
                type="button"
                onClick={close}
                className="rounded-md px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={submit}
                disabled={pending || !selected}
                className="rounded-md bg-brand-500 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-600 disabled:opacity-60"
              >
                {pending ? "Adicionando..." : "Adicionar"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}

function ModeBtn({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-md px-3 py-1.5 text-xs font-medium border ${
        active
          ? "bg-brand-500 border-brand-500 text-white"
          : "bg-white border-slate-300 text-slate-700 hover:bg-slate-50"
      }`}
    >
      {label}
    </button>
  );
}
