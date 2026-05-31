"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

/**
 * Patient self-login. Step 1: phone → WhatsApp OTP. Step 2: code → hub.
 * No password; identity is the registered phone (same used for reminders).
 */
export default function EntrarPage() {
  const router = useRouter();
  const [step, setStep] = useState<"phone" | "code">("phone");
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  function normalize(v: string) {
    const d = v.replace(/[^\d+]/g, "");
    return d.startsWith("+") ? d : d ? `+${d}` : d;
  }

  async function requestCode() {
    setErr(null);
    setBusy(true);
    try {
      const res = await fetch("/api/patient-auth/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) { setErr(j.error ?? "Erro ao enviar código"); return; }
      setStep("code");
    } finally {
      setBusy(false);
    }
  }

  async function verify() {
    setErr(null);
    setBusy(true);
    try {
      const res = await fetch("/api/patient-auth/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, code }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok || !j.ok) { setErr(j.error ?? "Código incorreto"); return; }
      router.replace(j.url);
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center px-4" style={{ background: "linear-gradient(135deg,#064e3b,#047857)" }}>
      <div className="w-full max-w-sm bg-white rounded-2xl p-7 shadow-xl">
        <div className="text-center mb-6">
          <div className="text-3xl">💊</div>
          <h1 className="text-xl font-extrabold text-emerald-900 mt-2">Meu Prontuário</h1>
          <p className="text-sm text-slate-500 mt-1">
            {step === "phone" ? "Entre com seu WhatsApp para acessar sua saúde" : `Enviamos um código para ${phone}`}
          </p>
        </div>

        {err && <p className="mb-3 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 border border-red-100">{err}</p>}

        {step === "phone" ? (
          <>
            <label className="block text-sm font-medium text-slate-700">WhatsApp</label>
            <input
              value={phone}
              onChange={(e) => setPhone(normalize(e.target.value))}
              placeholder="+55 11 99999-9999"
              inputMode="tel"
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2.5 text-sm"
            />
            <button onClick={requestCode} disabled={busy || phone.length < 12}
              className="mt-4 w-full rounded-md bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50">
              {busy ? "Enviando..." : "Enviar código no WhatsApp"}
            </button>
          </>
        ) : (
          <>
            <label className="block text-sm font-medium text-slate-700">Código de 6 dígitos</label>
            <input
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
              placeholder="000000"
              inputMode="numeric"
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2.5 text-center text-lg tracking-[0.4em] font-mono"
            />
            <button onClick={verify} disabled={busy || code.length !== 6}
              className="mt-4 w-full rounded-md bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50">
              {busy ? "Verificando..." : "Entrar"}
            </button>
            <button onClick={() => { setStep("phone"); setCode(""); setErr(null); }}
              className="mt-2 w-full text-xs text-slate-500 hover:underline">
              ← usar outro número
            </button>
          </>
        )}
        <p className="mt-5 text-center text-xs text-slate-500">
          Ainda não tem conta? <a href="/cadastro" className="font-medium text-emerald-700 hover:underline">Criar agora</a>
        </p>
        <p className="mt-2 text-center text-[11px] text-slate-400">
          Seu número é o mesmo dos lembretes.
        </p>
      </div>
    </main>
  );
}
