"use client";

import { useState } from "react";
import { Card, Button, Field, Input, Icon } from "@/components/ui";

type Settings = {
  fantasia: string | null; razaoSocial: string; chainName: string | null;
  addressLine: string | null; city: string | null; state: string | null;
  latitude: number | null; longitude: number | null;
  referralEnabled: boolean; referralPoints: number;
};

export function SettingsClient({ initial, canEdit }: { initial: Settings; canEdit: boolean }) {
  const [f, setF] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  function set<K extends keyof Settings>(k: K, v: Settings[K]) { setF((p) => ({ ...p, [k]: v })); }

  function useMyLocation() {
    if (!navigator.geolocation) { setErr("Geolocalização indisponível"); return; }
    navigator.geolocation.getCurrentPosition(
      (pos) => { set("latitude", Number(pos.coords.latitude.toFixed(6))); set("longitude", Number(pos.coords.longitude.toFixed(6))); setMsg("Localização preenchida."); },
      () => setErr("Não foi possível obter a localização"),
    );
  }

  async function save() {
    setErr(null); setMsg(null); setBusy(true);
    try {
      const r = await fetch("/api/pharmacy/settings", {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chainName: f.chainName, addressLine: f.addressLine, city: f.city, state: f.state,
          latitude: f.latitude, longitude: f.longitude, referralEnabled: f.referralEnabled, referralPoints: f.referralPoints,
        }),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok || !j.ok) { setErr(j.error ?? "Erro ao salvar"); return; }
      setMsg("Configurações salvas.");
    } finally { setBusy(false); }
  }

  const disabled = !canEdit || busy;

  return (
    <div className="space-y-6">
      {!canEdit && <p className="rounded-lg bg-amber-50 border border-amber-200 px-3 py-2 text-[12.5px] text-amber-800">Apenas o proprietário pode editar estas configurações.</p>}
      {err && <p className="rounded-lg bg-rose-50 border border-rose-200 px-3 py-2 text-[12.5px] text-rose-700">{err}</p>}
      {msg && <p className="rounded-lg bg-emerald-50 border border-emerald-200 px-3 py-2 text-[12.5px] text-emerald-700">{msg}</p>}

      <Card className="p-6">
        <h2 className="text-[15px] font-semibold text-slate-800 flex items-center gap-2"><Icon.Home size={16} /> Localização & rede</h2>
        <p className="mt-1 text-[12.5px] text-slate-500">Usado no comparador de farmácias próximas do paciente.</p>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <Field label="Rede / bandeira"><Input value={f.chainName ?? ""} disabled={disabled} onChange={(e) => set("chainName", e.target.value)} placeholder="Ex.: Drogasil" /></Field>
          <Field label="Endereço"><Input value={f.addressLine ?? ""} disabled={disabled} onChange={(e) => set("addressLine", e.target.value)} placeholder="Rua, número" /></Field>
          <Field label="Cidade"><Input value={f.city ?? ""} disabled={disabled} onChange={(e) => set("city", e.target.value)} /></Field>
          <Field label="UF"><Input value={f.state ?? ""} disabled={disabled} maxLength={2} onChange={(e) => set("state", e.target.value.toUpperCase())} placeholder="SP" /></Field>
          <Field label="Latitude"><Input value={f.latitude ?? ""} disabled={disabled} onChange={(e) => set("latitude", e.target.value === "" ? null : Number(e.target.value))} inputMode="decimal" /></Field>
          <Field label="Longitude"><Input value={f.longitude ?? ""} disabled={disabled} onChange={(e) => set("longitude", e.target.value === "" ? null : Number(e.target.value))} inputMode="decimal" /></Field>
        </div>
        {canEdit && <Button size="sm" variant="secondary" className="mt-3" icon={<Icon.Activity size={14} />} onClick={useMyLocation}>Usar minha localização</Button>}
      </Card>

      <Card className="p-6">
        <h2 className="text-[15px] font-semibold text-slate-800 flex items-center gap-2"><Icon.Heart size={16} /> Programa de indicação</h2>
        <p className="mt-1 text-[12.5px] text-slate-500">Pontos que o paciente ganha quando indica um amigo que se cadastra.</p>
        <div className="mt-4 flex flex-wrap items-end gap-4">
          <label className="flex items-center gap-2 text-[13px] text-slate-700">
            <input type="checkbox" checked={f.referralEnabled} disabled={disabled} onChange={(e) => set("referralEnabled", e.target.checked)} />
            Indicação ativada
          </label>
          <Field label="Pontos por indicação"><Input type="number" min={0} value={f.referralPoints} disabled={disabled} onChange={(e) => set("referralPoints", Number(e.target.value))} className="w-40" /></Field>
        </div>
      </Card>

      {canEdit && <Button onClick={save} disabled={busy}>{busy ? "Salvando…" : "Salvar configurações"}</Button>}
    </div>
  );
}
