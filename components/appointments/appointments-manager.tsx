"use client";

import { useEffect, useState } from "react";
import { Card, Button, Badge, Icon } from "@/components/ui";

type Appt = {
  id: string; title: string; kind: string; scheduledAt: string; durationMin: number;
  location: string | null; professional: string | null; status: string; notes: string | null;
};

const KIND_LABEL: Record<string, string> = { CONSULTATION: "Consulta", FOLLOWUP: "Retorno", EXAM: "Exame", VACCINE: "Vacina", OTHER: "Outro" };
const STATUS: Record<string, { label: string; tone: "brand" | "emerald" | "rose" | "amber" }> = {
  SCHEDULED: { label: "Agendada", tone: "brand" }, COMPLETED: { label: "Concluída", tone: "emerald" },
  CANCELLED: { label: "Cancelada", tone: "rose" }, NO_SHOW: { label: "Faltou", tone: "amber" },
};

export function AppointmentsManager({ patientId }: { patientId: string }) {
  const base = `/api/patients/${patientId}/appointments`;
  const [items, setItems] = useState<Appt[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [form, setForm] = useState({ title: "", kind: "CONSULTATION", scheduledAt: "", durationMin: 30, professional: "", location: "" });

  async function load() {
    try {
      const r = await fetch(base);
      const j = await r.json().catch(() => ({}));
      if (j.ok) setItems(j.appointments as Appt[]);
    } finally { setLoading(false); }
  }
  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function create() {
    setErr(null);
    if (form.title.trim().length < 2 || !form.scheduledAt) { setErr("Título e data/hora são obrigatórios"); return; }
    setBusy(true);
    try {
      const r = await fetch(base, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
      const j = await r.json().catch(() => ({}));
      if (!r.ok || !j.ok) { setErr(j.error ?? "Erro ao agendar"); return; }
      setOpen(false);
      setForm({ title: "", kind: "CONSULTATION", scheduledAt: "", durationMin: 30, professional: "", location: "" });
      load();
    } finally { setBusy(false); }
  }

  async function setStatus(id: string, status: string) {
    await fetch(`/api/appointments/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status }) });
    load();
  }

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-[15px] font-semibold text-slate-800 flex items-center gap-2"><Icon.Calendar size={16} /> Consultas & agendamentos</h2>
        {!open && <Button size="sm" icon={<Icon.Plus size={14} />} onClick={() => setOpen(true)}>Agendar</Button>}
      </div>

      {open && (
        <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-4 space-y-2">
          {err && <p className="text-[12.5px] text-rose-700">{err}</p>}
          <div className="grid gap-2 sm:grid-cols-2">
            <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Título (ex.: Consulta farmacêutica)" className="rounded-lg border border-slate-300 px-3 py-2 text-[13px] sm:col-span-2" />
            <select value={form.kind} onChange={(e) => setForm({ ...form, kind: e.target.value })} className="rounded-lg border border-slate-300 px-3 py-2 text-[13px] bg-white">
              {Object.entries(KIND_LABEL).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
            </select>
            <input type="datetime-local" value={form.scheduledAt} onChange={(e) => setForm({ ...form, scheduledAt: e.target.value })} className="rounded-lg border border-slate-300 px-3 py-2 text-[13px]" />
            <input value={form.professional} onChange={(e) => setForm({ ...form, professional: e.target.value })} placeholder="Profissional" className="rounded-lg border border-slate-300 px-3 py-2 text-[13px]" />
            <input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} placeholder="Local" className="rounded-lg border border-slate-300 px-3 py-2 text-[13px]" />
          </div>
          <div className="flex gap-2 pt-1">
            <Button size="sm" onClick={create} disabled={busy}>{busy ? "Salvando…" : "Salvar"}</Button>
            <Button size="sm" variant="ghost" onClick={() => { setOpen(false); setErr(null); }}>Cancelar</Button>
          </div>
        </div>
      )}

      <div className="mt-4 space-y-2">
        {loading && <p className="text-[13px] text-slate-500">Carregando…</p>}
        {!loading && items.length === 0 && <p className="text-[13px] text-slate-500">Nenhuma consulta agendada.</p>}
        {items.map((a) => {
          const st = STATUS[a.status] ?? STATUS.SCHEDULED;
          return (
            <div key={a.id} className="rounded-lg border border-slate-100 px-3.5 py-2.5">
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-[13.5px] font-medium text-slate-800 truncate">{a.title} <span className="text-[11px] text-slate-400">· {KIND_LABEL[a.kind] ?? a.kind}</span></p>
                  <p className="text-[12px] text-slate-500">
                    {new Date(a.scheduledAt).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })} · {a.durationMin}min
                    {a.professional ? ` · ${a.professional}` : ""}{a.location ? ` · ${a.location}` : ""}
                  </p>
                </div>
                <Badge tone={st.tone} dot className="shrink-0">{st.label}</Badge>
              </div>
              {a.status === "SCHEDULED" && (
                <div className="mt-2 flex gap-1.5">
                  <button onClick={() => setStatus(a.id, "COMPLETED")} className="text-[11.5px] font-medium rounded-md px-2 py-1 bg-emerald-50 text-emerald-700 hover:bg-emerald-100">Concluir</button>
                  <button onClick={() => setStatus(a.id, "NO_SHOW")} className="text-[11.5px] font-medium rounded-md px-2 py-1 bg-amber-50 text-amber-700 hover:bg-amber-100">Faltou</button>
                  <button onClick={() => setStatus(a.id, "CANCELLED")} className="text-[11.5px] font-medium rounded-md px-2 py-1 bg-rose-50 text-rose-700 hover:bg-rose-100">Cancelar</button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </Card>
  );
}
