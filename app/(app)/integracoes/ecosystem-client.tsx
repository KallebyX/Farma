"use client";

import { useState } from "react";
import { Card, Badge, Button, Input, Icon } from "@/components/ui";

export type EcoConnection = {
  baseUrl: string | null;
  status: "DISCONNECTED" | "CONNECTED" | "ERROR";
  scopes: string[];
  lastSyncAt: string | null;
  lastError: string | null;
  autoPushDispensations: boolean;
  autoAcceptPrescriptions: boolean;
  shareAdherence: boolean;
  hasSecret: boolean;
};

export type PartnerCard = {
  key: "ATENDEBEM" | "MEU_PRONTUARIO";
  label: string;
  short: string;
  description: string;
  baseUrlHint: string;
  connection: EcoConnection | null;
};

export type SyncLogRow = {
  id: string;
  partner: string;
  direction: "INBOUND" | "OUTBOUND";
  event: string;
  status: "SUCCESS" | "FAILED";
  detail: string | null;
  createdAt: string;
};

const STATUS: Record<string, { tone: "emerald" | "rose" | "slate"; label: string }> = {
  CONNECTED: { tone: "emerald", label: "Conectado" },
  ERROR: { tone: "rose", label: "Erro" },
  DISCONNECTED: { tone: "slate", label: "Desconectado" },
};

export function EcosystemPanel({
  partners,
  logs,
  canManage,
}: {
  partners: PartnerCard[];
  logs: SyncLogRow[];
  canManage: boolean;
}) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-[15px] font-semibold text-slate-800 flex items-center gap-2">
          <Icon.Link size={16} /> Ecossistema Oryum
        </h2>
        <p className="mt-1 text-[12.5px] text-slate-500">
          Conecte o <b>AtendeBem</b> (clínica) e o <b>Meu Prontuário</b> (app do paciente). Receitas entram, dispensações e
          adesão saem — com consentimento e CPF hasheado.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {partners.map((p) => (
          <PartnerConnection key={p.key} partner={p} canManage={canManage} />
        ))}
      </div>

      <Card className="p-6">
        <h3 className="text-[14px] font-semibold text-slate-800 flex items-center gap-2">
          <Icon.Activity size={16} /> Sincronizações recentes
        </h3>
        <div className="mt-4 space-y-2">
          {logs.length === 0 && <p className="text-[13px] text-slate-500">Nenhuma sincronização ainda.</p>}
          {logs.map((l) => (
            <div key={l.id} className="flex items-center justify-between gap-3 rounded-lg border border-slate-100 px-3.5 py-2.5">
              <div className="min-w-0">
                <p className="text-[13px] font-medium text-slate-800 truncate">
                  <span className="font-mono text-[11.5px] text-slate-500">
                    {l.direction === "INBOUND" ? "←" : "→"} {partnerLabel(l.partner)}
                  </span>{" "}
                  {l.event}
                </p>
                {l.detail && <p className="text-[11.5px] text-slate-500 truncate">{l.detail}</p>}
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className="text-[11px] text-slate-400">{new Date(l.createdAt).toLocaleString("pt-BR")}</span>
                <Badge tone={l.status === "SUCCESS" ? "emerald" : "rose"} dot>
                  {l.status === "SUCCESS" ? "ok" : "falha"}
                </Badge>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

function partnerLabel(key: string): string {
  return key === "ATENDEBEM" ? "AtendeBem" : key === "MEU_PRONTUARIO" ? "Meu Prontuário" : key;
}

function PartnerConnection({ partner, canManage }: { partner: PartnerCard; canManage: boolean }) {
  const conn = partner.connection;
  const [baseUrl, setBaseUrl] = useState(conn?.baseUrl ?? "");
  const [status, setStatus] = useState(conn?.status ?? "DISCONNECTED");
  const [busy, setBusy] = useState<null | "connect" | "test" | "disconnect">(null);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(
    conn?.lastError ? { ok: false, text: conn.lastError } : null,
  );
  const [secret, setSecret] = useState<string | null>(null);

  async function call(action: "connect" | "test" | "disconnect") {
    setBusy(action);
    setMsg(null);
    try {
      const res = await fetch("/api/integracoes/ecosystem", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, partner: partner.key, baseUrl }),
      });
      const j = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        error?: string;
        detail?: string;
        status?: string;
        secret?: string;
      };
      if (!res.ok || j.ok === false) {
        setStatus("ERROR");
        setMsg({ ok: false, text: j.error ?? j.detail ?? "Falhou" });
        return;
      }
      if (action === "disconnect") {
        setStatus("DISCONNECTED");
        setMsg({ ok: true, text: "Desconectado." });
        return;
      }
      if (j.secret) setSecret(j.secret);
      const newStatus = (j.status as typeof status) ?? (j.ok ? "CONNECTED" : "ERROR");
      setStatus(newStatus);
      setMsg({ ok: newStatus === "CONNECTED", text: j.detail ?? (newStatus === "CONNECTED" ? "Conectado." : "Erro.") });
    } finally {
      setBusy(null);
    }
  }

  const st = STATUS[status] ?? STATUS.DISCONNECTED;

  return (
    <Card className="p-6 flex flex-col">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="text-[15px] font-semibold text-slate-800">{partner.label}</h3>
            <Badge tone="slate" size="sm">{partner.short}</Badge>
          </div>
          <p className="mt-1 text-[12.5px] text-slate-500">{partner.description}</p>
        </div>
        <Badge tone={st.tone} dot className="shrink-0">{st.label}</Badge>
      </div>

      <label className="mt-4 block text-[12px] font-medium text-slate-600">URL do parceiro</label>
      <Input
        type="url"
        value={baseUrl}
        onChange={(e) => setBaseUrl(e.target.value)}
        placeholder={partner.baseUrlHint}
        disabled={!canManage}
        className="mt-1.5"
      />

      {secret && (
        <div className="mt-3 rounded-lg border border-brand-200 bg-brand-50/60 p-3">
          <p className="text-[11.5px] font-semibold text-brand-800">Segredo compartilhado (mostrado uma vez)</p>
          <code className="mt-1 block break-all text-[11.5px] text-brand-900">{secret}</code>
          <p className="mt-1 text-[11px] text-brand-700">Use no {partner.label} para validar os eventos assinados (HMAC) que enviamos.</p>
        </div>
      )}

      {msg && (
        <p className={`mt-3 text-[12px] ${msg.ok ? "text-emerald-700" : "text-rose-600"}`}>{msg.text}</p>
      )}

      {conn?.lastSyncAt && (
        <p className="mt-2 text-[11px] text-slate-400">Última verificação: {new Date(conn.lastSyncAt).toLocaleString("pt-BR")}</p>
      )}

      {canManage && (
        <div className="mt-4 flex flex-wrap gap-2">
          <Button size="sm" onClick={() => call("connect")} disabled={busy !== null || !baseUrl.trim()}>
            {busy === "connect" ? "Conectando…" : conn?.status === "CONNECTED" ? "Salvar e reconectar" : "Conectar"}
          </Button>
          <Button size="sm" variant="secondary" onClick={() => call("test")} disabled={busy !== null || !baseUrl.trim()}>
            {busy === "test" ? "Testando…" : "Testar"}
          </Button>
          {status !== "DISCONNECTED" && (
            <Button size="sm" variant="ghost" onClick={() => call("disconnect")} disabled={busy !== null}>
              Desconectar
            </Button>
          )}
        </div>
      )}
    </Card>
  );
}
