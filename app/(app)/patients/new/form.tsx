"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button, Field, Input, Select, Textarea, Icon } from "@/components/ui";

type FieldErrors = Partial<Record<string, string>>;

export function NewPatientForm() {
  const router = useRouter();
  const [errors, setErrors] = useState<FieldErrors>({});
  const [pending, startTransition] = useTransition();

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErrors({});
    const fd = new FormData(e.currentTarget);
    const rawAge = String(fd.get("age") ?? "").trim();
    const parsedAge = rawAge === "" ? undefined : parseInt(rawAge, 10);
    const payload = {
      name: String(fd.get("name") ?? "").trim(),
      phone: normalizePhone(String(fd.get("phone") ?? "").trim()),
      cpf: String(fd.get("cpf") ?? "").replace(/\D/g, "") || undefined,
      sex: (String(fd.get("sex") ?? "") || undefined) as "M" | "F" | "O" | undefined,
      age: parsedAge !== undefined && Number.isInteger(parsedAge) && parsedAge >= 0 && parsedAge <= 150
        ? parsedAge
        : undefined,
      allergies: String(fd.get("allergies") ?? "")
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean),
      comorbidities: String(fd.get("comorbidities") ?? "")
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean),
      notes: String(fd.get("notes") ?? "").trim() || undefined,
      consentGiven: fd.get("consentGiven") === "on",
    };

    if (!payload.consentGiven) {
      setErrors({ consentGiven: "É necessário registrar o consentimento LGPD." });
      return;
    }

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
    <form onSubmit={onSubmit} className="space-y-5">
      {errors.form && (
        <div className="rounded-lg bg-rose-50 border border-rose-200 px-4 py-3 text-[13px] text-rose-700">
          {errors.form}
        </div>
      )}

      <Field label="Nome completo" required error={errors.name}>
        <Input
          name="name"
          required
          autoFocus
          minLength={2}
          maxLength={120}
          placeholder="Ex: Maria da Silva"
        />
      </Field>

      <Field label="Telefone (WhatsApp)" required hint="Internacional: +55 11 99999-9999" error={errors.phone}>
        <Input
          name="phone"
          required
          placeholder="+55 11 99999-9999"
          icon={<Icon.Phone size={15}/>}
        />
      </Field>

      <div className="grid grid-cols-2 gap-4">
        <Field label="CPF (opcional)" error={errors.cpf}>
          <Input
            name="cpf"
            inputMode="numeric"
            placeholder="11 dígitos"
          />
        </Field>
        <Field label="Sexo (opcional)" error={errors.sex}>
          <Select name="sex" defaultValue="">
            <option value="">-</option>
            <option value="F">Feminino</option>
            <option value="M">Masculino</option>
            <option value="O">Outro</option>
          </Select>
        </Field>
      </div>

      <Field label="Idade (opcional)" error={errors.age}>
        <Input
          name="age"
          type="number"
          min={0}
          max={150}
          placeholder="Ex: 65"
        />
      </Field>

      <Field label="Alergias (opcional)" hint="Separe por vírgula" error={errors.allergies}>
        <Input
          name="allergies"
          placeholder="Ex: penicilina, dipirona"
        />
      </Field>

      <Field label="Comorbidades (opcional)" hint="Separe por vírgula" error={errors.comorbidities}>
        <Input
          name="comorbidities"
          placeholder="Ex: hipertensão, diabetes"
        />
      </Field>

      <Field label="Notas (opcional)" error={errors.notes}>
        <Textarea
          name="notes"
          rows={3}
          placeholder="Observações clínicas, alergias, etc."
        />
      </Field>

      <div>
        <label className="flex items-start gap-2.5 cursor-pointer">
          <input
            type="checkbox"
            name="consentGiven"
            required
            className="mt-0.5 h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
          />
          <span className="text-[12.5px] text-slate-700">
            Paciente já forneceu consentimento LGPD presencialmente
          </span>
        </label>
        {errors.consentGiven && (
          <p className="mt-1 text-xs text-rose-700">{errors.consentGiven}</p>
        )}
      </div>

      <div className="rounded-lg bg-brand-50 border border-brand-100 px-4 py-3 flex items-start gap-2.5">
        <Icon.WhatsApp size={15} className="text-brand-600 mt-0.5 shrink-0"/>
        <p className="text-[12.5px] text-brand-700">
          Após o cadastro, enviaremos um pedido de consentimento ao paciente via WhatsApp.
          Os lembretes só começam quando ele aceitar.
        </p>
      </div>

      <div className="flex justify-end pt-2">
        <Button type="submit" disabled={pending} size="lg">
          {pending ? "Cadastrando..." : "Cadastrar e enviar consentimento"}
        </Button>
      </div>
    </form>
  );
}

function normalizePhone(s: string): string {
  const d = s.replace(/\D/g, "");
  if (!d) return s;
  return d.startsWith("+") ? d : `+${d}`;
}
