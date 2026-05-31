"use client";

import { useEffect, useRef, useState } from "react";
import { Card, Button, Icon } from "@/components/ui";

type Msg = { id: string; direction: "FROM_PATIENT" | "FROM_PHARMACY"; body: string; authorName: string | null; createdAt: string };

/**
 * Staff-side message thread with a patient. `apiBase` is
 * "/api/patients/<id>/messages". Pharmacy bubbles align right.
 */
export function MessagesThread({ apiBase }: { apiBase: string }) {
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const endRef = useRef<HTMLDivElement>(null);

  async function load() {
    try {
      const r = await fetch(apiBase);
      const j = await r.json().catch(() => ({}));
      if (j.ok) setMsgs(j.messages as Msg[]);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => { endRef.current?.scrollIntoView({ block: "nearest" }); }, [msgs]);

  async function send() {
    const text = body.trim();
    if (!text) return;
    setBusy(true);
    try {
      const r = await fetch(apiBase, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ body: text }) });
      const j = await r.json().catch(() => ({}));
      if (r.ok && j.ok) { setMsgs((m) => [...m, j.message]); setBody(""); }
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card className="p-6">
      <h2 className="text-[15px] font-semibold text-slate-800 flex items-center gap-2"><Icon.WhatsApp size={16} /> Mensagens com o paciente</h2>
      <p className="mt-1 text-[12px] text-slate-500">Também notifica o paciente por WhatsApp.</p>

      <div className="mt-4 max-h-80 overflow-y-auto space-y-2 pr-1">
        {loading && <p className="text-[13px] text-slate-500">Carregando…</p>}
        {!loading && msgs.length === 0 && <p className="text-[13px] text-slate-500">Nenhuma mensagem ainda.</p>}
        {msgs.map((m) => {
          const fromPharmacy = m.direction === "FROM_PHARMACY";
          return (
            <div key={m.id} className={`flex ${fromPharmacy ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[80%] rounded-2xl px-3.5 py-2 text-[13px] ${fromPharmacy ? "bg-brand-600 text-white rounded-br-sm" : "bg-slate-100 text-slate-800 rounded-bl-sm"}`}>
                <p className="whitespace-pre-wrap break-words">{m.body}</p>
                <p className={`mt-1 text-[10px] ${fromPharmacy ? "text-brand-100" : "text-slate-400"}`}>
                  {fromPharmacy ? (m.authorName ?? "Farmácia") : "Paciente"} · {new Date(m.createdAt).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}
                </p>
              </div>
            </div>
          );
        })}
        <div ref={endRef} />
      </div>

      <div className="mt-3 flex items-end gap-2">
        <textarea value={body} onChange={(e) => setBody(e.target.value)} rows={2} placeholder="Escreva uma mensagem…"
          onKeyDown={(e) => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) send(); }}
          className="flex-1 resize-none rounded-lg border border-slate-300 px-3 py-2 text-[13px] focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100" />
        <Button size="md" icon={<Icon.ChevronRight size={15} />} onClick={send} disabled={busy || body.trim().length === 0}>Enviar</Button>
      </div>
    </Card>
  );
}
