"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button, Modal, Field, Input, Icon } from "@/components/ui";

/**
 * Simplified "Cadastrar paciente" modal (Claude Design AddPatient) — captures
 * just the essentials (nome, telefone, CPF opcional, consentimento LGPD) for a
 * fast counter flow. The full record (alergias, comorbidades, posologia…) lives
 * on /patients/new for when more detail is needed.
 */
export function QuickAddPatient() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [cpf, setCpf] = useState("");
  const [consent, setConsent] = useState(false);

  function reset() {
    setName(""); setPhone(""); setCpf(""); setConsent(false); setErr(null);
  }

  async function submit() {
    setErr(null);
    if (name.trim().length < 2) return setErr("Informe o nome completo.");
    const e164 = normalizePhone(phone);
    if (!/^\+\d{10,15}$/.test(e164)) return setErr("Telefone inválido — use DDD + número.");
    if (!consent) return setErr("O consentimento LGPD do paciente é obrigatório.");
    setBusy(true);
    try {
      const res = await fetch("/api/patients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          phone: e164,
          cpf: cpf.replace(/\D/g, "") || undefined,
          consentGiven: true,
          allergies: [],
          comorbidities: [],
        }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok || j.ok === false) { setErr(j.error ?? "Não foi possível cadastrar."); return; }
      setOpen(false);
      reset();
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <Button icon={<Icon.Plus size={15} />} onClick={() => setOpen(true)}>Cadastrar paciente</Button>

      <Modal
        open={open}
        onClose={() => !busy && setOpen(false)}
        title="Cadastrar paciente"
        subtitle="Rápido, só o essencial. Você completa o prontuário depois."
        footer={
          <div className="flex items-center justify-between gap-3">
            <Link href="/patients/new" className="text-[12.5px] text-brand-700 hover:underline">Cadastro completo →</Link>
            <div className="flex gap-2">
              <Button variant="ghost" onClick={() => !busy && setOpen(false)}>Cancelar</Button>
              <Button onClick={submit} disabled={busy}>{busy ? "Salvando…" : "Cadastrar"}</Button>
            </div>
          </div>
        }
      >
        <div className="flex flex-col gap-4">
          <Field label="Nome completo">
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Maria Fernanda Costa" autoFocus />
          </Field>
          <Field label="Telefone (WhatsApp)" hint="Usado para lembretes e confirmação de dose.">
            <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="(54) 99999-9999" inputMode="tel" />
          </Field>
          <Field label="CPF" hint="Opcional.">
            <Input value={cpf} onChange={(e) => setCpf(e.target.value)} placeholder="000.000.000-00" inputMode="numeric" />
          </Field>
          <label className="flex items-start gap-2.5 rounded-lg border border-slate-200 bg-slate-50/60 px-3.5 py-3 cursor-pointer">
            <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} className="mt-0.5 h-4 w-4 accent-brand-500" />
            <span className="text-[12.5px] text-slate-600">
              O paciente <b>consente</b> com o tratamento dos seus dados de saúde para adesão e farmacovigilância (LGPD).
            </span>
          </label>
          {err && <p className="text-[12.5px] text-rose-600">{err}</p>}
        </div>
      </Modal>
    </>
  );
}

/** Best-effort E.164 normalization for BR numbers. */
function normalizePhone(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  if (raw.trim().startsWith("+")) return "+" + digits;
  if (digits.length >= 12 && digits.startsWith("55")) return "+" + digits;
  if (digits.length === 10 || digits.length === 11) return "+55" + digits;
  return "+" + digits;
}
