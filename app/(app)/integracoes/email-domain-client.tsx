"use client";

import { useEffect, useState } from "react";
import { Card, Badge, Icon } from "@/components/ui";

type DnsRecord = { record?: string; name: string; type: string; value: string; ttl?: string; priority?: number; status?: string };
type State = { domain: string | null; status: string; records: DnsRecord[] };

const STATUS_TONE: Record<string, "emerald" | "amber" | "rose" | "slate"> = {
  verified: "emerald", pending: "amber", failed: "rose", temporary_failure: "amber", not_started: "amber", not_created: "slate",
};

/** Owner-only panel to create and verify the e-mail sending domain (Resend) in-app. */
export function EmailDomainPanel() {
  const [state, setState] = useState<State | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function call(method: "GET" | "POST" | "PATCH") {
    setBusy(true);
    setMsg(null);
    try {
      const r = await fetch("/api/admin/email-domain", { method });
      const j = await r.json().catch(() => ({}));
      if (!r.ok || !j.ok) { setMsg(j.error ?? "Erro"); return; }
      setState({ domain: j.domain, status: j.status, records: j.records ?? [] });
      if (method === "PATCH") setMsg(j.status === "verified" ? "Domínio verificado! E-mails liberados." : "Verificação solicitada. Pode levar alguns minutos após o DNS propagar.");
    } finally { setBusy(false); }
  }

  useEffect(() => { call("GET"); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, []);

  const verified = state?.status === "verified";
  return (
    <Card className="mt-6 p-6">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-[15px] font-semibold text-slate-800 flex items-center gap-2"><Icon.Bell size={16} /> E-mail (Resend)</h2>
        {state && <Badge tone={STATUS_TONE[state.status] ?? "slate"} dot>{state.status === "not_created" ? "não criado" : state.status}</Badge>}
      </div>
      <p className="mt-1 text-[12.5px] text-slate-500">
        Domínio de envio: <code className="text-[11.5px]">{state?.domain ?? "…"}</code>. Para enviar e-mails (convites, etc.) a qualquer
        destinatário, o domínio precisa ser verificado no Resend (registros DNS).
      </p>

      {msg && <p className="mt-3 rounded-md bg-slate-50 border border-slate-100 px-3 py-2 text-[12.5px] text-slate-700">{msg}</p>}

      <div className="mt-4 flex flex-wrap gap-2">
        {state?.status === "not_created" && (
          <button onClick={() => call("POST")} disabled={busy}
            className="rounded-lg bg-brand-700 px-4 py-2 text-[13px] font-semibold text-white hover:bg-brand-800 disabled:opacity-60">
            {busy ? "Criando…" : "Criar domínio no Resend"}
          </button>
        )}
        {state && state.status !== "not_created" && !verified && (
          <button onClick={() => call("PATCH")} disabled={busy}
            className="rounded-lg bg-brand-700 px-4 py-2 text-[13px] font-semibold text-white hover:bg-brand-800 disabled:opacity-60">
            {busy ? "Verificando…" : "Verificar domínio"}
          </button>
        )}
        <button onClick={() => call("GET")} disabled={busy} className="rounded-lg border border-slate-300 px-4 py-2 text-[13px] font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60">
          Atualizar status
        </button>
      </div>

      {!verified && state && state.records.length > 0 && (
        <div className="mt-4">
          <p className="text-[12.5px] font-medium text-slate-700">Adicione estes registros no DNS de <code>{state.domain}</code>:</p>
          <div className="mt-2 overflow-x-auto">
            <table className="w-full text-left text-[11.5px]">
              <thead className="text-slate-500">
                <tr><th className="py-1 pr-3">Tipo</th><th className="py-1 pr-3">Nome</th><th className="py-1 pr-3">Valor</th><th className="py-1 pr-3">Prioridade</th><th className="py-1">Status</th></tr>
              </thead>
              <tbody className="font-mono text-slate-700">
                {state.records.map((r, i) => (
                  <tr key={i} className="border-t border-slate-100 align-top">
                    <td className="py-1.5 pr-3">{r.type}</td>
                    <td className="py-1.5 pr-3 break-all">{r.name}</td>
                    <td className="py-1.5 pr-3 break-all">{r.value}</td>
                    <td className="py-1.5 pr-3">{r.priority ?? "-"}</td>
                    <td className="py-1.5">{r.status ?? "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {verified && <p className="mt-3 text-[13px] text-emerald-700 font-medium">✓ Domínio verificado. Os e-mails saem de {state?.domain}.</p>}
    </Card>
  );
}
