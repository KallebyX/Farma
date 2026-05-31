import Link from "next/link";
import { FarmaLogo, Icon } from "@/components/ui";

/**
 * Public marketing landing page. Intentionally auth-free (no `auth()` call) so
 * `/` always renders — even on an environment where the auth secret isn't set —
 * and so it can be statically optimized. Staff CTAs go to /sign-up and /sign-in;
 * patients go to /entrar; anyone can preview the patient app at /demo/prontuario.
 */
export const metadata = {
  title: "Farma — Adesão, farmacovigilância e fidelização para farmácias",
  description:
    "Plataforma que aumenta a adesão ao tratamento via WhatsApp, automatiza farmacovigilância (RAM→VigiMed), traz pacientes de volta para recompra e fideliza com gamificação e cashback de afiliados.",
};

const features = [
  { icon: "WhatsApp", title: "Adesão por WhatsApp", desc: "Lembretes de medicação no horário certo, confirmação de dose e follow-up automático. Menos abandono de tratamento." },
  { icon: "Alert", title: "Farmacovigilância", desc: "Inbox de reações adversas (RAM) com triagem clínica e submissão ao VigiMed — conformidade sem planilha." },
  { icon: "Cart", title: "Retornos & recompra", desc: "A plataforma prevê quando o remédio vai acabar e reconquista o paciente antes que ele compre na concorrência." },
  { icon: "Heart", title: "Gamificação & fidelidade", desc: "Missões, pontos e níveis Bronze→Platina que transformam a adesão em hábito — no estilo dos melhores apps de saúde." },
  { icon: "TrendUp", title: "Afiliados & cashback", desc: "Links rastreáveis de compra: o paciente ganha pontos, a farmácia ganha comissão. Conversões idempotentes e auditáveis." },
  { icon: "Activity", title: "Saúde conectada", desc: "Apple Watch, Galaxy Watch, Fitbit, Oura e mais — métricas do paciente direto no prontuário." },
];

const steps = [
  { n: "1", title: "Cadastre o paciente e a prescrição", desc: "Em segundos, com consentimento LGPD e posologia por intervalo ou horários fixos." },
  { n: "2", title: "O WhatsApp faz o trabalho pesado", desc: "Lembretes, confirmações, RAM e retornos acontecem sozinhos — sua equipe só atua quando precisa." },
  { n: "3", title: "Engaje, fidelize e cresça", desc: "O paciente acompanha sua saúde no hub, ganha pontos e volta para comprar com você." },
];

export default function Landing() {
  return (
    <div className="min-h-screen bg-white text-slate-800">
      {/* ── Nav ─────────────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-30 border-b border-slate-100 bg-white/85 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-3.5">
          <Link href="/" className="flex items-center gap-2.5">
            <FarmaLogo size={32} />
            <span className="text-[17px] font-bold tracking-tight text-brand-900">Farma</span>
          </Link>
          <nav className="hidden items-center gap-7 text-[13.5px] font-medium text-slate-600 md:flex">
            <a href="#recursos" className="hover:text-brand-800">Recursos</a>
            <a href="#como-funciona" className="hover:text-brand-800">Como funciona</a>
            <a href="#paciente" className="hover:text-brand-800">Para o paciente</a>
            <Link href="/demo/prontuario" className="hover:text-brand-800">Demonstração</Link>
          </nav>
          <div className="flex items-center gap-2.5">
            <Link href="/sign-in" className="hidden rounded-lg px-3.5 py-2 text-[13.5px] font-medium text-slate-700 hover:bg-slate-100 sm:block">
              Entrar
            </Link>
            <Link href="/sign-up" className="rounded-lg bg-brand-700 px-4 py-2 text-[13.5px] font-semibold text-white shadow-sm transition hover:bg-brand-800">
              Criar conta grátis
            </Link>
          </div>
        </div>
      </header>

      {/* ── Hero ────────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-brand-50/70 via-white to-white" />
        <div className="relative mx-auto max-w-6xl px-5 pb-20 pt-16 md:pt-24">
          <div className="mx-auto max-w-3xl text-center">
            <span className="inline-flex items-center gap-2 rounded-full border border-brand-100 bg-white px-3 py-1 text-[12px] font-semibold text-brand-700 shadow-sm">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              Adesão · Farmacovigilância · Fidelização
            </span>
            <h1 className="mt-5 text-4xl font-extrabold leading-[1.08] tracking-tight text-slate-900 md:text-[56px]">
              Seus pacientes <span className="text-brand-700">aderem ao tratamento</span> — e voltam para comprar com você.
            </h1>
            <p className="mx-auto mt-5 max-w-2xl text-[16px] leading-relaxed text-slate-600 md:text-[17.5px]">
              A Farma é a plataforma que cuida da adesão via WhatsApp, automatiza a farmacovigilância e fideliza
              com gamificação e cashback — tudo multiloja, com conformidade LGPD.
            </p>
            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link href="/sign-up" className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-brand-700 px-7 text-[15px] font-semibold text-white shadow-md transition hover:bg-brand-800 sm:w-auto">
                Começar grátis <Icon.ChevronRight size={18} />
              </Link>
              <Link href="/demo/prontuario" className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-7 text-[15px] font-semibold text-slate-700 transition hover:bg-slate-50 sm:w-auto">
                <Icon.Activity size={18} /> Ver demonstração
              </Link>
            </div>
            <p className="mt-4 text-[12.5px] text-slate-400">
              É paciente? <Link href="/entrar" className="font-medium text-brand-600 underline-offset-2 hover:underline">Acesse sua saúde aqui →</Link>
            </p>
          </div>

          {/* metric strip */}
          <div className="mx-auto mt-16 grid max-w-4xl grid-cols-2 gap-px overflow-hidden rounded-2xl border border-slate-200 bg-slate-200 sm:grid-cols-4">
            {[
              ["+40%", "adesão ao tratamento"],
              ["24/7", "lembretes no WhatsApp"],
              ["1 clique", "RAM → VigiMed"],
              ["100%", "multiloja & LGPD"],
            ].map(([big, small]) => (
              <div key={small} className="bg-white px-5 py-6 text-center">
                <p className="text-2xl font-bold tracking-tight text-brand-800 md:text-3xl">{big}</p>
                <p className="mt-1 text-[12px] text-slate-500">{small}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Features ────────────────────────────────────────────────────── */}
      <section id="recursos" className="mx-auto max-w-6xl px-5 py-20">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight text-slate-900">Uma plataforma, o ciclo completo do paciente</h2>
          <p className="mt-3 text-[15px] text-slate-600">Do primeiro lembrete à recompra fidelizada — sem trocar de sistema.</p>
        </div>
        <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((f) => {
            const IconComp = Icon[f.icon as keyof typeof Icon];
            return (
              <div key={f.title} className="group rounded-2xl border border-slate-200 bg-white p-6 transition hover:border-brand-200 hover:shadow-md">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-50 text-brand-700 transition group-hover:bg-brand-100">
                  <IconComp size={22} />
                </div>
                <h3 className="mt-4 text-[16px] font-semibold text-slate-900">{f.title}</h3>
                <p className="mt-1.5 text-[13.5px] leading-relaxed text-slate-600">{f.desc}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* ── How it works ────────────────────────────────────────────────── */}
      <section id="como-funciona" className="border-y border-slate-100 bg-slate-50/60">
        <div className="mx-auto max-w-6xl px-5 py-20">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight text-slate-900">Funciona em 3 passos</h2>
            <p className="mt-3 text-[15px] text-slate-600">Sua equipe ganha tempo; o paciente ganha cuidado.</p>
          </div>
          <div className="mt-12 grid gap-6 md:grid-cols-3">
            {steps.map((s) => (
              <div key={s.n} className="relative rounded-2xl border border-slate-200 bg-white p-7">
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-700 text-[15px] font-bold text-white">{s.n}</span>
                <h3 className="mt-4 text-[16px] font-semibold text-slate-900">{s.title}</h3>
                <p className="mt-1.5 text-[13.5px] leading-relaxed text-slate-600">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Patient experience ──────────────────────────────────────────── */}
      <section id="paciente" className="mx-auto max-w-6xl px-5 py-20">
        <div className="grid items-center gap-12 lg:grid-cols-2">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-brand-700">Para o paciente</span>
            <h2 className="mt-2 text-3xl font-bold tracking-tight text-slate-900">Um “Meu Prontuário” que o paciente realmente abre</h2>
            <p className="mt-4 text-[15px] leading-relaxed text-slate-600">
              Lembretes que funcionam, consultas e exames num só lugar, dados do relógio sincronizados e
              recompensas por cuidar da própria saúde. Quando o remédio acaba, a recompra é a um toque —
              com pontos e o melhor preço entre as farmácias parceiras.
            </p>
            <ul className="mt-6 space-y-3">
              {[
                "Lembretes e confirmação de dose no WhatsApp",
                "Saúde conectada: Apple Watch, Galaxy Watch, Fitbit, Oura…",
                "Pontos, níveis e recompensas a cada passo",
                "Recompra com link de afiliado e cashback",
              ].map((t) => (
                <li key={t} className="flex items-start gap-3 text-[14px] text-slate-700">
                  <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-700"><Icon.Check size={13} /></span>
                  {t}
                </li>
              ))}
            </ul>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/demo/prontuario" className="inline-flex h-11 items-center gap-2 rounded-xl bg-brand-700 px-6 text-[14px] font-semibold text-white transition hover:bg-brand-800">
                <Icon.Activity size={17} /> Abrir demonstração
              </Link>
              <Link href="/entrar" className="inline-flex h-11 items-center gap-2 rounded-xl border border-slate-300 px-6 text-[14px] font-semibold text-slate-700 transition hover:bg-slate-50">
                <Icon.Phone size={17} /> Área do paciente
              </Link>
            </div>
          </div>
          <div className="relative">
            <div className="absolute -inset-4 rounded-3xl bg-gradient-to-tr from-brand-100/60 to-emerald-100/50 blur-2xl" />
            <div className="relative rounded-3xl border border-slate-200 bg-white p-6 shadow-xl">
              <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
                <span className="text-2xl">💊</span>
                <div>
                  <p className="text-[14px] font-bold text-brand-900">Meu Prontuário</p>
                  <p className="text-[11.5px] text-slate-500">Maria · Nível Ouro · 1.240 pts</p>
                </div>
              </div>
              <div className="mt-4 space-y-2.5">
                <div className="flex items-center justify-between rounded-xl bg-emerald-50 px-4 py-3">
                  <span className="text-[13px] font-medium text-emerald-900">✓ Losartana 50mg — 08:00</span>
                  <span className="text-[11px] font-semibold text-emerald-700">+10 pts</span>
                </div>
                <div className="flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3">
                  <span className="text-[13px] text-slate-700">❤️ Frequência cardíaca</span>
                  <span className="text-[12.5px] font-semibold text-slate-800 tabular-nums">72 bpm</span>
                </div>
                <div className="flex items-center justify-between rounded-xl border border-brand-100 bg-brand-50 px-4 py-3">
                  <span className="text-[13px] font-medium text-brand-900">🛒 Recomprar (acaba em 3 dias)</span>
                  <span className="text-[11px] font-semibold text-brand-700">-12%</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Integrations note ───────────────────────────────────────────── */}
      <section className="border-t border-slate-100 bg-slate-50/60">
        <div className="mx-auto flex max-w-6xl flex-col items-center gap-4 px-5 py-12 text-center">
          <Icon.Link size={26} className="text-brand-600" />
          <h3 className="text-[18px] font-semibold text-slate-900">Conecte o sistema da sua farmácia</h3>
          <p className="max-w-xl text-[13.5px] text-slate-600">
            API de parceiros com chaves seguras e webhooks assinados (RAM, retornos, pedidos). Integre ERP, e-commerce
            e BI sem fricção.
          </p>
        </div>
      </section>

      {/* ── Final CTA ───────────────────────────────────────────────────── */}
      <section className="mx-auto max-w-6xl px-5 py-20">
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-brand-800 to-brand-950 px-8 py-14 text-center shadow-xl">
          <h2 className="text-3xl font-bold tracking-tight text-white md:text-4xl">Pronto para fidelizar seus pacientes?</h2>
          <p className="mx-auto mt-3 max-w-xl text-[15px] text-brand-100">
            Crie sua conta em minutos. Sem cartão de crédito.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link href="/sign-up" className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-white px-7 text-[15px] font-semibold text-brand-800 transition hover:bg-brand-50">
              Criar conta grátis <Icon.ChevronRight size={18} />
            </Link>
            <Link href="/sign-in" className="inline-flex h-12 items-center justify-center rounded-xl border border-white/30 px-7 text-[15px] font-semibold text-white transition hover:bg-white/10">
              Já tenho conta
            </Link>
          </div>
        </div>
      </section>

      {/* ── Footer ──────────────────────────────────────────────────────── */}
      <footer className="border-t border-slate-100">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-5 py-8 text-[12.5px] text-slate-500 sm:flex-row">
          <div className="flex items-center gap-2">
            <FarmaLogo size={22} />
            <span className="font-semibold text-slate-700">Farma</span>
            <span className="text-slate-400">© {new Date().getFullYear()}</span>
          </div>
          <div className="flex items-center gap-5">
            <Link href="/legal/privacy" className="hover:text-slate-800">Privacidade</Link>
            <Link href="/legal/terms" className="hover:text-slate-800">Termos</Link>
            <Link href="/demo/prontuario" className="hover:text-slate-800">Demonstração</Link>
            <Link href="/sign-in" className="hover:text-slate-800">Entrar</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
