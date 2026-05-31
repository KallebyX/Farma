"use client";

import { useEffect, useRef, useState } from "react";
import { Card, Button, Badge, Icon } from "@/components/ui";

type Exam = {
  id: string; title: string; category: string | null; fileName: string;
  mimeType: string; sizeBytes: number; status: string; uploadedBy: string | null; createdAt: string;
};

const CATEGORIES = ["Laboratorial", "Imagem", "Receita", "Atestado", "Outro"];

function fmtSize(b: number) {
  if (b < 1024) return `${b} B`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(0)} KB`;
  return `${(b / 1024 / 1024).toFixed(1)} MB`;
}

/**
 * Exam list + uploader. `apiBase` is "/api/exams" (staff, needs patientId) or
 * "/api/patient/exams" (patient hub). Downloads go to `${apiBase}/${id}/download`.
 */
export function ExamsManager({ apiBase, patientId, compact }: { apiBase: string; patientId?: string; compact?: boolean }) {
  const [exams, setExams] = useState<Exam[]>([]);
  const [loading, setLoading] = useState(true);
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const listUrl = patientId ? `${apiBase}?patientId=${encodeURIComponent(patientId)}` : apiBase;

  async function load() {
    setLoading(true);
    try {
      const r = await fetch(listUrl);
      const j = await r.json().catch(() => ({}));
      if (j.ok) setExams(j.exams as Exam[]);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function upload() {
    setErr(null);
    setNotice(null);
    const file = fileRef.current?.files?.[0];
    if (!file) { setErr("Selecione um arquivo"); return; }
    if (title.trim().length < 2) { setErr("Informe um título"); return; }
    setBusy(true);
    try {
      const fd = new FormData();
      fd.set("file", file);
      fd.set("title", title);
      fd.set("category", category);
      if (patientId) fd.set("patientId", patientId);
      const r = await fetch(apiBase, { method: "POST", body: fd });
      const j = await r.json().catch(() => ({}));
      if (!r.ok || !j.ok) { setErr(j.error ?? "Falha no upload"); return; }
      setTitle("");
      if (fileRef.current) fileRef.current.value = "";
      setNotice("Exame enviado com sucesso.");
      load();
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-[15px] font-semibold text-slate-800 flex items-center gap-2"><Icon.Book size={16} /> Exames & documentos</h2>
        <Badge tone="slate">{exams.length}</Badge>
      </div>

      {/* uploader */}
      <div className="mt-4 rounded-lg border border-dashed border-slate-300 bg-slate-50/60 p-4">
        {err && <p className="mb-2 text-[12.5px] text-rose-700">{err}</p>}
        {notice && <p className="mb-2 text-[12.5px] text-emerald-700">{notice}</p>}
        <div className={compact ? "space-y-2" : "grid gap-2 sm:grid-cols-[1fr_auto_auto] sm:items-end"}>
          <div>
            <label className="text-[12px] font-medium text-slate-700">Título</label>
            <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ex.: Hemograma completo"
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-[13px]" />
          </div>
          <div>
            <label className="text-[12px] font-medium text-slate-700">Categoria</label>
            <select value={category} onChange={(e) => setCategory(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-[13px] bg-white">
              {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
            </select>
          </div>
          <input ref={fileRef} type="file" accept="application/pdf,image/*"
            className="mt-1 text-[12px] file:mr-2 file:rounded-md file:border-0 file:bg-brand-50 file:px-3 file:py-2 file:text-[12px] file:font-medium file:text-brand-800" />
        </div>
        <div className="mt-3">
          <Button size="sm" icon={<Icon.Plus size={14} />} onClick={upload} disabled={busy}>{busy ? "Enviando..." : "Enviar exame"}</Button>
          <span className="ml-2 text-[11px] text-slate-400">PDF ou imagem, até 10 MB</span>
        </div>
      </div>

      {/* list */}
      <div className="mt-4 space-y-2">
        {loading && <p className="text-[13px] text-slate-500">Carregando…</p>}
        {!loading && exams.length === 0 && <p className="text-[13px] text-slate-500">Nenhum exame ainda.</p>}
        {exams.map((e) => (
          <div key={e.id} className="flex items-center justify-between rounded-lg border border-slate-100 px-3.5 py-2.5">
            <div className="min-w-0">
              <p className="text-[13.5px] font-medium text-slate-800 truncate">{e.title}</p>
              <p className="text-[12px] text-slate-500 truncate">
                {(e.category ? `${e.category} · ` : "")}{fmtSize(e.sizeBytes)} · {new Date(e.createdAt).toLocaleDateString("pt-BR")}
                {e.uploadedBy === "patient" ? " · enviado pelo paciente" : ""}
              </p>
            </div>
            <a href={`${apiBase}/${e.id}/download`} target="_blank" rel="noreferrer"
              className="shrink-0 inline-flex items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-1.5 text-[12.5px] font-medium text-slate-700 hover:bg-slate-50">
              <Icon.ArrowBack size={13} className="rotate-180" /> Abrir
            </a>
          </div>
        ))}
      </div>
    </Card>
  );
}
