"use client";

import { useState, useTransition, useEffect } from "react";
import { useRouter } from "next/navigation";
import { DOSAGE_FORM_LABELS } from "./constants";

type FieldErrors = Partial<Record<string, string>>;

export function AddMedication() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);

  function close() {
    setOpen(false);
    setErrors({});
    setFormError(null);
  }

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape" && open) close();
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open]);

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErrors({});
    setFormError(null);
    const fd = new FormData(e.currentTarget);
    const payload = {
      brandName: String(fd.get("brandName") ?? "").trim(),
      activeIngredient: String(fd.get("activeIngredient") ?? "").trim(),
      dosage: String(fd.get("dosage") ?? "").trim(),
      form: String(fd.get("form") ?? ""),
      manufacturerName: String(fd.get("manufacturerName") ?? "").trim() || undefined,
      therapeuticClass: String(fd.get("therapeuticClass") ?? "").trim() || undefined,
    };

    startTransition(async () => {
      try {
        const res = await fetch("/api/catalog", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const json = (await res.json().catch(() => ({}))) as {
          ok?: boolean;
          fieldErrors?: FieldErrors;
          error?: string;
        };
        if (!res.ok || !json.ok) {
          if (res.status === 409) {
            setFormError(json.error ?? "Medicamento duplicado");
          } else {
            setErrors(json.fieldErrors ?? {});
            setFormError(json.error ?? "Falha ao cadastrar");
          }
          return;
        }
        close();
        router.refresh();
      } catch (err) {
        setFormError(err instanceof Error ? err.message : "Erro inesperado");
      }
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-md bg-brand-500 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-600"
      >
        + Novo medicamento
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
              <h2 className="text-base font-semibold text-slate-800">Novo medicamento</h2>
              <button
                onClick={close}
                aria-label="Fechar modal"
                className="text-slate-400 hover:text-slate-600 text-xl leading-none"
              >
                ×
              </button>
            </div>

            <form onSubmit={onSubmit}>
              <div className="px-5 py-5 space-y-4 max-h-[70vh] overflow-y-auto">
                {formError ? (
                  <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 border border-red-100">
                    {formError}
                  </p>
                ) : null}

                <Field label="Nome comercial *" error={errors.brandName}>
                  <input
                    name="brandName"
                    required
                    autoFocus
                    maxLength={200}
                    placeholder="Ex: Losartana Potássica"
                    className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                  />
                </Field>

                <Field label="Princípio ativo *" error={errors.activeIngredient}>
                  <input
                    name="activeIngredient"
                    required
                    maxLength={200}
                    placeholder="Ex: Losartana"
                    className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                  />
                </Field>

                <div className="grid grid-cols-2 gap-3">
                  <Field label="Dosagem *" error={errors.dosage}>
                    <input
                      name="dosage"
                      required
                      maxLength={50}
                      placeholder="Ex: 50mg"
                      className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                    />
                  </Field>

                  <Field label="Forma farmacêutica *" error={errors.form}>
                    <select
                      name="form"
                      required
                      defaultValue=""
                      className="select-tech w-full"
                    >
                      <option value="" disabled>Selecione…</option>
                      {DOSAGE_FORM_LABELS.map((f) => (
                        <option key={f.value} value={f.value}>
                          {f.label}
                        </option>
                      ))}
                    </select>
                  </Field>
                </div>

                <Field label="Fabricante (opcional)" error={errors.manufacturerName}>
                  <input
                    name="manufacturerName"
                    maxLength={200}
                    placeholder="Ex: EMS, Eurofarma"
                    className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                  />
                </Field>

                <Field label="Classe terapêutica (opcional)" error={errors.therapeuticClass}>
                  <input
                    name="therapeuticClass"
                    maxLength={100}
                    placeholder="Ex: Anti-hipertensivo"
                    className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                  />
                </Field>
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
                  type="submit"
                  disabled={pending}
                  className="rounded-md bg-brand-500 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-600 disabled:opacity-60"
                >
                  {pending ? "Salvando…" : "Salvar medicamento"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </>
  );
}

function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-slate-700">{label}</label>
      <div className="mt-1">{children}</div>
      {error ? <p className="mt-1 text-xs text-red-600">{error}</p> : null}
    </div>
  );
}
