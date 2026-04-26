"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

type FieldErrors = Partial<Record<string, string>>;

export function NewPatientForm() {
  const router = useRouter();
  const [errors, setErrors] = useState<FieldErrors>({});
  const [pending, startTransition] = useTransition();

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErrors({});
    const fd = new FormData(e.currentTarget);
    const payload = {
      name: String(fd.get("name") ?? "").trim(),
      phone: normalizePhone(String(fd.get("phone") ?? "").trim()),
      cpf: String(fd.get("cpf") ?? "").replace(/\D/g, "") || undefined,
      sex: (String(fd.get("sex") ?? "") || undefined) as "M" | "F" | "O" | undefined,
      comorbidities: String(fd.get("comorbidities") ?? "")
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean),
      notes: String(fd.get("notes") ?? "").trim() || undefined,
    };

    startTransition(async () => {
      try {
        const res = await fetch("/api/patients", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const json = (await res.json().catch(() => ({}))) as {
          ok?: boolean;
          patient?: { id: string };
          fieldErrors?: FieldErrors;
          error?: string;
        };
        if (!res.ok || !json.ok) {
          setErrors({ ...(json.fieldErrors ?? {}), form: json.error ?? "Falha ao cadastrar" });
          return;
        }
        if (json.patient?.id) {
          router.push(`/patients/${json.patient.id}`);
        } else {
          router.push("/patients");
        }
      } catch (err) {
        setErrors({ form: err instanceof Error ? err.message : "Erro inesperado" });
      }
    });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      {errors.form ? (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 border border-red-100">
          {errors.form}
        </p>
      ) : null}

      <Field label="Nome completo" error={errors.name}>
        <input
          name="name"
          required
          autoFocus
          minLength={2}
          maxLength={120}
          className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
        />
      </Field>

      <Field
        label="Telefone (WhatsApp)"
        hint="Internacional: +55 11 99999-9999"
        error={errors.phone}
      >
        <input
          name="phone"
          required
          placeholder="+55 11 99999-9999"
          className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
        />
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <Field label="CPF (opcional)" error={errors.cpf}>
          <input
            name="cpf"
            inputMode="numeric"
            placeholder="11 dígitos"
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
          />
        </Field>
        <Field label="Sexo (opcional)" error={errors.sex}>
          <select
            name="sex"
            defaultValue=""
            className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
          >
            <option value="">—</option>
            <option value="F">Feminino</option>
            <option value="M">Masculino</option>
            <option value="O">Outro</option>
          </select>
        </Field>
      </div>

      <Field
        label="Comorbidades (opcional)"
        hint="Separe por vírgula. Ex: hipertensão, diabetes"
        error={errors.comorbidities}
      >
        <input
          name="comorbidities"
          className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
        />
      </Field>

      <Field label="Notas (opcional)" error={errors.notes}>
        <textarea
          name="notes"
          rows={3}
          className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
        />
      </Field>

      <div className="rounded-md bg-brand-50 px-3 py-2.5 text-xs text-brand-700 border border-brand-100">
        Após o cadastro, enviaremos um pedido de consentimento ao paciente via WhatsApp. Os
        lembretes só começam quando ele aceitar.
      </div>

      <div className="flex justify-end gap-2 pt-2">
        <button
          type="submit"
          disabled={pending}
          className="rounded-md bg-brand-500 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-600 disabled:opacity-60"
        >
          {pending ? "Cadastrando..." : "Cadastrar e enviar consentimento"}
        </button>
      </div>
    </form>
  );
}

function Field({
  label,
  hint,
  error,
  children,
}: {
  label: string;
  hint?: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-slate-700">{label}</label>
      {hint ? <p className="text-xs text-slate-500 mt-0.5">{hint}</p> : null}
      <div className="mt-1">{children}</div>
      {error ? <p className="mt-1 text-xs text-red-600">{error}</p> : null}
    </div>
  );
}

function normalizePhone(s: string): string {
  const d = s.replace(/\D/g, "");
  if (!d) return s;
  return d.startsWith("+") ? d : `+${d}`;
}
