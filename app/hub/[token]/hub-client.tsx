"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

type Account = { points: number; lifetime: number; tier: string; streakDays: number };
type Mission = { code: string; title: string; description: string; points: number; icon: string | null; completed: boolean };
type Reward = { code: string; title: string; description: string; costPoints: number };
type Offer = { slug: string; name: string; color: string | null; logo: string | null; pointsPerReal: number; code: string | null };
type Recent = { delta: number; reason: string; at: string };

const TIER_META: Record<string, { label: string; color: string; next?: number }> = {
  BRONZE: { label: "Bronze", color: "#cd7f32", next: 500 },
  SILVER: { label: "Prata", color: "#9ca3af", next: 2000 },
  GOLD: { label: "Ouro", color: "#f59e0b", next: 5000 },
  PLATINUM: { label: "Platina", color: "#22d3ee" },
};
const REASON_LABEL: Record<string, string> = {
  mission: "Missão concluída",
  affiliate_conversion: "Compra com pontos",
  redemption: "Resgate",
  adherence: "Adesão ao tratamento",
};

type WProvider = { slug: string; name: string; logo: string; kind: string; available: boolean };
type WConnection = { provider: string; status: string; lastSyncAt: string | null };
type WLatest = { metric: string; value: number; unit: string; source: string | null };
type Wearables = { providers: WProvider[]; connections: WConnection[]; latest: WLatest[] };

const METRIC_LABEL: Record<string, string> = {
  HEART_RATE: "❤️ FC", RESTING_HR: "❤️ FC repouso", STEPS: "👟 Passos", SLEEP_MINUTES: "😴 Sono (min)",
  SPO2: "🫁 SpO₂", HRV: "📊 HRV", CALORIES: "🔥 Calorias", WEIGHT: "⚖️ Peso", GLUCOSE: "🩸 Glicemia",
  BLOOD_PRESSURE_SYS: "🩸 PA sist.", BLOOD_PRESSURE_DIA: "🩸 PA diast.", TEMPERATURE: "🌡️ Temp.",
};

export function HubClient(props: {
  token: string;
  patientName: string;
  account: Account;
  missions: Mission[];
  rewards: Reward[];
  offers: Offer[];
  recent: Recent[];
  wearables: Wearables;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [toast, setToast] = useState<string | null>(null);
  const [voucher, setVoucher] = useState<string | null>(null);
  const [ingest, setIngest] = useState<{ provider: string; token: string; url: string } | null>(null);

  function doConnect(slug: string) {
    startTransition(async () => {
      const res = await fetch("/api/wearables/connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: props.token, provider: slug }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok || !j.ok) { flash(j.error ?? "Não foi possível conectar"); return; }
      if (j.mode === "oauth" && j.authUrl) {
        window.location.href = j.authUrl;
      } else if (j.mode === "ingest") {
        setIngest({ provider: slug, token: j.ingestToken, url: j.ingestUrl });
      }
    });
  }

  const tier = TIER_META[props.account.tier] ?? TIER_META.BRONZE;
  const progress = tier.next ? Math.min(100, (props.account.lifetime / tier.next) * 100) : 100;
  const firstName = props.patientName.split(" ")[0];

  function flash(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 3500);
  }

  function doMission(code: string) {
    startTransition(async () => {
      const res = await fetch("/api/loyalty/mission", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: props.token, code }),
      });
      const j = await res.json().catch(() => ({}));
      if (res.ok && j.ok) { flash(`+${j.points} pontos! 🎉`); router.refresh(); }
      else flash(j.error ?? "Não foi possível concluir");
    });
  }

  function doRedeem(code: string, cost: number) {
    if (cost > props.account.points) { flash("Pontos insuficientes"); return; }
    startTransition(async () => {
      const res = await fetch("/api/loyalty/redeem", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: props.token, code }),
      });
      const j = await res.json().catch(() => ({}));
      if (res.ok && j.ok) { setVoucher(j.voucher); router.refresh(); }
      else flash(j.error ?? "Não foi possível resgatar");
    });
  }

  return (
    <main className="min-h-screen bg-[#06140f] text-white" style={{ fontFamily: "'Inter','Segoe UI',sans-serif" }}>
      {/* Hero */}
      <div className="relative overflow-hidden" style={{ background: "linear-gradient(135deg,#064e3b 0%,#047857 55%,#10b981 100%)" }}>
        <div className="absolute -top-16 -right-10 w-56 h-56 rounded-full" style={{ background: "radial-gradient(circle,#ffffff33,transparent 70%)" }} />
        <div className="relative px-5 pt-10 pb-8 max-w-md mx-auto">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-emerald-100/80 text-xs font-semibold tracking-widest uppercase">Meu Prontuário · Recompensas</p>
              <h1 className="text-2xl font-extrabold mt-1">Olá, {firstName} 👋</h1>
            </div>
            <span className="text-[11px] font-bold px-3 py-1 rounded-full" style={{ background: tier.color + "33", color: "#fff", border: `1px solid ${tier.color}` }}>
              {tier.label}
            </span>
          </div>

          <div className="mt-6 rounded-2xl bg-white/10 backdrop-blur p-5 border border-white/15">
            <div className="flex items-end justify-between">
              <div>
                <div className="text-emerald-100/70 text-xs font-semibold">SEUS PONTOS</div>
                <div className="text-4xl font-black leading-none mt-1">{props.account.points.toLocaleString("pt-BR")}</div>
              </div>
              <div className="text-right text-xs text-emerald-100/80">
                <div>🔥 {props.account.streakDays} dias seguidos</div>
                <div className="mt-1">Total: {props.account.lifetime.toLocaleString("pt-BR")}</div>
              </div>
            </div>
            {tier.next && (
              <div className="mt-4">
                <div className="h-2 rounded-full bg-white/20 overflow-hidden">
                  <div className="h-full rounded-full bg-white" style={{ width: `${progress}%` }} />
                </div>
                <div className="text-[11px] text-emerald-100/70 mt-1">
                  Faltam {Math.max(0, tier.next - props.account.lifetime).toLocaleString("pt-BR")} pts para o próximo nível
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-md mx-auto px-5 pb-24 -mt-2">
        {/* Missions */}
        <Section title="🎯 Missões" subtitle="Ganhe pontos cuidando da sua saúde">
          <div className="space-y-2.5">
            {props.missions.map((m) => (
              <div key={m.code} className="flex items-center gap-3 rounded-xl bg-white/5 border border-white/10 p-3.5">
                <div className="text-2xl">{m.icon ?? "⭐"}</div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-sm">{m.title}</div>
                  <div className="text-emerald-100/60 text-xs">{m.description}</div>
                </div>
                {m.completed ? (
                  <span className="text-emerald-300 text-xs font-bold">✓ +{m.points}</span>
                ) : (
                  <button onClick={() => doMission(m.code)} disabled={pending}
                    className="shrink-0 text-xs font-bold rounded-lg px-3 py-2 bg-emerald-400 text-emerald-950 disabled:opacity-60">
                    +{m.points}
                  </button>
                )}
              </div>
            ))}
          </div>
        </Section>

        {/* Affiliate offers */}
        <Section title="🛒 Comprar e pontuar" subtitle="Compre nas farmácias parceiras e acumule pontos">
          <div className="grid grid-cols-2 gap-2.5">
            {props.offers.map((o) => (
              <a key={o.slug} href={o.code ? `/go/${o.code}` : "#"} target="_blank" rel="noreferrer noopener"
                className="rounded-xl bg-white/5 border border-white/10 p-3.5 hover:bg-white/10 transition block">
                <div className="text-2xl mb-1">{o.logo ?? "💊"}</div>
                <div className="font-semibold text-sm truncate">{o.name}</div>
                <div className="text-emerald-300 text-[11px] font-semibold mt-0.5">{o.pointsPerReal}× pts por R$</div>
                <div className="mt-2 text-[11px] font-bold text-emerald-950 bg-emerald-400 rounded-md py-1.5 text-center">Comprar →</div>
              </a>
            ))}
          </div>
        </Section>

        {/* Wearables / Saúde Conectada */}
        <Section title="⌚ Saúde Conectada" subtitle="Conecte seu relógio e acompanhe seus dados de saúde">
          {props.wearables.latest.length > 0 && (
            <div className="grid grid-cols-3 gap-2.5 mb-3">
              {props.wearables.latest.slice(0, 6).map((m) => (
                <div key={m.metric} className="rounded-xl bg-white/5 border border-white/10 p-3">
                  <div className="text-[10px] text-emerald-100/60 font-semibold">{METRIC_LABEL[m.metric] ?? m.metric}</div>
                  <div className="text-lg font-extrabold mt-0.5">{m.value}<span className="text-[10px] text-emerald-100/50 ml-1">{m.unit}</span></div>
                  {m.source && <div className="text-[9px] text-emerald-100/40 truncate">{m.source}</div>}
                </div>
              ))}
            </div>
          )}
          <div className="grid grid-cols-2 gap-2.5">
            {props.wearables.providers.map((p) => {
              const conn = props.wearables.connections.find((c) => c.provider === p.slug);
              const connected = conn?.status === "CONNECTED";
              return (
                <button key={p.slug} onClick={() => doConnect(p.slug)} disabled={pending || !p.available}
                  className={`rounded-xl border p-3 text-left transition ${connected ? "bg-emerald-400/10 border-emerald-400/40" : "bg-white/5 border-white/10 hover:bg-white/10"} ${!p.available ? "opacity-40" : ""}`}>
                  <div className="flex items-center gap-2">
                    <span className="text-xl">{p.logo}</span>
                    <span className="text-[12px] font-semibold leading-tight">{p.name}</span>
                  </div>
                  <div className={`mt-1.5 text-[10px] font-bold ${connected ? "text-emerald-300" : "text-emerald-100/60"}`}>
                    {connected ? "✓ conectado" : conn ? "pendente · toque p/ token" : p.available ? "+ conectar" : "indisponível"}
                  </div>
                </button>
              );
            })}
          </div>
          <p className="text-[10px] text-emerald-100/40 mt-2">
            Apple Watch e Galaxy Watch conectam via app/atalho enviando dados ao endpoint seguro. Garmin/Fitbit/Oura via login do provedor.
          </p>
        </Section>

        {/* Exams */}
        <ExamsHubSection token={props.token} onFlash={flash} />

        {/* Appointments */}
        <MyAppointmentsHubSection token={props.token} />

        {/* Digital prescription upload */}
        <RxUploadHubSection token={props.token} onFlash={flash} />

        {/* Nota premiada (NF-e QR → pontos) */}
        <ReceiptScanHubSection token={props.token} onFlash={flash} />

        {/* Report an adverse reaction */}
        <RamReportHubSection token={props.token} onFlash={flash} />

        {/* Messages with the pharmacy */}
        <MessagesHubSection token={props.token} onFlash={flash} />

        {/* Profile */}
        <ProfileHubSection token={props.token} onFlash={flash} />

        {/* Referral */}
        <ReferralHubSection token={props.token} onFlash={flash} />

        {/* Rewards */}
        <Section title="🎁 Resgatar recompensas" subtitle={`Você tem ${props.account.points.toLocaleString("pt-BR")} pontos`}>
          <div className="space-y-2.5">
            {props.rewards.map((r) => {
              const can = props.account.points >= r.costPoints;
              return (
                <div key={r.code} className="flex items-center gap-3 rounded-xl bg-white/5 border border-white/10 p-3.5">
                  <div className="text-2xl">🎟️</div>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-sm">{r.title}</div>
                    <div className="text-emerald-100/60 text-xs">{r.description}</div>
                  </div>
                  <button onClick={() => doRedeem(r.code, r.costPoints)} disabled={pending || !can}
                    className={`shrink-0 text-xs font-bold rounded-lg px-3 py-2 ${can ? "bg-white text-emerald-950" : "bg-white/10 text-white/40"}`}>
                    {r.costPoints} pts
                  </button>
                </div>
              );
            })}
          </div>
        </Section>

        {/* Activity */}
        {props.recent.length > 0 && (
          <Section title="📜 Atividade recente">
            <div className="space-y-1.5">
              {props.recent.map((e, i) => (
                <div key={i} className="flex items-center justify-between text-xs rounded-lg bg-white/5 px-3 py-2">
                  <span className="text-emerald-100/80">{REASON_LABEL[e.reason] ?? e.reason}</span>
                  <span className={e.delta >= 0 ? "text-emerald-300 font-bold" : "text-rose-300 font-bold"}>
                    {e.delta >= 0 ? "+" : ""}{e.delta}
                  </span>
                </div>
              ))}
            </div>
          </Section>
        )}

        <p className="text-center text-[10px] text-emerald-100/40 mt-8">
          Programa de recompensas Meu Prontuário · pontos sem valor monetário
        </p>
      </div>

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-5 left-1/2 -translate-x-1/2 bg-white text-emerald-950 font-semibold text-sm px-5 py-3 rounded-full shadow-lg z-50">
          {toast}
        </div>
      )}

      {/* Voucher modal */}
      {voucher && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center px-6" onClick={() => setVoucher(null)}>
          <div className="bg-white text-emerald-950 rounded-2xl p-6 max-w-xs w-full text-center" onClick={(e) => e.stopPropagation()}>
            <div className="text-4xl mb-2">🎉</div>
            <h3 className="font-extrabold text-lg">Recompensa resgatada!</h3>
            <p className="text-sm text-slate-500 mt-1">Apresente o código na farmácia:</p>
            <div className="mt-3 font-mono font-bold text-lg tracking-wider bg-emerald-50 border border-emerald-200 rounded-lg py-3">{voucher}</div>
            <button onClick={() => setVoucher(null)} className="mt-4 w-full bg-emerald-600 text-white font-semibold rounded-lg py-2.5">Fechar</button>
          </div>
        </div>
      )}

      {/* Ingest token modal (Apple/Samsung/SDK) */}
      {ingest && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center px-6" onClick={() => setIngest(null)}>
          <div className="bg-white text-emerald-950 rounded-2xl p-6 max-w-sm w-full" onClick={(e) => e.stopPropagation()}>
            <div className="text-center"><div className="text-4xl mb-2">⌚</div>
              <h3 className="font-extrabold text-lg">Conectar dispositivo</h3>
              <p className="text-sm text-slate-500 mt-1">Envie os dados de saúde para este endpoint seguro (app companheiro ou Atalho do iPhone):</p>
            </div>
            <div className="mt-3 text-left">
              <div className="text-[11px] font-semibold text-slate-500">Endpoint</div>
              <div className="font-mono text-[11px] break-all bg-slate-50 border border-slate-200 rounded-lg p-2">{ingest.url}</div>
              <div className="text-[11px] font-semibold text-slate-500 mt-2">Token (Authorization: Bearer)</div>
              <div className="font-mono text-[11px] break-all bg-emerald-50 border border-emerald-200 rounded-lg p-2">{ingest.token}</div>
            </div>
            <button onClick={() => setIngest(null)} className="mt-4 w-full bg-emerald-600 text-white font-semibold rounded-lg py-2.5">Entendi</button>
          </div>
        </div>
      )}
    </main>
  );
}

type HubExam = { id: string; title: string; category: string | null; sizeBytes: number; createdAt: string; uploadedBy: string | null };

function ExamsHubSection({ token, onFlash }: { token: string; onFlash: (m: string) => void }) {
  const [exams, setExams] = useState<HubExam[]>([]);
  const [title, setTitle] = useState("");
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const authHeader = { Authorization: `Bearer ${token}` };

  async function load() {
    const r = await fetch("/api/patient/exams", { headers: authHeader });
    const j = await r.json().catch(() => ({}));
    if (j.ok) setExams(j.exams as HubExam[]);
  }
  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function upload() {
    const file = fileRef.current?.files?.[0];
    if (!file) { onFlash("Selecione um arquivo"); return; }
    if (title.trim().length < 2) { onFlash("Dê um nome ao exame"); return; }
    setBusy(true);
    try {
      const fd = new FormData();
      fd.set("file", file);
      fd.set("title", title);
      const r = await fetch("/api/patient/exams", { method: "POST", headers: authHeader, body: fd });
      const j = await r.json().catch(() => ({}));
      if (!r.ok || !j.ok) { onFlash(j.error ?? "Falha no upload"); return; }
      setTitle("");
      if (fileRef.current) fileRef.current.value = "";
      onFlash("Exame enviado! 📄");
      load();
    } finally {
      setBusy(false);
    }
  }

  return (
    <Section title="📄 Meus exames" subtitle="Envie e guarde seus exames; a farmácia também pode ver">
      <div className="rounded-xl bg-white/5 border border-white/10 p-3.5">
        <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Nome do exame (ex.: Hemograma)"
          className="w-full rounded-lg bg-white/10 border border-white/15 px-3 py-2 text-sm placeholder:text-emerald-100/40 outline-none" />
        <input ref={fileRef} type="file" accept="application/pdf,image/*"
          className="mt-2 w-full text-[12px] text-emerald-100/70 file:mr-2 file:rounded-md file:border-0 file:bg-emerald-400 file:px-3 file:py-1.5 file:text-[12px] file:font-bold file:text-emerald-950" />
        <button onClick={upload} disabled={busy}
          className="mt-2 w-full rounded-lg bg-emerald-400 text-emerald-950 font-bold text-sm py-2 disabled:opacity-60">
          {busy ? "Enviando…" : "+ Enviar exame"}
        </button>
      </div>
      {exams.length > 0 && (
        <div className="mt-2.5 space-y-1.5">
          {exams.map((e) => (
            <a key={e.id} href={`/api/patient/exams/${e.id}/download?t=${encodeURIComponent(token)}`} target="_blank" rel="noreferrer"
              className="flex items-center justify-between rounded-lg bg-white/5 border border-white/10 px-3 py-2 hover:bg-white/10">
              <span className="text-sm truncate">{e.title}</span>
              <span className="text-[11px] text-emerald-100/50 shrink-0 ml-2">abrir →</span>
            </a>
          ))}
        </div>
      )}
    </Section>
  );
}

type HubMsg = { id: string; direction: "FROM_PATIENT" | "FROM_PHARMACY"; body: string; authorName: string | null; createdAt: string };

function MessagesHubSection({ token, onFlash }: { token: string; onFlash: (m: string) => void }) {
  const [msgs, setMsgs] = useState<HubMsg[]>([]);
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const authHeader = { Authorization: `Bearer ${token}` };

  async function load() {
    const r = await fetch("/api/patient/messages", { headers: authHeader });
    const j = await r.json().catch(() => ({}));
    if (j.ok) setMsgs(j.messages as HubMsg[]);
  }
  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function send() {
    const text = body.trim();
    if (!text) return;
    setBusy(true);
    try {
      const r = await fetch("/api/patient/messages", {
        method: "POST", headers: { ...authHeader, "Content-Type": "application/json" }, body: JSON.stringify({ body: text }),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok || !j.ok) { onFlash(j.error ?? "Não foi possível enviar"); return; }
      setMsgs((m) => [...m, j.message]);
      setBody("");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Section title="💬 Falar com a farmácia" subtitle="Tire dúvidas direto com sua farmácia">
      {msgs.length > 0 && (
        <div className="space-y-1.5 mb-2.5 max-h-64 overflow-y-auto">
          {msgs.map((m) => {
            const mine = m.direction === "FROM_PATIENT";
            return (
              <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[82%] rounded-2xl px-3 py-2 text-[13px] ${mine ? "bg-emerald-400 text-emerald-950 rounded-br-sm" : "bg-white/10 text-white rounded-bl-sm"}`}>
                  <p className="whitespace-pre-wrap break-words">{m.body}</p>
                  <p className={`mt-0.5 text-[9px] ${mine ? "text-emerald-900/60" : "text-emerald-100/40"}`}>
                    {mine ? "Você" : m.authorName ?? "Farmácia"}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}
      <div className="flex items-end gap-2">
        <textarea value={body} onChange={(e) => setBody(e.target.value)} rows={1} placeholder="Escreva sua mensagem…"
          className="flex-1 resize-none rounded-lg bg-white/10 border border-white/15 px-3 py-2 text-sm placeholder:text-emerald-100/40 outline-none" />
        <button onClick={send} disabled={busy || body.trim().length === 0}
          className="shrink-0 rounded-lg bg-emerald-400 text-emerald-950 font-bold text-sm px-4 py-2 disabled:opacity-50">→</button>
      </div>
    </Section>
  );
}

type HubAppt = { id: string; title: string; kind: string; scheduledAt: string; status: string; professional: string | null; location: string | null };
const APPT_KIND: Record<string, string> = { CONSULTATION: "Consulta", FOLLOWUP: "Retorno", EXAM: "Exame", VACCINE: "Vacina", OTHER: "Atendimento" };
const APPT_STATUS: Record<string, string> = { SCHEDULED: "agendada", COMPLETED: "concluída", CANCELLED: "cancelada", NO_SHOW: "faltou" };

function MyAppointmentsHubSection({ token }: { token: string }) {
  const [items, setItems] = useState<HubAppt[]>([]);
  useEffect(() => {
    fetch("/api/patient/appointments", { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json()).then((j) => { if (j.ok) setItems(j.appointments as HubAppt[]); }).catch(() => {});
  }, [token]);

  if (items.length === 0) return null;
  return (
    <Section title="📅 Minhas consultas" subtitle="Agendamentos com sua farmácia">
      <div className="space-y-2">
        {items.map((a) => {
          const upcoming = a.status === "SCHEDULED" && new Date(a.scheduledAt).getTime() > Date.now();
          return (
            <div key={a.id} className={`rounded-xl border p-3.5 ${upcoming ? "bg-emerald-400/10 border-emerald-400/30" : "bg-white/5 border-white/10"}`}>
              <div className="flex items-center justify-between gap-2">
                <div className="font-semibold text-sm">{a.title}</div>
                <span className="text-[10px] text-emerald-100/60">{APPT_STATUS[a.status] ?? a.status}</span>
              </div>
              <div className="text-emerald-100/70 text-xs mt-0.5">
                {new Date(a.scheduledAt).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })} · {APPT_KIND[a.kind] ?? a.kind}
                {a.professional ? ` · ${a.professional}` : ""}
              </div>
            </div>
          );
        })}
      </div>
    </Section>
  );
}

type BarcodeDetectorLike = { detect: (s: unknown) => Promise<{ rawValue: string }[]> };

function ReceiptScanHubSection({ token, onFlash }: { token: string; onFlash: (m: string) => void }) {
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [scanning, setScanning] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number | null>(null);

  function stopScan() {
    setScanning(false);
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }
  useEffect(() => () => stopScan(), []);

  async function submit(raw: string) {
    if (busy) return;
    setBusy(true);
    try {
      const r = await fetch("/api/patient/receipts", {
        method: "POST", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }, body: JSON.stringify({ code: raw }),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok || !j.ok) { onFlash(j.error ?? "Não foi possível registrar"); return; }
      onFlash(`Nota registrada! +${j.points} pontos 🎉`);
      setCode("");
      setTimeout(() => window.location.reload(), 1200);
    } finally { setBusy(false); }
  }

  async function startScan() {
    const Ctor = (window as unknown as { BarcodeDetector?: new (o: { formats: string[] }) => BarcodeDetectorLike }).BarcodeDetector;
    if (!Ctor || !navigator.mediaDevices?.getUserMedia) { onFlash("Câmera indisponível — cole a chave abaixo"); return; }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
      streamRef.current = stream;
      setScanning(true);
      const detector = new Ctor({ formats: ["qr_code"] });
      const video = videoRef.current!;
      video.srcObject = stream;
      await video.play();
      const tick = async () => {
        if (!streamRef.current || !videoRef.current) return;
        try {
          const codes = await detector.detect(videoRef.current);
          if (codes[0]?.rawValue) { const v = codes[0].rawValue; stopScan(); submit(v); return; }
        } catch { /* keep trying */ }
        rafRef.current = requestAnimationFrame(tick);
      };
      rafRef.current = requestAnimationFrame(tick);
    } catch { onFlash("Não foi possível abrir a câmera"); stopScan(); }
  }

  return (
    <Section title="🧾 Nota premiada" subtitle="Escaneie o QR da nota fiscal e ganhe pontos">
      {scanning ? (
        <div className="rounded-xl overflow-hidden border border-emerald-400/40">
          <video ref={videoRef} className="w-full bg-black" muted playsInline />
          <button onClick={stopScan} className="w-full bg-white/10 text-white text-sm py-2">Cancelar</button>
        </div>
      ) : (
        <div className="rounded-xl bg-white/5 border border-white/10 p-3.5 space-y-2">
          <button onClick={startScan} className="w-full rounded-lg bg-emerald-400 text-emerald-950 font-bold text-sm py-2.5">📷 Escanear QR da nota</button>
          <input value={code} onChange={(e) => setCode(e.target.value)} placeholder="ou cole a chave de 44 dígitos" className="w-full rounded-lg bg-white/10 border border-white/15 px-3 py-2 text-sm placeholder:text-emerald-100/40 outline-none" />
          <button onClick={() => submit(code)} disabled={busy || code.replace(/\D/g, "").length < 44} className="w-full rounded-lg bg-white/10 text-white font-semibold text-sm py-2 disabled:opacity-40">{busy ? "Registrando…" : "Registrar nota"}</button>
        </div>
      )}
    </Section>
  );
}

function RamReportHubSection({ token, onFlash }: { token: string; onFlash: (m: string) => void }) {
  const [text, setText] = useState("");
  const [sev, setSev] = useState("MODERATE");
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState(false);

  async function send() {
    if (text.trim().length < 3) { onFlash("Descreva o que você sentiu"); return; }
    setBusy(true);
    try {
      const r = await fetch("/api/patient/ram", {
        method: "POST", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ freeText: text, symptoms: text.split(",").map((s) => s.trim()).filter(Boolean).slice(0, 10), severity: sev }),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok || !j.ok) { onFlash(j.error ?? "Erro ao enviar"); return; }
      onFlash("Relato enviado à sua farmácia. Obrigado! 🙏");
      setText(""); setOpen(false);
    } finally { setBusy(false); }
  }

  return (
    <Section title="⚠️ Senti uma reação" subtitle="Relate uma reação adversa ao medicamento">
      {!open ? (
        <button onClick={() => setOpen(true)} className="w-full rounded-xl bg-white/5 border border-white/10 py-3 text-sm font-semibold hover:bg-white/10">Relatar reação adversa</button>
      ) : (
        <div className="rounded-xl bg-white/5 border border-white/10 p-3.5 space-y-2">
          <textarea value={text} onChange={(e) => setText(e.target.value)} rows={3} placeholder="O que você sentiu? (ex.: náusea, tontura, manchas)" className="w-full resize-none rounded-lg bg-white/10 border border-white/15 px-3 py-2 text-sm placeholder:text-emerald-100/40 outline-none" />
          <select value={sev} onChange={(e) => setSev(e.target.value)} className="w-full rounded-lg bg-white/10 border border-white/15 px-3 py-2 text-sm text-white">
            <option className="text-slate-900" value="MILD">Leve</option>
            <option className="text-slate-900" value="MODERATE">Moderada</option>
            <option className="text-slate-900" value="SEVERE">Grave</option>
          </select>
          <div className="flex gap-2">
            <button onClick={send} disabled={busy} className="flex-1 rounded-lg bg-emerald-400 text-emerald-950 font-bold text-sm py-2 disabled:opacity-50">{busy ? "Enviando…" : "Enviar relato"}</button>
            <button onClick={() => setOpen(false)} className="rounded-lg bg-white/10 text-white text-sm px-4">Cancelar</button>
          </div>
        </div>
      )}
    </Section>
  );
}

function ProfileHubSection({ token, onFlash }: { token: string; onFlash: (m: string) => void }) {
  const [profile, setProfile] = useState<{ name: string; phone: string; allergies: string[] } | null>(null);
  const [name, setName] = useState("");
  const [allergies, setAllergies] = useState("");
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    fetch("/api/patient/profile", { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json()).then((j) => {
        if (j.ok && j.profile) { setProfile(j.profile); setName(j.profile.name ?? ""); setAllergies((j.profile.allergies ?? []).join(", ")); }
      }).catch(() => {});
  }, [token]);

  async function save() {
    setBusy(true);
    try {
      const r = await fetch("/api/patient/profile", {
        method: "PATCH", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ name, allergies: allergies.split(",").map((s) => s.trim()).filter(Boolean) }),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok || !j.ok) { onFlash(j.error ?? "Erro"); return; }
      onFlash("Perfil atualizado ✓");
      setProfile((p) => p ? { ...p, name, allergies: allergies.split(",").map((s) => s.trim()).filter(Boolean) } : p);
      setOpen(false);
    } finally { setBusy(false); }
  }

  if (!profile) return null;
  return (
    <Section title="👤 Meu perfil" subtitle="Mantenha seus dados atualizados">
      {!open ? (
        <div className="rounded-xl bg-white/5 border border-white/10 p-3.5">
          <div className="font-semibold text-sm">{profile.name}</div>
          <div className="text-emerald-100/60 text-xs mt-0.5">{profile.phone}{profile.allergies.length ? ` · alergias: ${profile.allergies.join(", ")}` : ""}</div>
          <button onClick={() => setOpen(true)} className="mt-2 text-emerald-300 text-xs font-semibold">Editar →</button>
        </div>
      ) : (
        <div className="rounded-xl bg-white/5 border border-white/10 p-3.5 space-y-2">
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nome" className="w-full rounded-lg bg-white/10 border border-white/15 px-3 py-2 text-sm outline-none" />
          <input value={allergies} onChange={(e) => setAllergies(e.target.value)} placeholder="Alergias (separadas por vírgula)" className="w-full rounded-lg bg-white/10 border border-white/15 px-3 py-2 text-sm placeholder:text-emerald-100/40 outline-none" />
          <div className="flex gap-2">
            <button onClick={save} disabled={busy} className="flex-1 rounded-lg bg-emerald-400 text-emerald-950 font-bold text-sm py-2 disabled:opacity-50">{busy ? "Salvando…" : "Salvar"}</button>
            <button onClick={() => setOpen(false)} className="rounded-lg bg-white/10 text-white text-sm px-4">Cancelar</button>
          </div>
        </div>
      )}
    </Section>
  );
}

type HubRx = { id: string; fileName: string; signature: string; status: string; createdAt: string };
const RX_SIG: Record<string, string> = { VERIFIED_ICP: "✓ assinada (ICP)", SIGNED_DETECTED: "assinada · validação pendente", UNSIGNED: "receita comum", INVALID: "assinatura inválida" };
const RX_STATUS: Record<string, string> = { SUBMITTED: "enviada", LEAD: "enviada à farmácia", DISPENSED: "dispensada", EXPIRED: "expirada", REJECTED: "recusada" };

function RxUploadHubSection({ token, onFlash }: { token: string; onFlash: (m: string) => void }) {
  const [items, setItems] = useState<HubRx[]>([]);
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  async function load() {
    const r = await fetch("/api/patient/prescriptions", { headers: { Authorization: `Bearer ${token}` } });
    const j = await r.json().catch(() => ({}));
    if (j.ok) setItems(j.prescriptions as HubRx[]);
  }
  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function upload() {
    const file = fileRef.current?.files?.[0];
    if (!file) { onFlash("Selecione o arquivo da receita"); return; }
    setBusy(true);
    try {
      const fd = new FormData();
      fd.set("file", file);
      const r = await fetch("/api/patient/prescriptions", { method: "POST", headers: { Authorization: `Bearer ${token}` }, body: fd });
      const j = await r.json().catch(() => ({}));
      if (!r.ok || !j.ok) { onFlash(j.error ?? "Falha no envio"); return; }
      if (fileRef.current) fileRef.current.value = "";
      onFlash(j.signatureNote?.includes("detectada") ? "Receita assinada enviada à farmácia! 📄" : "Receita enviada! 📄");
      load();
    } finally { setBusy(false); }
  }

  return (
    <Section title="📄 Enviar receita" subtitle="Receita digital (PDF/.p7s) ou foto — avaliamos a assinatura e avisamos sua farmácia">
      <div className="rounded-xl bg-white/5 border border-white/10 p-3.5">
        <input ref={fileRef} type="file" accept="application/pdf,image/*,.p7s"
          className="w-full text-[12px] text-emerald-100/70 file:mr-2 file:rounded-md file:border-0 file:bg-emerald-400 file:px-3 file:py-1.5 file:text-[12px] file:font-bold file:text-emerald-950" />
        <button onClick={upload} disabled={busy} className="mt-2 w-full rounded-lg bg-emerald-400 text-emerald-950 font-bold text-sm py-2 disabled:opacity-60">
          {busy ? "Enviando…" : "+ Enviar receita"}
        </button>
      </div>
      {items.length > 0 && (
        <div className="mt-2.5 space-y-1.5">
          {items.map((rx) => (
            <div key={rx.id} className="rounded-lg bg-white/5 border border-white/10 px-3 py-2">
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm truncate">{rx.fileName}</span>
                <span className="text-[10px] text-emerald-100/60 shrink-0">{RX_STATUS[rx.status] ?? rx.status}</span>
              </div>
              <div className="text-[10px] text-emerald-100/40">{RX_SIG[rx.signature] ?? rx.signature}</div>
            </div>
          ))}
        </div>
      )}
    </Section>
  );
}

function ReferralHubSection({ token, onFlash }: { token: string; onFlash: (m: string) => void }) {
  const [data, setData] = useState<{ code: string; count: number; points: number } | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetch("/api/patient/referral", { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json()).then((j) => { if (j.ok) setData({ code: j.code, count: j.count, points: j.points }); }).catch(() => {});
  }, [token]);

  if (!data) return null;
  const link = `${typeof window !== "undefined" ? window.location.origin : ""}/cadastro?ref=${data.code}`;

  function share() {
    const text = `Cuide da sua saúde comigo no Meu Prontuário e ganhe recompensas: ${link}`;
    const nav = navigator as Navigator & { share?: (d: { text: string }) => Promise<void> };
    if (nav.share) { nav.share({ text }).catch(() => {}); return; }
    navigator.clipboard?.writeText(link).then(() => { setCopied(true); onFlash("Link copiado!"); setTimeout(() => setCopied(false), 2000); });
  }

  return (
    <Section title="🎁 Indique e ganhe" subtitle="Compartilhe seu link; quando um amigo se cadastra, você ganha pontos">
      <div className="rounded-xl bg-white/5 border border-white/10 p-3.5">
        <div className="flex items-center gap-2">
          <code className="flex-1 truncate rounded-lg bg-white/10 px-3 py-2 text-[12px] font-mono text-emerald-100">{link}</code>
          <button onClick={share} className="shrink-0 rounded-lg bg-emerald-400 text-emerald-950 font-bold text-sm px-3 py-2">{copied ? "✓" : "Compartilhar"}</button>
        </div>
        <div className="mt-2 flex gap-4 text-[12px] text-emerald-100/70">
          <span>👥 {data.count} indicad{data.count === 1 ? "o" : "os"}</span>
          <span>⭐ {data.points} pts ganhos</span>
        </div>
      </div>
    </Section>
  );
}

function Section({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <section className="mt-6">
      <h2 className="font-bold text-base">{title}</h2>
      {subtitle && <p className="text-emerald-100/50 text-xs mb-3">{subtitle}</p>}
      {!subtitle && <div className="mb-3" />}
      {children}
    </section>
  );
}
