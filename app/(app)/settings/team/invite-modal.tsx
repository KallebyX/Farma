"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Role, InvitationChannel } from "@prisma/client";

const ROLE_OPTIONS: { value: Role; label: string }[] = [
  { value: Role.PHARMACIST, label: "Farmacêutico responsável" },
  { value: Role.ATTENDANT, label: "Atendente" },
  { value: Role.READONLY, label: "Somente leitura" },
];

const ROLE_OPTIONS_OWNER: { value: Role; label: string }[] = [
  { value: Role.OWNER, label: "Proprietário" },
  ...ROLE_OPTIONS,
];

type FieldErrors = Partial<Record<string, string>>;

export function InviteModal({ currentRole }: { currentRole: Role }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [pending, startTransition] = useTransition();
  const [createdLink, setCreatedLink] = useState<string | null>(null);
  const [createdSummary, setCreatedSummary] = useState<
    { channel: string; status: string; error?: string }[] | null
  >(null);
  const [role, setRole] = useState<Role>(Role.ATTENDANT);
  const [channels, setChannels] = useState<InvitationChannel[]>([InvitationChannel.EMAIL, InvitationChannel.LINK]);

  const roleOptions = currentRole === Role.OWNER ? ROLE_OPTIONS_OWNER : ROLE_OPTIONS;

  function reset() {
    setErrors({});
    setCreatedLink(null);
    setCreatedSummary(null);
    setRole(Role.ATTENDANT);
    setChannels([InvitationChannel.EMAIL, InvitationChannel.LINK]);
  }

  function close() {
    setOpen(false);
    reset();
    router.refresh();
  }

  function toggleChannel(c: InvitationChannel) {
    setChannels((prev) => (prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c]));
  }

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErrors({});
    const fd = new FormData(e.currentTarget);
    const payload = {
      email: String(fd.get("email") ?? ""),
      name: String(fd.get("name") ?? "") || undefined,
      role,
      crf: String(fd.get("crf") ?? "") || undefined,
      phone: String(fd.get("phone") ?? "") || undefined,
      channels,
    };

    startTransition(async () => {
      try {
        const res = await fetch("/api/invitations", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const json = (await res.json().catch(() => ({}))) as {
          ok?: boolean;
          inviteUrl?: string;
          fieldErrors?: FieldErrors;
          error?: string;
          deliveries?: { channel: string; status: string; error?: string }[];
        };
        if (!res.ok || !json.ok) {
          setErrors({ ...(json.fieldErrors ?? {}), form: json.error ?? "Falha ao enviar convite" });
          return;
        }
        setCreatedLink(json.inviteUrl ?? null);
        setCreatedSummary(json.deliveries ?? null);
        router.refresh();
      } catch (err) {
        setErrors({ form: err instanceof Error ? err.message : "Erro inesperado" });
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
        Convidar membro
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
              <h2 className="text-base font-semibold text-slate-800">Convidar membro</h2>
              <button
                type="button"
                onClick={close}
                className="text-slate-400 hover:text-slate-600"
                aria-label="Fechar"
              >
                ×
              </button>
            </div>

            {createdLink ? (
              <SuccessView link={createdLink} summary={createdSummary} onDone={close} />
            ) : (
              <form onSubmit={onSubmit} className="px-5 py-5 space-y-4">
                {errors.form ? (
                  <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 border border-red-100">
                    {errors.form}
                  </p>
                ) : null}

                <Field label="Email" error={errors.email}>
                  <input
                    name="email"
                    type="email"
                    required
                    autoFocus
                    placeholder="colega@farmacia.com"
                    className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                  />
                </Field>

                <Field label="Nome (opcional)" error={errors.name}>
                  <input
                    name="name"
                    type="text"
                    placeholder="Para personalizar o email enviado"
                    className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                  />
                </Field>

                <Field label="Papel" error={errors.role}>
                  <select
                    name="role"
                    value={role}
                    onChange={(e) => setRole(e.target.value as Role)}
                    className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm bg-white"
                  >
                    {roleOptions.map((r) => (
                      <option key={r.value} value={r.value}>
                        {r.label}
                      </option>
                    ))}
                  </select>
                </Field>

                {role === Role.PHARMACIST ? (
                  <Field
                    label="CRF"
                    hint="Obrigatório para farmacêutico responsável"
                    error={errors.crf}
                  >
                    <input
                      name="crf"
                      type="text"
                      required
                      placeholder="CRF-RS 12345"
                      className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                    />
                  </Field>
                ) : null}

                <fieldset>
                  <legend className="text-sm font-medium text-slate-700">Como enviar?</legend>
                  <div className="mt-2 space-y-2">
                    <ChannelOption
                      label="Email"
                      description="Convite formal com link de aceite"
                      checked={channels.includes(InvitationChannel.EMAIL)}
                      onChange={() => toggleChannel(InvitationChannel.EMAIL)}
                    />
                    <ChannelOption
                      label="WhatsApp"
                      description="Mensagem direta com link (requer telefone)"
                      checked={channels.includes(InvitationChannel.WHATSAPP)}
                      onChange={() => toggleChannel(InvitationChannel.WHATSAPP)}
                    />
                    <ChannelOption
                      label="Link copiável"
                      description="Mostra o link na tela para você compartilhar como preferir"
                      checked={channels.includes(InvitationChannel.LINK)}
                      onChange={() => toggleChannel(InvitationChannel.LINK)}
                    />
                  </div>
                  {errors.channels ? (
                    <p className="mt-1 text-xs text-red-600">{errors.channels}</p>
                  ) : null}
                </fieldset>

                {channels.includes(InvitationChannel.WHATSAPP) ? (
                  <Field
                    label="Telefone"
                    hint="Formato internacional: +5511999999999"
                    error={errors.phone}
                  >
                    <input
                      name="phone"
                      type="tel"
                      required
                      placeholder="+5511999999999"
                      pattern="^\+\d{10,15}$"
                      className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                    />
                  </Field>
                ) : null}

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={close}
                    className="rounded-md px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={pending || channels.length === 0}
                    className="rounded-md bg-brand-500 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {pending ? "Enviando..." : "Enviar convite"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      ) : null}
    </>
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

function ChannelOption({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange: () => void;
}) {
  return (
    <label className="flex cursor-pointer items-start gap-3 rounded-md border border-slate-200 p-3 hover:border-brand-300">
      <input
        type="checkbox"
        checked={checked}
        onChange={onChange}
        className="mt-0.5 h-4 w-4 rounded border-slate-300 text-brand-500 focus:ring-brand-500"
      />
      <span>
        <span className="block text-sm font-medium text-slate-800">{label}</span>
        <span className="block text-xs text-slate-500">{description}</span>
      </span>
    </label>
  );
}

function SuccessView({
  link,
  summary,
  onDone,
}: {
  link: string;
  summary: { channel: string; status: string; error?: string }[] | null;
  onDone: () => void;
}) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* noop */
    }
  }

  return (
    <div className="px-5 py-5 space-y-4">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-50 text-green-600">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </div>
        <div>
          <p className="text-sm font-semibold text-slate-800">Convite criado</p>
          <p className="text-xs text-slate-500">
            O link expira em 7 dias e é único por convite.
          </p>
        </div>
      </div>

      <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2.5">
        <p className="text-[11px] uppercase tracking-wide text-slate-500">Link de aceite</p>
        <p className="mt-1 break-all font-mono text-xs text-slate-700">{link}</p>
        <button
          type="button"
          onClick={copy}
          className="mt-2 rounded border border-slate-300 bg-white px-3 py-1 text-xs font-medium text-slate-700 hover:bg-slate-100"
        >
          {copied ? "Copiado!" : "Copiar link"}
        </button>
      </div>

      {summary && summary.length > 0 ? (
        <div className="rounded-md border border-slate-200 px-3 py-2.5">
          <p className="text-[11px] uppercase tracking-wide text-slate-500">Entregas</p>
          <ul className="mt-1 space-y-0.5 text-xs text-slate-600">
            {summary.map((d, i) => (
              <li key={i}>
                <span className="font-medium">{d.channel}</span> · {d.status}
                {d.error ? <span className="text-amber-700"> — {d.error}</span> : null}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="flex justify-end">
        <button
          type="button"
          onClick={onDone}
          className="rounded-md bg-brand-500 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-600"
        >
          Concluir
        </button>
      </div>
    </div>
  );
}
