"use client";

import { useState } from "react";
import { Card, Badge, Button, Input, Icon } from "@/components/ui";

type KeyRow = {
  id: string; name: string; prefix: string; scopes: string[];
  lastUsedAt: string | null; revokedAt: string | null; createdAt: string;
};

export function ApiKeysPanel({ initialKeys, canCreate }: { initialKeys: KeyRow[]; canCreate: boolean }) {
  const [keys, setKeys] = useState<KeyRow[]>(initialKeys);
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [issued, setIssued] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  async function create() {
    setErr(null);
    setBusy(true);
    try {
      const res = await fetch("/api/keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok || !j.ok) { setErr(j.error ?? "Erro ao criar chave"); return; }
      setIssued(j.apiKey);
      setKeys((prev) => [
        { id: j.id, name, prefix: j.prefix, scopes: ["*"], lastUsedAt: null, revokedAt: null, createdAt: new Date().toISOString() },
        ...prev,
      ]);
      setName("");
      setCreating(false);
    } finally {
      setBusy(false);
    }
  }

  function copy() {
    if (!issued) return;
    navigator.clipboard?.writeText(issued).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-[15px] font-semibold text-slate-800 flex items-center gap-2"><Icon.Shield size={16} /> Chaves de API</h2>
          <p className="mt-1 text-[12.5px] text-slate-500">A chave é mostrada apenas uma vez. Guarde com segurança.</p>
        </div>
        {canCreate && !creating && (
          <Button size="sm" icon={<Icon.Plus size={15} />} onClick={() => { setCreating(true); setIssued(null); }}>Nova chave</Button>
        )}
      </div>

      {issued && (
        <div className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 p-4">
          <p className="text-[12px] font-semibold text-emerald-800">✓ Chave criada - copie agora, não será exibida novamente:</p>
          <div className="mt-2 flex items-center gap-2">
            <code className="flex-1 overflow-x-auto rounded-md bg-white px-3 py-2 text-[12.5px] font-mono text-slate-800 border border-emerald-200">{issued}</code>
            <Button size="sm" variant="success" icon={<Icon.Copy size={14} />} onClick={copy}>{copied ? "Copiado!" : "Copiar"}</Button>
          </div>
        </div>
      )}

      {creating && (
        <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-4">
          {err && <p className="mb-2 text-[12.5px] text-rose-700">{err}</p>}
          <div className="flex items-end gap-2">
            <div className="flex-1">
              <label className="text-[12px] font-medium text-slate-700">Nome da chave</label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex.: ERP da loja" className="mt-1" />
            </div>
            <Button size="md" onClick={create} disabled={busy || name.trim().length < 2}>{busy ? "Criando..." : "Criar"}</Button>
            <Button size="md" variant="ghost" onClick={() => { setCreating(false); setErr(null); }}>Cancelar</Button>
          </div>
        </div>
      )}

      <div className="mt-4 space-y-2">
        {keys.length === 0 && <p className="text-[13px] text-slate-500">Nenhuma chave criada ainda.</p>}
        {keys.map((k) => (
          <div key={k.id} className="flex items-center justify-between rounded-lg border border-slate-100 px-3.5 py-2.5">
            <div className="min-w-0">
              <p className="text-[13.5px] font-medium text-slate-800 truncate">{k.name}</p>
              <p className="text-[12px] text-slate-500 font-mono truncate">{k.prefix}··· · {k.scopes.join(", ") || "*"}</p>
            </div>
            {k.revokedAt
              ? <Badge tone="rose" className="shrink-0">revogada</Badge>
              : <Badge tone="emerald" dot className="shrink-0">ativa</Badge>}
          </div>
        ))}
      </div>
    </Card>
  );
}
