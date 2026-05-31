"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

type Pharmacy = { id: string; name: string; cnpj: string | null };

/** Patient self-registration. Supports ?ref=CODE (joins the referrer's pharmacy). */
export default function CadastroPage() {
  const router = useRouter();
  const [step, setStep] = useState<"form" | "code">("form");
  const [ref, setRef] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Pharmacy[]>([]);
  const [pharmacy, setPharmacy] = useState<Pharmacy | null>(null);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    const r = new URLSearchParams(window.location.search).get("ref");
    if (r) setRef(r);
  }, []);

  function normalize(v: string) {
    const d = v.replace(/[^\d+]/g, "");
    return d.startsWith("+") ? d : d ? `+${d}` : d;
  }

  useEffect(() => {
    if (pharmacy || ref) return; // pharmacy chosen via referral or selection
    const t = setTimeout(async () => {
      const res = await fetch(`/api/pharmacies/search?q=${encodeURIComponent(query)}`);
      const j = await res.json().catch(() => ({}));
      if (j.ok) setResults(j.pharmacies as Pharmacy[]);
    }, 250);
    return () => clearTimeout(t);
  }, [query, pharmacy, ref]);

  async function register() {
    setErr(null);
    if (name.trim().length < 2) { setErr("Informe seu nome"); return; }
    if (phone.length < 12) { setErr("Telefone inválido"); return; }
    if (!ref && !pharmacy) { setErr("Escolha sua farmácia"); return; }
    setBusy(true);
    try {
      const res = await fetch("/api/patient-auth/register", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, phone, pharmacyId: pharmacy?.id, ref }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok || !j.ok) { setErr(j.error ?? "Erro ao cadastrar"); return; }
      setStep("code");
    } finally { setBusy(false); }
  }

  async function verify() {
    setErr(null);
    setBusy(true);
    try {
      const res = await fetch("/api/patient-auth/verify", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ phone, code }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok || !j.ok) { setErr(j.error ?? "Código incorreto"); return; }
      router.replace(j.url);
    } finally { setBusy(false); }
  }

  return (
    <main className="min-h-screen flex items-center justify-center px-4 py-8" style={{ background: "linear-gradient(135deg,#064e3b,#047857)" }}>
      <div className="w-full max-w-sm bg-white rounded-2xl p-7 shadow-xl">
        <div className="text-center mb-6">
          <div className="text-3xl">💊</div>
          <h1 className="text-xl font-extrabold text-emerald-900 mt-2">Criar minha conta</h1>
          <p className="text-sm text-slate-500 mt-1">
            {step === "form" ? "Acompanhe sua saúde e ganhe recompensas" : `Enviamos um código para ${phone}`}
          </p>
          {ref && step === "form" && (
            <p className="mt-2 inline-block rounded-full bg-emerald-50 px-3 py-1 text-[12px] font-medium text-emerald-700">🎁 Você foi indicado por um amigo!</p>
          )}
        </div>

        {err && <p className="mb-3 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 border border-red-100">{err}</p>}

        {step === "form" ? (
          <div className="space-y-3">
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Seu nome completo"
              className="w-full rounded-md border border-slate-300 px-3 py-2.5 text-sm" />
            <input value={phone} onChange={(e) => setPhone(normalize(e.target.value))} placeholder="+55 11 99999-9999" inputMode="tel"
              className="w-full rounded-md border border-slate-300 px-3 py-2.5 text-sm" />

            {!ref && (pharmacy ? (
              <div className="flex items-center justify-between rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2.5">
                <span className="text-sm font-medium text-emerald-900">{pharmacy.name}</span>
                <button onClick={() => { setPharmacy(null); setQuery(""); }} className="text-xs text-emerald-700 hover:underline">trocar</button>
              </div>
            ) : (
              <div>
                <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar sua farmácia"
                  className="w-full rounded-md border border-slate-300 px-3 py-2.5 text-sm" />
                {results.length > 0 && (
                  <div className="mt-1 max-h-40 overflow-y-auto rounded-md border border-slate-200 divide-y divide-slate-100">
                    {results.map((p) => (
                      <button key={p.id} onClick={() => setPharmacy(p)} className="block w-full text-left px-3 py-2 text-sm hover:bg-slate-50">
                        <span className="font-medium text-slate-800">{p.name}</span>
                        {p.cnpj && <span className="block text-[11px] text-slate-400">{p.cnpj}</span>}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}

            <button onClick={register} disabled={busy}
              className="w-full rounded-md bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50">
              {busy ? "Enviando..." : "Criar conta e receber código"}
            </button>
            <p className="text-center text-[11px] text-slate-400">Ao continuar você concorda em receber mensagens da sua farmácia (LGPD).</p>
            <p className="text-center text-xs text-slate-500">Já tem conta? <Link href="/entrar" className="font-medium text-emerald-700 hover:underline">Entrar</Link></p>
          </div>
        ) : (
          <div className="space-y-3">
            <input value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))} placeholder="000000" inputMode="numeric"
              className="w-full rounded-md border border-slate-300 px-3 py-2.5 text-center text-lg tracking-[0.4em] font-mono" />
            <button onClick={verify} disabled={busy || code.length !== 6}
              className="w-full rounded-md bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50">
              {busy ? "Verificando..." : "Confirmar e entrar"}
            </button>
            <button onClick={() => { setStep("form"); setCode(""); setErr(null); }} className="w-full text-xs text-slate-500 hover:underline">← voltar</button>
          </div>
        )}
      </div>
    </main>
  );
}
