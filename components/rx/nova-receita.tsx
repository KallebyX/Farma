"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Modal, Field, Input, Icon } from "@/components/ui";

type PatientHit = { id: string; name: string; phone: string };

/**
 * "Nova receita" by photo/PDF (Claude Design NovaReceita) — pick a patient and
 * import a photo or PDF of the prescription. Creates a DigitalPrescription lead
 * (signature auto-detected) that lands in the dispensation list below.
 */
export function NovaReceita() {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const [query, setQuery] = useState("");
  const [hits, setHits] = useState<PatientHit[]>([]);
  const [searching, setSearching] = useState(false);
  const [patient, setPatient] = useState<PatientHit | null>(null);
  const [file, setFile] = useState<File | null>(null);

  function reset() {
    setQuery(""); setHits([]); setPatient(null); setFile(null); setErr(null);
  }

  async function search(q: string) {
    setQuery(q);
    setPatient(null);
    if (q.trim().length < 2) { setHits([]); return; }
    setSearching(true);
    try {
      const res = await fetch(`/api/patients?q=${encodeURIComponent(q.trim())}`);
      const j = await res.json().catch(() => ({}));
      setHits(Array.isArray(j.patients) ? j.patients.slice(0, 6).map((p: PatientHit) => ({ id: p.id, name: p.name, phone: p.phone })) : []);
    } finally {
      setSearching(false);
    }
  }

  async function submit() {
    setErr(null);
    if (!patient) return setErr("Selecione o paciente.");
    if (!file) return setErr("Importe a foto ou o PDF da receita.");
    setBusy(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("patientId", patient.id);
      const res = await fetch("/api/rx/upload", { method: "POST", body: fd });
      const j = await res.json().catch(() => ({}));
      if (!res.ok || j.ok === false) { setErr(j.error ?? "Falha ao enviar a receita."); return; }
      setOpen(false);
      reset();
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <Button icon={<Icon.Plus size={15} />} onClick={() => setOpen(true)}>Nova receita</Button>

      <Modal
        open={open}
        onClose={() => !busy && setOpen(false)}
        title="Nova receita"
        subtitle="Importe a foto ou o PDF — a assinatura é detectada automaticamente."
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => !busy && setOpen(false)}>Cancelar</Button>
            <Button onClick={submit} disabled={busy || !patient || !file}>{busy ? "Enviando…" : "Adicionar receita"}</Button>
          </div>
        }
      >
        <div className="flex flex-col gap-4">
          {/* Patient picker */}
          <Field label="Paciente">
            {patient ? (
              <div className="flex items-center justify-between gap-2 rounded-lg border border-brand-200 bg-brand-50/60 px-3 py-2.5">
                <div className="min-w-0">
                  <p className="text-[13px] font-semibold text-slate-800 truncate">{patient.name}</p>
                  <p className="text-[11.5px] text-slate-500">{patient.phone}</p>
                </div>
                <button type="button" onClick={() => { setPatient(null); setQuery(""); }} className="text-brand-700 text-[12px] font-medium hover:underline shrink-0">Trocar</button>
              </div>
            ) : (
              <div className="relative">
                <Input value={query} onChange={(e) => search(e.target.value)} placeholder="Buscar por nome ou telefone" icon={<Icon.Search size={15} />} />
                {(searching || hits.length > 0) && (
                  <div className="mt-1.5 rounded-lg border border-slate-200 bg-white shadow-card overflow-hidden">
                    {searching && <p className="px-3 py-2 text-[12.5px] text-slate-400">Buscando…</p>}
                    {!searching && hits.map((h) => (
                      <button key={h.id} type="button" onClick={() => { setPatient(h); setHits([]); }}
                        className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left hover:bg-slate-50">
                        <span className="text-[13px] text-slate-800 truncate">{h.name}</span>
                        <span className="text-[11.5px] text-slate-400 shrink-0">{h.phone}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </Field>

          {/* Photo / PDF import box */}
          <input
            ref={fileRef}
            type="file"
            accept="image/*,application/pdf,.p7s"
            capture="environment"
            className="hidden"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          />
          {file ? (
            <div className="flex items-center gap-3 rounded-lg border border-emerald-200 bg-emerald-50/70 px-3.5 py-3">
              <Icon.Check size={18} className="text-emerald-600 shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="text-[13px] font-medium text-slate-800 truncate">{file.name}</p>
                <p className="text-[11.5px] text-slate-500">{(file.size / 1024).toFixed(0)} KB · pronta para enviar</p>
              </div>
              <button type="button" onClick={() => { setFile(null); if (fileRef.current) fileRef.current.value = ""; }} aria-label="Remover" className="text-slate-400 hover:text-slate-700 shrink-0">
                <Icon.X size={16} />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="flex w-full items-center gap-3 rounded-lg border-[1.5px] border-dashed border-slate-300 bg-slate-50/60 px-4 py-4 text-left hover:border-brand-400 hover:bg-brand-50/40 transition-colors"
            >
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50 text-brand-700 shrink-0">
                <Icon.Pill size={20} />
              </span>
              <span>
                <span className="block text-[13.5px] font-semibold text-slate-800">Importar foto ou PDF</span>
                <span className="block text-[12px] text-slate-500">Tire uma foto da receita ou selecione um arquivo (até 10 MB).</span>
              </span>
            </button>
          )}

          {err && <p className="text-[12.5px] text-rose-600">{err}</p>}
        </div>
      </Modal>
    </>
  );
}
