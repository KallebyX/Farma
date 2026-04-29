"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

type Props = {
  token: string;
  email: string;
  userExists: boolean;
};

type FieldErrors = Partial<Record<"name" | "password" | "confirmPassword" | "consent" | "form", string>>;

export function AcceptInviteForm({ token, email, userExists }: Props) {
  const router = useRouter();
  const [errors, setErrors] = useState<FieldErrors>({});
  const [pending, startTransition] = useTransition();

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErrors({});
    const fd = new FormData(e.currentTarget);
    const payload = {
      token,
      name: String(fd.get("name") ?? ""),
      password: String(fd.get("password") ?? ""),
      confirmPassword: String(fd.get("confirmPassword") ?? ""),
      consent: fd.get("consent") === "on",
    };

    startTransition(async () => {
      try {
        const res = await fetch(`/api/accept-invite/${token}`, {
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
            form: json.error ?? "Não foi possível aceitar o convite",
          });
          return;
        }

        // Auto-login: trigger NextAuth credentials sign-in with the password
        // we just set, then redirect to dashboard. CSRF token is required.
        const target = json.redirectTo ?? "/dashboard";
        let loginRes: Response | null = null;
        try {
          const csrfRes = await fetch("/api/auth/csrf", { credentials: "include" });
          const { csrfToken } = (await csrfRes.json()) as { csrfToken: string };

          loginRes = await fetch("/api/auth/callback/credentials", {
            method: "POST",
            credentials: "include",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: new URLSearchParams({
              csrfToken,
              email,
              password: payload.password,
              redirect: "false",
              callbackUrl: target,
            }),
            redirect: "manual",
          });
        } catch {
          loginRes = null;
        }

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

      <Field label="Nome completo" error={errors.name}>
        <input
          name="name"
          type="text"
          autoComplete="name"
          required
          minLength={2}
          maxLength={120}
          className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
        />
      </Field>

      <div>
        <label className="block text-sm font-medium text-slate-700">Email</label>
        <input
          value={email}
          readOnly
          className="mt-1 w-full rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600"
        />
      </div>

      <Field
        label={userExists ? "Defina uma nova senha" : "Crie uma senha"}
        hint="Mínimo 8 caracteres"
        error={errors.password}
      >
        <input
          name="password"
          type="password"
          autoComplete="new-password"
          required
          minLength={8}
          className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
        />
      </Field>

      <Field label="Confirme a senha" error={errors.confirmPassword}>
        <input
          name="confirmPassword"
          type="password"
          autoComplete="new-password"
          required
          minLength={8}
          className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
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
        {pending ? "Aceitando convite..." : "Aceitar e entrar"}
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
