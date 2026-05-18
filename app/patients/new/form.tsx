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

    const consentGiven = fd.get("consentGiven") === "on";
    if (!consentGiven) {
      setErrors({ consentGiven: "O consentimento do paciente é obrigatório" });
      return;
    }

    const ageRaw = String(fd.get("age") ?? "").trim();
    const payload = {
      name: String(fd.get("name") ?? "").trim(),
      phone: normalizePhone(String(fd.get("phone") ?? "").trim()),
      cpf: String(fd.get("cpf") ?? "").replace(/\D/g, "") || undefined,
      sex: (String(fd.get("sex") ?? "") || undefined) as "M" | "F" | "O" | undefined,
      age: ageRaw ? Number(ageRaw) : undefined,
      comorbidities: String(fd.get("comorbidities") ?? "")
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean),
      allergies: String(fd.get("allergies") ?? "")
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean),
      notes: String(fd.get("notes") ?? "").trim() || undefined,
      consentGiven,
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
        router.refresh();
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
            className="select-tech w-full"
          >
            <option value="">—</option>
            <option value="F">Feminino</option>
            <option value="M">Masculino</option>
            <option value="O">Outro</option>
          </select>
        </Field>
      </div>

      <Field label="Idade (opcional)" error={errors.age}>
        <input
          name="age"
          type="number"
          min={0}
          max={150}
          placeholder="Ex: 45"
          className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
        />
      </Field>

      <Field
        label="Alergias (opcional)"
        hint="Separe por vírgula. Ex: penicilina, dipirona"
        error={errors.allergies}
      >
        <input
          name="allergies"
          placeholder="Ex: penicilina, dipirona"
          className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
        />
      </Field>

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

      <div className={`rounded-md px-3 py-3 border ${errors.consentGiven ? "bg-red-50 border-red-200" : "bg-slate-50 border-slate-200"}`}>
        <label className="flex items-start gap-3 cursor-pointer">
          <input
            type="checkbox"
            name="consentGiven"
            className="mt-0.5 h-4 w-4 rounded border-slate-300 text-brand-500"
          />
          <span className="text-sm text-slate-700">
            O paciente autoriza o uso e armazenamento de seus dados conforme a{" "}
            <span className="font-semibold">LGPD</span> (Lei Geral de Proteção de Dados).
          </span>
        </label>
        {errors.consentGiven ? (
          <p className="mt-1 text-xs text-red-600 pl-7">{errors.consentGiven}</p>
        ) : null}
      </div>

      <div className="flex justify-end gap-2 pt-2">
        <button
          type="submit"
          disabled={pending}
          className="rounded-md bg-brand-500 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-600 disabled:opacity-60"
        >
          {pending ? "Cadastrando..." : "Cadastrar paciente"}
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
