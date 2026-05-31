"use client";

import { useState } from "react";
import { Card, Badge, Button, Icon } from "@/components/ui";

type Lead = { id: string; fileName: string; signature: string; status: string; createdAt: string; patient: { id: string; name: string; phone: string } };
type Disp = { id: string; medication: string; batchLot: string | null; quantity: number; nfeAccessKey: string | null; crm: string | null; sngpcStatus: string; createdAt: string; patient: { name: string } };

const SIG: Record<string, { label: string; tone: "emerald" | "slate" | "rose" | "amber" }> = {
  VERIFIED_ICP: { label: "Assinada (ICP-Brasil)", tone: "emerald" },
  SIGNED_DETECTED: { label: "Assinada (validação ICP pendente)", tone: "amber" },
  UNSIGNED: { label: "Receita comum", tone: "slate" },
  INVALID: { label: "Assinatura inválida", tone: "rose" },
};

export function DispensePanel({ leads, dispensations }: { leads: Lead[]; dispensations: Disp[] }) {
  const [openId, setOpenId] = useState<string | null>(null);
  const [done, setDone] = useState<Set<string>>(new Set());

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <Card className="p-6">
        <h2 className="text-[15px] font-semibold text-slate-800 flex items-center gap-2"><Icon.Inbox size={16} /> Receitas recebidas (leads)</h2>
        <div className="mt-4 space-y-2">
          {leads.length === 0 && <p className="text-[13px] text-slate-500">Nenhuma receita pendente. Pacientes enviam pelo hub.</p>}
          {leads.filter((l) => !done.has(l.id)).map((l) => {
            const sig = SIG[l.signature] ?? SIG.UNSIGNED;
            return (
              <div key={l.id} className="rounded-lg border border-slate-100 px-3.5 py-2.5">
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-[13.5px] font-medium text-slate-800 truncate">{l.patient.name}</p>
                    <p className="text-[12px] text-slate-500 truncate">{new Date(l.createdAt).toLocaleString("pt-BR")} · {l.fileName}</p>
                  </div>
                  <Badge tone={sig.tone} dot className="shrink-0">{sig.label}</Badge>
                </div>
                <div className="mt-2 flex gap-1.5">
                  <a href={`/api/rx/${l.id}/download`} target="_blank" rel="noreferrer" className="text-[11.5px] font-medium rounded-md px-2 py-1 bg-slate-100 text-slate-700 hover:bg-slate-200">Abrir receita</a>
                  <button onClick={() => setOpenId(openId === l.id ? null : l.id)} className="text-[11.5px] font-medium rounded-md px-2 py-1 bg-brand-50 text-brand-700 hover:bg-brand-100">Dispensar</button>
                </div>
                {openId === l.id && (
                  <DispenseForm lead={l} onDone={() => { setDone((s) => new Set(s).add(l.id)); setOpenId(null); }} />
                )}
              </div>
            );
          })}
        </div>
      </Card>

      <Card className="p-6">
        <h2 className="text-[15px] font-semibold text-slate-800 flex items-center gap-2"><Icon.Shield size={16} /> Dispensações (rastreabilidade)</h2>
        <div className="mt-4 space-y-2">
          {dispensations.length === 0 && <p className="text-[13px] text-slate-500">Nenhuma dispensação registrada.</p>}
          {dispensations.map((d) => (
            <div key={d.id} className="rounded-lg border border-slate-100 px-3.5 py-2.5">
              <div className="flex items-center justify-between gap-2">
                <p className="text-[13.5px] font-medium text-slate-800 truncate">{d.medication} <span className="text-[11px] text-slate-400">× {d.quantity}</span></p>
                {d.sngpcStatus !== "NA" && <Badge tone={d.sngpcStatus === "SENT" ? "emerald" : "amber"} className="shrink-0">SNGPC: {d.sngpcStatus.toLowerCase()}</Badge>}
              </div>
              <p className="text-[11.5px] text-slate-500">
                {d.patient.name} · {new Date(d.createdAt).toLocaleDateString("pt-BR")}
                {d.batchLot ? ` · lote ${d.batchLot}` : ""}{d.crm ? ` · CRM ${d.crm}` : ""}{d.nfeAccessKey ? ` · NF …${d.nfeAccessKey.slice(-6)}` : ""}
              </p>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

function DispenseForm({ lead, onDone }: { lead: Lead; onDone: () => void }) {
  const [f, setF] = useState({ medication: "", batchLot: "", quantity: 1, nfeAccessKey: "", crm: "", controlled: false });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function submit() {
    setErr(null);
    if (f.medication.trim().length < 2) { setErr("Informe o medicamento"); return; }
    setBusy(true);
    try {
      const r = await fetch("/api/rx/dispense", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...f, prescriptionId: lead.id, patientId: lead.patient.id }),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok || !j.ok) { setErr(j.error ?? "Erro ao dispensar"); return; }
      onDone();
    } finally { setBusy(false); }
  }

  return (
    <div className="mt-2 rounded-lg bg-slate-50 border border-slate-200 p-3 space-y-2">
      {err && <p className="text-[12px] text-rose-700">{err}</p>}
      <div className="grid grid-cols-2 gap-2">
        <input value={f.medication} onChange={(e) => setF({ ...f, medication: e.target.value })} placeholder="Medicamento" className="col-span-2 rounded-md border border-slate-300 px-2.5 py-1.5 text-[12.5px]" />
        <input value={f.batchLot} onChange={(e) => setF({ ...f, batchLot: e.target.value })} placeholder="Lote" className="rounded-md border border-slate-300 px-2.5 py-1.5 text-[12.5px]" />
        <input type="number" min={1} value={f.quantity} onChange={(e) => setF({ ...f, quantity: Number(e.target.value) })} placeholder="Qtd" className="rounded-md border border-slate-300 px-2.5 py-1.5 text-[12.5px]" />
        <input value={f.crm} onChange={(e) => setF({ ...f, crm: e.target.value })} placeholder="CRM do prescritor" className="rounded-md border border-slate-300 px-2.5 py-1.5 text-[12.5px]" />
        <input value={f.nfeAccessKey} onChange={(e) => setF({ ...f, nfeAccessKey: e.target.value })} placeholder="Chave NF-e (44 díg.)" className="rounded-md border border-slate-300 px-2.5 py-1.5 text-[12.5px]" />
      </div>
      <label className="flex items-center gap-2 text-[12px] text-slate-600">
        <input type="checkbox" checked={f.controlled} onChange={(e) => setF({ ...f, controlled: e.target.checked })} /> Medicamento controlado (fila SNGPC)
      </label>
      <Button size="sm" onClick={submit} disabled={busy}>{busy ? "Registrando…" : "Confirmar dispensação"}</Button>
    </div>
  );
}
