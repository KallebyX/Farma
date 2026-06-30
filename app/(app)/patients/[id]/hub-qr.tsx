"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { Card, Button, Icon } from "@/components/ui";

/**
 * "App do paciente" QR (Claude Design) — a real, scannable QR of the patient's
 * Meu Prontuário hub magic-link. The pharmacist shows it for the patient to scan
 * and open their adherence hub / patient app. Token is signed server-side.
 */
export function PatientHubQr({ patientId, phone }: { patientId: string; phone?: string | null }) {
  const [url, setUrl] = useState<string | null>(null);
  const [svg, setSvg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await fetch(`/api/patients/${patientId}/hub-link`);
        const j = await res.json().catch(() => ({}));
        if (!res.ok || !j.url) { if (alive) setErr("Não foi possível gerar o link."); return; }
        const markup = await QRCode.toString(j.url, {
          type: "svg",
          margin: 1,
          color: { dark: "#0b0f0d", light: "#00000000" },
        });
        if (alive) { setUrl(j.url); setSvg(markup); }
      } catch {
        if (alive) setErr("Não foi possível gerar o link.");
      }
    })();
    return () => { alive = false; };
  }, [patientId]);

  function copy() {
    if (!url) return;
    navigator.clipboard?.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  const waHref = url && phone ? `https://wa.me/${phone.replace(/\D/g, "")}?text=${encodeURIComponent("Acesse seu Meu Prontuário: " + url)}` : null;

  return (
    <Card className="p-5">
      <h2 className="text-[14px] font-semibold text-slate-800 flex items-center gap-2">
        <Icon.Pill size={16} className="text-brand-600" /> App do paciente
      </h2>
      <p className="mt-0.5 text-[12px] text-slate-500">Mostre o QR para o paciente abrir o Meu Prontuário.</p>

      <div className="mt-4 flex items-center gap-4">
        <div className="h-[116px] w-[116px] shrink-0 rounded-xl bg-white border border-slate-200 p-2 flex items-center justify-center">
          {svg ? (
            <span className="block h-full w-full [&>svg]:h-full [&>svg]:w-full" dangerouslySetInnerHTML={{ __html: svg }} />
          ) : (
            <div className="h-full w-full animate-pulse rounded-md bg-slate-100" aria-hidden />
          )}
        </div>
        <div className="min-w-0 flex-1 flex flex-col gap-2">
          {err ? (
            <p className="text-[12.5px] text-rose-600">{err}</p>
          ) : (
            <>
              <Button size="sm" variant="secondary" icon={<Icon.Copy size={14} />} onClick={copy} disabled={!url}>
                {copied ? "Link copiado!" : "Copiar link"}
              </Button>
              {waHref && (
                <a href={waHref} target="_blank" rel="noreferrer">
                  <Button size="sm" variant="ghost" icon={<Icon.WhatsApp size={14} />} className="w-full justify-start">Enviar no WhatsApp</Button>
                </a>
              )}
              <p className="text-[11px] text-slate-400">Link mágico · validade 90 dias · sem senha.</p>
            </>
          )}
        </div>
      </div>
    </Card>
  );
}
