import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/session";
import { UnauthorizedError } from "@/lib/auth/permissions";
import { prisma } from "@/lib/db";
import { signedDownloadUrl } from "@/lib/storage";

export const dynamic = "force-dynamic";

/**
 * GET /api/rx/[id]/download — opens a prescription.
 *
 * If a real file was uploaded to storage, redirect to a short-lived signed URL.
 * Otherwise (prescriptions pushed by a partner, or demo/seed data with no file
 * attached) render a clean receita document from the record's own data so the
 * "Abrir receita" action always opens something instead of erroring.
 */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const ctx = await requireSession();
    const { id } = await params;
    const rx = await prisma.digitalPrescription.findFirst({
      where: { id, pharmacyId: ctx.pharmacyId },
      select: {
        fileKey: true, fileName: true, signature: true, status: true, signerName: true,
        crm: true, notes: true, source: true, issuedAt: true, createdAt: true,
        patient: {
          select: {
            name: true, phone: true, cpf: true,
            prescriptions: {
              where: { status: "ACTIVE" },
              select: { doseAmount: true, medication: { select: { brandName: true, dosage: true } } },
              take: 12,
            },
          },
        },
      },
    });
    if (!rx) return NextResponse.json({ ok: false, error: "Receita não encontrada" }, { status: 404 });

    // A real uploaded file → redirect to its signed URL. Synthetic keys (partner
    // pushes / seed) never have a stored object, so skip straight to the doc.
    const synthetic = rx.fileKey.startsWith("external/") || rx.fileKey.startsWith("rx/seed/");
    if (!synthetic) {
      const url = await signedDownloadUrl(rx.fileKey, 120);
      if (url) return NextResponse.redirect(url);
    }

    return new NextResponse(renderReceita(rx), {
      status: 200,
      headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" },
    });
  } catch (err) {
    if (err instanceof UnauthorizedError) return NextResponse.json({ ok: false, error: err.message }, { status: 401 });
    console.error("[api/rx/:id/download]", err);
    return NextResponse.json({ ok: false, error: "Erro" }, { status: 500 });
  }
}

type RxDoc = {
  fileName: string; signature: string; status: string; signerName: string | null;
  crm: string | null; notes: string | null; source: string | null;
  issuedAt: Date | null; createdAt: Date;
  patient: {
    name: string; phone: string; cpf: string | null;
    prescriptions: { doseAmount: string; medication: { brandName: string; dosage: string } }[];
  };
};

const esc = (s: unknown) =>
  String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));

const SIG_LABEL: Record<string, string> = {
  VERIFIED_ICP: "Assinatura ICP-Brasil verificada",
  SIGNED_DETECTED: "Assinatura digital detectada",
  UNSIGNED: "Sem assinatura digital",
  INVALID: "Assinatura inválida",
};
const STATUS_LABEL: Record<string, string> = {
  SUBMITTED: "Enviada", LEAD: "Disponível para dispensação", DISPENSED: "Dispensada", EXPIRED: "Expirada", REJECTED: "Rejeitada",
};

function renderReceita(rx: RxDoc): string {
  const date = (rx.issuedAt ?? rx.createdAt).toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" });
  const cpf = rx.patient.cpf && rx.patient.cpf.length >= 4 ? `•••.•••.•${rx.patient.cpf.slice(-4, -2)}-${rx.patient.cpf.slice(-2)}` : "—";
  const items = rx.notes
    ? esc(rx.notes).replace(/\n/g, "<br>")
    : rx.patient.prescriptions.length
      ? rx.patient.prescriptions
          .map((p) => `<div class="item"><b>${esc(p.medication.brandName)} ${esc(p.medication.dosage)}</b><span>${esc(p.doseAmount)}</span></div>`)
          .join("")
      : '<p class="muted">Itens não detalhados neste documento.</p>';
  const origem = rx.source === "atendebem" ? "AtendeBem (clínica)" : rx.source === "patient" ? "Enviada pelo paciente" : "Farma";

  return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Receita — ${esc(rx.patient.name)}</title>
<style>
  :root{--tint:#0ABF77}
  *{box-sizing:border-box} body{margin:0;background:#F2F2F7;color:#1c1c1e;font:15px/1.5 -apple-system,BlinkMacSystemFont,"Segoe UI",system-ui,sans-serif;padding:24px}
  .sheet{max-width:640px;margin:0 auto;background:#fff;border:1px solid #e5e7eb;border-radius:16px;overflow:hidden;box-shadow:0 1px 3px rgba(15,23,42,.08)}
  .head{background:linear-gradient(135deg,#0ABF77,#089E63);color:#fff;padding:22px 26px;display:flex;align-items:center;gap:12px}
  .head .logo{width:34px;height:34px;border-radius:9px;background:rgba(255,255,255,.2);display:flex;align-items:center;justify-content:center;font-weight:800}
  .head h1{font-size:17px;margin:0;font-weight:700} .head p{margin:2px 0 0;font-size:12px;opacity:.85}
  .body{padding:24px 26px}
  .row{display:flex;justify-content:space-between;gap:16px;padding:9px 0;border-bottom:1px solid #f1f5f9;font-size:13.5px}
  .row span{color:#64748b} .row b{font-weight:600;text-align:right}
  .sec{margin-top:20px} .sec h2{font-size:11px;text-transform:uppercase;letter-spacing:.08em;color:#94a3b8;margin:0 0 8px}
  .item{display:flex;justify-content:space-between;gap:12px;padding:10px 12px;background:#f8fafc;border:1px solid #f1f5f9;border-radius:10px;margin-bottom:6px;font-size:13.5px}
  .item span{color:#64748b}
  .badge{display:inline-block;font-size:11px;font-weight:600;padding:3px 10px;border-radius:999px;background:#E6F9F1;color:#077C4F}
  .muted{color:#94a3b8;font-size:13px}
  .note{margin-top:20px;padding:12px 14px;background:#FFF7ED;border:1px solid #FED7AA;border-radius:10px;color:#9a3412;font-size:12.5px}
  .foot{padding:16px 26px;border-top:1px solid #f1f5f9;font-size:11px;color:#94a3b8;text-align:center}
  @media print{body{background:#fff;padding:0}.sheet{border:none;box-shadow:none}}
</style></head><body>
  <div class="sheet">
    <div class="head"><div class="logo">P</div><div><h1>Farma · Receita digital</h1><p>${esc(origem)} · ${esc(date)}</p></div></div>
    <div class="body">
      <div class="row"><span>Paciente</span><b>${esc(rx.patient.name)}</b></div>
      <div class="row"><span>Telefone</span><b>${esc(rx.patient.phone)}</b></div>
      <div class="row"><span>CPF</span><b>${esc(cpf)}</b></div>
      <div class="row"><span>Prescritor</span><b>${esc(rx.signerName ?? "—")}${rx.crm ? " · " + esc(rx.crm) : ""}</b></div>
      <div class="row"><span>Situação</span><b>${esc(STATUS_LABEL[rx.status] ?? rx.status)}</b></div>
      <div class="row"><span>Assinatura</span><b><span class="badge">${esc(SIG_LABEL[rx.signature] ?? rx.signature)}</span></b></div>
      <div class="sec"><h2>Itens prescritos</h2>${items}</div>
      <div class="note">Documento gerado pela Farma a partir dos dados da receita. O arquivo original (foto/PDF) não está anexado a este registro.</div>
    </div>
    <div class="foot">Farma · adesão e farmacovigilância · documento sem valor de dispensação isolada</div>
  </div>
</body></html>`;
}
