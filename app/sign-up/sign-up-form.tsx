"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

type FieldErrors = Partial<
  Record<"pharmacyName" | "fantasia" | "cnpj" | "name" | "email" | "password" | "consent" | "form", string>
>;

export function SignUpForm() {
  const router = useRouter();
  const [errors, setErrors] = useState<FieldErrors>({});
  const [pending, startTransition] = useTransition();

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErrors({});
    const fd = new FormData(e.currentTarget);
    const payload = {
      pharmacyName: String(fd.get("pharmacyName") ?? ""),
      fantasia: String(fd.get("fantasia") ?? ""),
      cnpj: String(fd.get("cnpj") ?? ""),
      name: String(fd.get("name") ?? ""),
      email: String(fd.get("email") ?? ""),
      password: String(fd.get("password") ?? ""),
      consent: fd.get("consent") === "on",
    };

    startTransition(async () => {
      try {
        const res = await fetch("/api/auth/register", {
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
          setErrors({
            ...(json.fieldErrors ?? {}),
            form: json.error ?? "Não foi possível criar a conta",
          });
          return;
        }

        // Auto-login with the credentials we just created, then go to dashboard.
        const target = json.redirectTo ?? "/dashboard";
        const loginRes = await fetch("/api/auth/callback/credentials", {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: new URLSearchParams({
            email: payload.email,
            password: payload.password,
            redirect: "false",
            callbackUrl: target,
          }),
          redirect: "manual",
        }).catch(() => null);

        if (loginRes && loginRes.status >= 400) {
          router.replace(`/sign-in?from=${encodeURIComponent(target)}`);
        } else {
          router.replace(target);
          router.refresh();
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

      <Field label="Razão social da farmácia" error={errors.pharmacyName}>
        <input name="pharmacyName" type="text" required minLength={2} maxLength={160}
          className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" />
      </Field>

      <Field label="Nome fantasia (opcional)" error={errors.fantasia}>
        <input name="fantasia" type="text" maxLength={120}
          className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" />
      </Field>

      <Field label="CNPJ" hint="Apenas números" error={errors.cnpj}>
        <input name="cnpj" type="text" inputMode="numeric" required
          className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" />
      </Field>

      <Field label="Seu nome completo" error={errors.name}>
        <input name="name" type="text" autoComplete="name" required minLength={2} maxLength={120}
          className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" />
      </Field>

      <Field label="Email" error={errors.email}>
        <input name="email" type="email" autoComplete="email" required
          className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" />
      </Field>

      <Field label="Senha" hint="Mínimo 8 caracteres" error={errors.password}>
        <input name="password" type="password" autoComplete="new-password" required minLength={8}
          className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" />
      </Field>

      <label className="flex items-start gap-2 text-xs text-slate-600 leading-relaxed">
        <input type="checkbox" name="consent" className="mt-0.5" />
        <span>
          Li e aceito os{" "}
          <a href="/legal/terms" target="_blank" rel="noreferrer noopener" className="text-brand-600 hover:underline">
            Termos de Uso
          </a>{" "}
          e a{" "}
          <a href="/legal/privacy" target="_blank" rel="noreferrer noopener" className="text-brand-600 hover:underline">
            Política de Privacidade
          </a>
          .
        </span>
      </label>
      {errors.consent ? <p className="text-xs text-red-600">{errors.consent}</p> : null}

      <button type="submit" disabled={pending}
        className="w-full rounded-md bg-brand-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-600 disabled:opacity-60">
        {pending ? "Criando conta..." : "Criar conta"}
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
      <div className="mt-1">{children}</div>
      {hint && !error ? <p className="mt-1 text-xs text-slate-400">{hint}</p> : null}
      {error ? <p className="mt-1 text-xs text-red-600">{error}</p> : null}
    </div>
  );
}
