"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

type FieldKey =
  | "name"
  | "email"
  | "password"
  | "confirmPassword"
  | "razaoSocial"
  | "fantasia"
  | "cnpj"
  | "consent"
  | "form";

type FieldErrors = Partial<Record<FieldKey, string>>;

const inputCls =
  "w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-500";

export function SignUpForm() {
  const router = useRouter();
  const [errors, setErrors] = useState<FieldErrors>({});
  const [pending, startTransition] = useTransition();

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErrors({});
    const fd = new FormData(e.currentTarget);
    const payload = {
      name: String(fd.get("name") ?? ""),
      email: String(fd.get("email") ?? ""),
      password: String(fd.get("password") ?? ""),
      confirmPassword: String(fd.get("confirmPassword") ?? ""),
      razaoSocial: String(fd.get("razaoSocial") ?? ""),
      fantasia: String(fd.get("fantasia") ?? ""),
      cnpj: String(fd.get("cnpj") ?? ""),
      consent: fd.get("consent") === "on",
    };

    startTransition(async () => {
      try {
        const res = await fetch("/api/sign-up", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const json = (await res.json().catch(() => ({}))) as {
          ok?: boolean;
          fieldErrors?: FieldErrors;
          error?: string;
          redirectTo?: string;
        };

        if (!res.ok || !json.ok) {
          const fe = json.fieldErrors ?? {};
          setErrors({
            ...fe,
            form: Object.keys(fe).length === 0 ? json.error ?? "Não foi possível criar a conta" : undefined,
          });
          return;
        }

        await fetch("/api/auth/callback/credentials", {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: new URLSearchParams({
            email: payload.email,
            password: payload.password,
            redirect: "false",
            callbackUrl: json.redirectTo ?? "/dashboard",
          }),
          redirect: "manual",
        }).catch(() => null);

        const target = json.redirectTo ?? "/dashboard";
        router.replace(target);
        router.refresh();
      } catch (err) {
        setErrors({ form: err instanceof Error ? err.message : "Erro inesperado" });
      }
    });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4" noValidate>
      {errors.form ? (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 border border-red-100">
          {errors.form}
        </p>
      ) : null}

      <Field label="Seu nome completo" error={errors.name}>
        <input
          name="name"
          type="text"
          autoComplete="name"
          required
          minLength={2}
          maxLength={120}
          className={inputCls}
        />
      </Field>

      <Field label="Email" error={errors.email}>
        <input
          name="email"
          type="email"
          autoComplete="email"
          required
          className={inputCls}
        />
      </Field>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Senha" hint="Mínimo 8 caracteres" error={errors.password}>
          <input
            name="password"
            type="password"
            autoComplete="new-password"
            required
            minLength={8}
            className={inputCls}
          />
        </Field>
        <Field label="Confirme a senha" error={errors.confirmPassword}>
          <input
            name="confirmPassword"
            type="password"
            autoComplete="new-password"
            required
            minLength={8}
            className={inputCls}
          />
        </Field>
      </div>

      <hr className="border-slate-200" />
      <p className="text-xs font-bold tracking-[0.15em] text-slate-500 uppercase">
        Dados da farmácia
      </p>

      <Field label="Razão social" error={errors.razaoSocial}>
        <input
          name="razaoSocial"
          type="text"
          required
          minLength={2}
          maxLength={200}
          className={inputCls}
        />
      </Field>

      <Field label="Nome fantasia" hint="Opcional" error={errors.fantasia}>
        <input name="fantasia" type="text" maxLength={200} className={inputCls} />
      </Field>

      <Field label="CNPJ" hint="14 dígitos, com ou sem pontuação" error={errors.cnpj}>
        <input
          name="cnpj"
          type="text"
          required
          inputMode="numeric"
          placeholder="00.000.000/0000-00"
          className={inputCls}
        />
      </Field>

      <label className="flex items-start gap-2 text-xs text-slate-600 leading-relaxed">
        <input
          type="checkbox"
          name="consent"
          required
          className="mt-0.5 h-4 w-4 rounded border-slate-300 text-brand-500 focus:ring-brand-500"
        />
        <span>
          Li e aceito os{" "}
          <a href="/legal/terms" className="text-brand-600 hover:underline" target="_blank" rel="noreferrer">
            Termos de Uso
          </a>{" "}
          e a{" "}
          <a href="/legal/privacy" className="text-brand-600 hover:underline" target="_blank" rel="noreferrer">
            Política de Privacidade
          </a>
          , conforme a LGPD. Entendo que dados de saúde são sensíveis e tratados com sigilo.
        </span>
      </label>
      {errors.consent ? <p className="text-xs text-red-600">{errors.consent}</p> : null}

      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-md bg-brand-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {pending ? "Criando conta..." : "Criar conta e entrar"}
      </button>
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
      {error ? <p className="text-xs text-red-600 mt-1">{error}</p> : null}
    </div>
  );
}
