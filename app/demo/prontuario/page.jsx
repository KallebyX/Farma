"use client";

/*
 * DEMO — Prontuário do Paciente "Meu Prontuário"
 * --------------------------------------------------
 * Mockup de apresentação (NÃO conectado ao backend Farma).
 * Objetivo: mostrar a visão do paciente, com destaque para a
 * indicação de farmácia e a compra dos medicamentos a partir
 * da prescrição (comparar preços, entrega/retirada, pedidos e
 * acompanhamento de adesão).
 *
 * Abre direto na aba "Farmácia" para a demonstração.
 */

import { useState } from "react";

/* ─── DESIGN TOKENS ─────────────────────────────────────────────── */
const T = {
  green900: "#064e3b",
  green800: "#065f46",
  green700: "#047857",
  green600: "#059669",
  green500: "#10b981",
  green50: "#ecfdf5",
  navy: "#064e3b",
  blue: "#047857",
  teal: "#059669",
  mint: "#a7f3d0",
  amber: "#f59e0b",
  green: "#10b981",
  slate50: "#f8fafc",
  slate100: "#f1f5f9",
  slate200: "#e2e8f0",
  slate300: "#cbd5e1",
  slate400: "#94a3b8",
  slate500: "#64748b",
  slate600: "#475569",
  slate700: "#334155",
  slate800: "#1e293b",
  white: "#ffffff",
};

const PACIENTE = {
  nome: "Maria Fernanda Costa",
  iniciais: "MF",
  nascimento: "14/03/1985",
  cpf: "•••.•••.456-78",
  plano: "Meu Prontuário Premium",
  sangue: "A+",
  alergias: ["Dipirona", "Penicilina"],
};

/* ─── FARMÁCIAS PARCEIRAS & MEDICAÇÕES ──────────────────────────── */
const FARMACIAS = [
  { id: 1, nome: "Drogasil", distancia: "0.4 km", endereco: "Av. Paulista, 1230 — Bela Vista", aberto24h: false, horario: "07h às 23h", taxaEntrega: "R$ 6,90", tempoEntrega: "30-45 min", convenios: ["Bradesco Saúde", "SulAmérica", "Programa Vida"], rating: 4.7, icone: "💊", cor: "#0d9488", total: 142.5, desconto: 18.3, final: 124.2 },
  { id: 2, nome: "Drogaria São Paulo", distancia: "0.8 km", endereco: "R. Augusta, 890 — Consolação", aberto24h: true, horario: "24 horas", taxaEntrega: "R$ 8,90", tempoEntrega: "45-60 min", convenios: ["Amil", "Bradesco Saúde", "Programa Mais Saúde"], rating: 4.5, icone: "🏥", cor: "#3b82f6", total: 142.5, desconto: 12.1, final: 130.4 },
  { id: 3, nome: "Pague Menos", distancia: "1.2 km", endereco: "Av. Brigadeiro Luís Antônio, 456", aberto24h: false, horario: "07h às 22h", taxaEntrega: "Grátis", tempoEntrega: "60-90 min", convenios: ["SulAmérica", "Sempre Bem"], rating: 4.4, icone: "🏪", cor: "#9333ea", total: 142.5, desconto: 22.8, final: 119.7 },
  { id: 4, nome: "Panvel", distancia: "1.5 km", endereco: "R. Oscar Freire, 1100 — Jardins", aberto24h: false, horario: "08h às 22h", taxaEntrega: "R$ 5,90", tempoEntrega: "40-60 min", convenios: ["Programa Panvel", "Bradesco Saúde"], rating: 4.6, icone: "🏬", cor: "#f59e0b", total: 142.5, desconto: 15.5, final: 127.0 },
];

const MEDICAMENTOS_USO = [
  { id: 1, nome: "Losartana", dosagem: "50mg", fabricante: "EMS Genérico", generico: true, posologia: "1 comp pela manhã", proxDose: "Amanhã, 07:00", estoque: 12, estoqueDias: 12, receita: "Dr. Carlos Mendes · 12/04/2025", cid: "I10 - Hipertensão", aderencia: 96, icone: "💊", cor: "#10b981", tipo: "uso_continuo" },
  { id: 2, nome: "Vitamina D", dosagem: "2000 UI", fabricante: "Addera D3", generico: false, posologia: "1 comp ao dia", proxDose: "Amanhã, 08:00", estoque: 28, estoqueDias: 28, receita: "Dr. Carlos Mendes · 12/04/2025", cid: null, aderencia: 92, icone: "💊", cor: "#10b981", tipo: "uso_continuo" },
  { id: 3, nome: "Cefalexina", dosagem: "500mg", fabricante: "Medley Genérico", generico: true, posologia: "1 cáp 6/6h por 7 dias", proxDose: "Hoje, 18:00", estoque: 8, estoqueDias: 2, receita: "Dr. Ricardo Tavares · 17/08/2024", cid: "K35.8 - Pós-cirúrgico", aderencia: 100, icone: "💊", cor: "#f59e0b", tipo: "tratamento", diasRestantes: 2 },
];

const PEDIDOS_RECENTES = [
  { id: 1, farmacia: "Drogasil", data: "20/04/2025", medicamentos: ["Losartana 50mg (60 comp)", "Vitamina D 2000UI (30 comp)"], total: 124.2, status: "Entregue", statusCor: "#10b981", icone: "✓", rastreio: null },
  { id: 2, farmacia: "Pague Menos", data: "26/04/2025", medicamentos: ["Cefalexina 500mg (28 cáp)"], total: 38.5, status: "A caminho", statusCor: "#3b82f6", icone: "🚚", rastreio: "Saiu para entrega · Previsão 16:30" },
  { id: 3, farmacia: "Drogasil", data: "15/03/2025", medicamentos: ["Losartana 50mg (60 comp)", "Vitamina D 2000UI (30 comp)"], total: 124.2, status: "Entregue", statusCor: "#10b981", icone: "✓", rastreio: null },
];

/* ─── PRIMITIVOS DE UI ──────────────────────────────────────────── */
function Avatar({ iniciais, size = 36, bg = T.blue }) {
  return (
    <div style={{ width: size, height: size, borderRadius: "50%", background: bg, display: "flex", alignItems: "center", justifyContent: "center", color: "white", fontWeight: 800, fontSize: size * 0.35, flexShrink: 0 }}>
      {iniciais}
    </div>
  );
}

function Btn({ children, onClick, variant = "primary", small, style: sx }) {
  const base = { border: "none", borderRadius: 10, fontWeight: 700, cursor: "pointer", transition: "all 0.15s", fontFamily: "inherit" };
  const pad = small ? "7px 14px" : "11px 22px";
  const fs = small ? 12 : 14;
  const variants = {
    primary: { background: `linear-gradient(135deg, ${T.navy}, ${T.blue})`, color: T.white, padding: pad, fontSize: fs },
    secondary: { background: T.slate100, color: T.slate600, padding: pad, fontSize: fs },
    danger: { background: "#fee2e2", color: "#b91c1c", padding: pad, fontSize: fs },
    teal: { background: `linear-gradient(135deg, ${T.teal}, #0f766e)`, color: T.white, padding: pad, fontSize: fs },
  };
  return <button style={{ ...base, ...variants[variant], ...sx }} onClick={onClick}>{children}</button>;
}

/* ─── PAINEL FARMÁCIA (núcleo da demo) ──────────────────────────── */
function PainelFarmacia() {
  const [aba, setAba] = useState("medicamentos");
  const [farmaciaSel, setFarmaciaSel] = useState(null);
  const [modalCompra, setModalCompra] = useState(false);
  const [etapaCompra, setEtapaCompra] = useState(1);
  const [tipoEntrega, setTipoEntrega] = useState("entrega");

  const aderenciaMedia = Math.round(MEDICAMENTOS_USO.reduce((acc, m) => acc + m.aderencia, 0) / MEDICAMENTOS_USO.length);
  const totalMedicamentos = MEDICAMENTOS_USO.length;
  const baixoEstoque = MEDICAMENTOS_USO.filter((m) => m.estoqueDias <= 7).length;

  function confirmarCompra() {
    setEtapaCompra(3);
  }
  function fecharModal() {
    setModalCompra(false);
    setFarmaciaSel(null);
    setEtapaCompra(1);
  }

  return (
    <div>
      {/* Sub-abas */}
      <div style={{ display: "flex", gap: 4, background: T.slate100, padding: 4, borderRadius: 12, marginBottom: 18 }}>
        {[
          { id: "medicamentos", l: "💊 Medicamentos" },
          { id: "comparar", l: "🔍 Comparar Preços" },
          { id: "pedidos", l: "📦 Pedidos" },
          { id: "aderencia", l: "📊 Adesão" },
        ].map((t) => (
          <button key={t.id} onClick={() => setAba(t.id)} style={{
            flex: 1, padding: "8px 6px", border: "none", borderRadius: 8, cursor: "pointer", fontSize: 11, fontWeight: 700,
            background: aba === t.id ? T.white : "transparent",
            color: aba === t.id ? T.navy : T.slate400,
            boxShadow: aba === t.id ? "0 1px 4px #0001" : "none",
            fontFamily: "inherit",
          }}>{t.l}</button>
        ))}
      </div>

      {/* MEDICAMENTOS */}
      {aba === "medicamentos" && (
        <div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10, marginBottom: 18 }}>
            <div style={{ background: T.white, borderRadius: 12, padding: "14px 16px", borderLeft: `4px solid ${T.teal}`, boxShadow: "0 1px 3px #0001" }}>
              <div style={{ fontSize: 18 }}>💊</div>
              <div style={{ fontSize: 26, fontWeight: 900, color: T.teal, lineHeight: 1.1 }}>{totalMedicamentos}</div>
              <div style={{ fontSize: 11, color: T.slate400, marginTop: 2 }}>Medicações ativas</div>
            </div>
            <div style={{ background: T.white, borderRadius: 12, padding: "14px 16px", borderLeft: `4px solid ${aderenciaMedia >= 90 ? T.green : "#f59e0b"}`, boxShadow: "0 1px 3px #0001" }}>
              <div style={{ fontSize: 18 }}>📈</div>
              <div style={{ fontSize: 26, fontWeight: 900, color: aderenciaMedia >= 90 ? T.green : "#f59e0b", lineHeight: 1.1 }}>{aderenciaMedia}%</div>
              <div style={{ fontSize: 11, color: T.slate400, marginTop: 2 }}>Adesão média</div>
            </div>
            <div style={{ background: T.white, borderRadius: 12, padding: "14px 16px", borderLeft: "4px solid #f59e0b", boxShadow: "0 1px 3px #0001" }}>
              <div style={{ fontSize: 18 }}>⚠️</div>
              <div style={{ fontSize: 26, fontWeight: 900, color: "#f59e0b", lineHeight: 1.1 }}>{baixoEstoque}</div>
              <div style={{ fontSize: 11, color: T.slate400, marginTop: 2 }}>Estoque baixo</div>
            </div>
          </div>

          {baixoEstoque > 0 && (
            <div style={{ background: "#fef3c7", border: "1px solid #fcd34d", borderLeft: "4px solid #f59e0b", borderRadius: 12, padding: "14px 18px", marginBottom: 14, display: "flex", gap: 12, alignItems: "center" }}>
              <span style={{ fontSize: 26 }}>⚠️</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 800, fontSize: 13, color: "#78350f" }}>Cefalexina acaba em 2 dias</div>
                <div style={{ fontSize: 11, color: "#92400e", marginTop: 2 }}>Compare preços e peça antes que acabe.</div>
              </div>
              <Btn variant="primary" small onClick={() => setAba("comparar")}>Comprar agora</Btn>
            </div>
          )}

          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {MEDICAMENTOS_USO.map((m) => {
              const corEstoque = m.estoqueDias <= 7 ? "#f59e0b" : m.estoqueDias <= 14 ? "#3b82f6" : T.green;
              return (
                <div key={m.id} style={{ background: T.white, border: `1px solid ${T.slate200}`, borderLeft: `4px solid ${m.cor}`, borderRadius: 12, padding: "16px 18px" }}>
                  <div style={{ display: "flex", gap: 14, alignItems: "flex-start" }}>
                    <div style={{ width: 50, height: 50, borderRadius: 12, background: `${m.cor}15`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 26, flexShrink: 0 }}>{m.icone}</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4, flexWrap: "wrap" }}>
                        <span style={{ fontWeight: 800, fontSize: 16, color: T.slate800 }}>{m.nome} {m.dosagem}</span>
                        {m.generico && <span style={{ background: "#dcfce7", color: "#166534", fontSize: 9, fontWeight: 800, padding: "2px 7px", borderRadius: 8 }}>GENÉRICO</span>}
                        {m.tipo === "tratamento" && <span style={{ background: "#fef3c7", color: "#92400e", fontSize: 9, fontWeight: 800, padding: "2px 7px", borderRadius: 8 }}>TEMPORÁRIO · {m.diasRestantes} dias</span>}
                      </div>
                      <div style={{ fontSize: 12, color: T.slate600, marginBottom: 4 }}>{m.posologia} · {m.fabricante}</div>
                      <div style={{ fontSize: 11, color: T.slate400 }}>📋 Receita: {m.receita}</div>
                      {m.cid && <div style={{ fontSize: 11, color: T.slate400, marginTop: 2 }}>🏷️ {m.cid}</div>}
                    </div>
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginTop: 12, paddingTop: 12, borderTop: `1px solid ${T.slate100}` }}>
                    <div>
                      <div style={{ fontSize: 10, color: T.slate400, fontWeight: 700, marginBottom: 2 }}>PRÓXIMA DOSE</div>
                      <div style={{ fontSize: 12, fontWeight: 700, color: T.slate800 }}>⏰ {m.proxDose}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: 10, color: T.slate400, fontWeight: 700, marginBottom: 2 }}>ESTOQUE</div>
                      <div style={{ fontSize: 12, fontWeight: 700, color: corEstoque }}>📦 {m.estoque} unid · {m.estoqueDias}d</div>
                    </div>
                    <div>
                      <div style={{ fontSize: 10, color: T.slate400, fontWeight: 700, marginBottom: 2 }}>ADESÃO</div>
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <div style={{ flex: 1, height: 6, background: T.slate100, borderRadius: 3, overflow: "hidden" }}>
                          <div style={{ width: `${m.aderencia}%`, height: "100%", background: m.aderencia >= 90 ? T.green : "#f59e0b", borderRadius: 3 }} />
                        </div>
                        <span style={{ fontSize: 11, fontWeight: 700, color: m.aderencia >= 90 ? T.green : "#f59e0b" }}>{m.aderencia}%</span>
                      </div>
                    </div>
                  </div>

                  {m.estoqueDias <= 14 && (
                    <Btn variant="primary" small style={{ width: "100%", marginTop: 10 }} onClick={() => setAba("comparar")}>
                      🛒 Comprar mais
                    </Btn>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* COMPARAR PREÇOS */}
      {aba === "comparar" && (
        <div>
          <div style={{ background: `linear-gradient(135deg, ${T.teal}15, ${T.teal}05)`, border: `1px solid ${T.teal}40`, borderRadius: 14, padding: "14px 18px", marginBottom: 16, display: "flex", gap: 12, alignItems: "center" }}>
            <span style={{ fontSize: 28 }}>🔍</span>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 800, color: T.teal, fontSize: 14 }}>Comparando preços para sua receita</div>
              <div style={{ fontSize: 11, color: T.slate600, marginTop: 2 }}>Losartana 50mg (60 comp) + Vitamina D 2000UI (30 comp)</div>
            </div>
            <span style={{ background: T.teal, color: "white", fontSize: 11, fontWeight: 800, padding: "4px 12px", borderRadius: 20 }}>4 farmácias</span>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {[...FARMACIAS].sort((a, b) => a.final - b.final).map((f, i) => (
              <div key={f.id} style={{ background: T.white, border: i === 0 ? `2px solid ${T.teal}` : `1px solid ${T.slate200}`, borderRadius: 14, padding: "16px 18px", position: "relative" }}>
                {i === 0 && (
                  <span style={{ position: "absolute", top: -10, left: 16, background: T.teal, color: "white", fontSize: 10, fontWeight: 800, padding: "3px 10px", borderRadius: 10 }}>🏆 MELHOR PREÇO</span>
                )}
                <div style={{ display: "flex", gap: 14, alignItems: "flex-start" }}>
                  <div style={{ width: 50, height: 50, borderRadius: 12, background: `${f.cor}15`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 26, flexShrink: 0 }}>{f.icone}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4, flexWrap: "wrap" }}>
                      <span style={{ fontWeight: 800, fontSize: 15, color: T.slate800 }}>{f.nome}</span>
                      {f.aberto24h && <span style={{ background: "#dcfce7", color: "#166534", fontSize: 9, fontWeight: 800, padding: "2px 7px", borderRadius: 8 }}>24H</span>}
                      <span style={{ display: "flex", alignItems: "center", gap: 2, fontSize: 11, color: "#f59e0b", fontWeight: 700 }}>⭐ {f.rating}</span>
                    </div>
                    <div style={{ fontSize: 11, color: T.slate600 }}>📍 {f.endereco}</div>
                    <div style={{ display: "flex", gap: 12, marginTop: 6, flexWrap: "wrap" }}>
                      <span style={{ fontSize: 11, color: T.slate600 }}>🚶 {f.distancia}</span>
                      <span style={{ fontSize: 11, color: T.slate600 }}>🕐 {f.horario}</span>
                      <span style={{ fontSize: 11, color: T.slate600 }}>🚚 {f.tempoEntrega} ({f.taxaEntrega})</span>
                    </div>
                    {f.convenios.length > 0 && (
                      <div style={{ display: "flex", gap: 4, marginTop: 6, flexWrap: "wrap" }}>
                        {f.convenios.slice(0, 2).map((c) => (
                          <span key={c} style={{ background: T.slate100, color: T.slate600, fontSize: 9, fontWeight: 700, padding: "2px 7px", borderRadius: 8 }}>{c}</span>
                        ))}
                        {f.convenios.length > 2 && <span style={{ fontSize: 9, color: T.slate400, fontWeight: 700 }}>+{f.convenios.length - 2}</span>}
                      </div>
                    )}
                  </div>
                </div>

                <div style={{ marginTop: 12, paddingTop: 12, borderTop: `1px solid ${T.slate100}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <div style={{ fontSize: 11, color: T.slate400, textDecoration: "line-through" }}>R$ {f.total.toFixed(2).replace(".", ",")}</div>
                    <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
                      <span style={{ fontSize: 22, fontWeight: 900, color: i === 0 ? T.teal : T.slate800 }}>R$ {f.final.toFixed(2).replace(".", ",")}</span>
                      <span style={{ fontSize: 11, color: T.green, fontWeight: 700 }}>−R$ {f.desconto.toFixed(2).replace(".", ",")}</span>
                    </div>
                  </div>
                  <Btn variant={i === 0 ? "primary" : "secondary"} onClick={() => { setFarmaciaSel(f); setModalCompra(true); setEtapaCompra(1); }}>
                    Comprar
                  </Btn>
                </div>
              </div>
            ))}
          </div>

          <div style={{ marginTop: 16, padding: "12px 16px", background: `${T.teal}10`, border: `1px solid ${T.teal}30`, borderRadius: 10, fontSize: 11, color: T.slate600, display: "flex", gap: 10 }}>
            <span style={{ fontSize: 16 }}>💡</span>
            <div>
              <strong>Programas de medicamentos:</strong> Pacientes com hipertensão e diabetes podem economizar até 80% via Programa Farmácia Popular ou programas das próprias redes. O Meu Prontuário aplica automaticamente os descontos disponíveis.
            </div>
          </div>
        </div>
      )}

      {/* PEDIDOS */}
      {aba === "pedidos" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {PEDIDOS_RECENTES.map((p) => (
            <div key={p.id} style={{ background: T.white, border: `1px solid ${T.slate200}`, borderLeft: `4px solid ${p.statusCor}`, borderRadius: 12, padding: "14px 18px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 3 }}>
                    <span style={{ fontWeight: 800, fontSize: 14, color: T.slate800 }}>{p.farmacia}</span>
                    <span style={{ background: `${p.statusCor}20`, color: p.statusCor, fontSize: 10, fontWeight: 800, padding: "2px 10px", borderRadius: 12 }}>{p.icone} {p.status.toUpperCase()}</span>
                  </div>
                  <div style={{ fontSize: 11, color: T.slate400 }}>📅 {p.data} · Pedido #{p.id.toString().padStart(6, "0")}</div>
                </div>
                <div style={{ fontSize: 16, fontWeight: 800, color: T.slate800 }}>R$ {p.total.toFixed(2).replace(".", ",")}</div>
              </div>

              <div style={{ background: T.slate50, borderRadius: 8, padding: "8px 12px", marginTop: 8 }}>
                {p.medicamentos.map((m, i) => (
                  <div key={i} style={{ fontSize: 12, color: T.slate700, padding: "2px 0" }}>💊 {m}</div>
                ))}
              </div>

              {p.rastreio && (
                <div style={{ marginTop: 10, background: `${T.blue}10`, border: `1px solid ${T.blue}30`, borderRadius: 8, padding: "10px 14px", display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{ fontSize: 18 }}>🚚</span>
                  <div style={{ flex: 1, fontSize: 12, color: T.slate700, fontWeight: 600 }}>{p.rastreio}</div>
                  <button style={{ background: T.blue, color: "white", border: "none", borderRadius: 8, padding: "5px 12px", fontSize: 11, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>Rastrear</button>
                </div>
              )}

              {p.status === "Entregue" && (
                <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                  <Btn variant="secondary" small style={{ flex: 1 }}>📄 Nota Fiscal</Btn>
                  <Btn variant="secondary" small style={{ flex: 1 }}>🔄 Recomprar</Btn>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* ADESÃO */}
      {aba === "aderencia" && (
        <div>
          <div style={{ background: "linear-gradient(135deg, #064e3b 0%, #047857 100%)", borderRadius: 16, padding: "20px 24px", marginBottom: 18, color: "white" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 12 }}>
              <div style={{ position: "relative", width: 90, height: 90 }}>
                <svg width="90" height="90">
                  <circle cx="45" cy="45" r="38" fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="8" />
                  <circle cx="45" cy="45" r="38" fill="none" stroke={T.mint} strokeWidth="8"
                    strokeDasharray={2 * Math.PI * 38}
                    strokeDashoffset={2 * Math.PI * 38 * (1 - aderenciaMedia / 100)}
                    strokeLinecap="round"
                    transform="rotate(-90 45 45)" />
                </svg>
                <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
                  <div style={{ fontSize: 24, fontWeight: 900 }}>{aderenciaMedia}%</div>
                  <div style={{ fontSize: 9, color: T.mint }}>ADESÃO</div>
                </div>
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 800, fontSize: 17 }}>Excelente adesão! 🎉</div>
                <div style={{ fontSize: 12, color: T.mint, marginTop: 4, lineHeight: 1.5 }}>
                  Você tem seguido o tratamento conforme prescrito. Isso reduz em 60% o risco de complicações da hipertensão e melhora os resultados clínicos.
                </div>
              </div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8 }}>
              {[
                { l: "ÚLTIMA DOSE", v: "Hoje, 07:00" },
                { l: "DIAS CONSECUTIVOS", v: "47 dias" },
                { l: "PRÓX. CONSULTA", v: "12/05/2026" },
              ].map((c) => (
                <div key={c.l} style={{ background: "rgba(255,255,255,0.1)", borderRadius: 8, padding: "8px 12px" }}>
                  <div style={{ color: T.mint, fontSize: 9, fontWeight: 700 }}>{c.l}</div>
                  <div style={{ color: "white", fontSize: 13, fontWeight: 800, marginTop: 2 }}>{c.v}</div>
                </div>
              ))}
            </div>
          </div>

          <div style={{ fontWeight: 800, fontSize: 13, color: T.slate800, marginBottom: 10 }}>📊 Adesão por medicamento (últimos 30 dias)</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {MEDICAMENTOS_USO.map((m) => (
              <div key={m.id} style={{ background: T.white, border: `1px solid ${T.slate200}`, borderRadius: 12, padding: "12px 16px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 13, color: T.slate800 }}>{m.nome} {m.dosagem}</div>
                    <div style={{ fontSize: 11, color: T.slate400 }}>{m.posologia}</div>
                  </div>
                  <div style={{ fontSize: 18, fontWeight: 900, color: m.aderencia >= 90 ? T.green : "#f59e0b" }}>{m.aderencia}%</div>
                </div>
                <div style={{ height: 8, background: T.slate100, borderRadius: 4, overflow: "hidden" }}>
                  <div style={{ width: `${m.aderencia}%`, height: "100%", background: m.aderencia >= 90 ? `linear-gradient(90deg, ${T.green}, ${T.teal})` : "#f59e0b", borderRadius: 4 }} />
                </div>
              </div>
            ))}
          </div>

          <div style={{ marginTop: 16, background: T.white, border: `1px solid ${T.slate200}`, borderRadius: 12, padding: "14px 18px" }}>
            <div style={{ fontWeight: 800, fontSize: 13, color: T.slate800, marginBottom: 10 }}>⏰ Lembretes ativos</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {[
                { medic: "Losartana 50mg", hora: "07:00", canais: "🔔 Push · 📱 SMS" },
                { medic: "Vitamina D", hora: "08:00", canais: "🔔 Push" },
                { medic: "Cefalexina", hora: "06:00, 12:00, 18:00, 00:00", canais: "🔔 Push · 📱 SMS · ⌚ Apple Watch" },
              ].map((l, i) => (
                <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderBottom: i < 2 ? `1px solid ${T.slate100}` : "none" }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: T.slate800 }}>{l.medic}</div>
                    <div style={{ fontSize: 11, color: T.slate400 }}>⏰ {l.hora}</div>
                  </div>
                  <div style={{ fontSize: 10, color: T.slate600 }}>{l.canais}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* MODAL FLUXO DE COMPRA */}
      {modalCompra && farmaciaSel && (
        <div style={{ position: "fixed", inset: 0, background: "#00000060", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100, padding: 20 }}>
          <div style={{ background: T.white, borderRadius: 20, padding: 0, maxWidth: 480, width: "100%", maxHeight: "92vh", overflow: "auto" }}>
            <div style={{ background: farmaciaSel.cor, padding: "16px 22px", color: "white", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                <span style={{ fontSize: 28 }}>{farmaciaSel.icone}</span>
                <div>
                  <div style={{ fontSize: 10, opacity: 0.85, fontWeight: 700 }}>COMPRA · ETAPA {etapaCompra}/3</div>
                  <div style={{ fontWeight: 800, fontSize: 16 }}>{farmaciaSel.nome}</div>
                </div>
              </div>
              <button onClick={fecharModal} style={{ background: "rgba(255,255,255,0.2)", border: "none", borderRadius: 8, width: 32, height: 32, cursor: "pointer", color: "white", fontSize: 16 }}>✕</button>
            </div>

            <div style={{ display: "flex", gap: 4, padding: "12px 22px", background: T.slate50 }}>
              {[1, 2, 3].map((n) => (
                <div key={n} style={{ flex: 1, height: 4, borderRadius: 2, background: n <= etapaCompra ? farmaciaSel.cor : T.slate200 }} />
              ))}
            </div>

            <div style={{ padding: "20px 24px" }}>
              {etapaCompra === 1 && (
                <>
                  <div style={{ fontWeight: 800, fontSize: 16, color: T.slate800, marginBottom: 14 }}>📋 Confira sua receita</div>
                  <div style={{ background: T.slate50, borderRadius: 10, padding: 14, marginBottom: 14 }}>
                    <div style={{ fontSize: 11, color: T.slate400, fontWeight: 700, marginBottom: 6 }}>RECEITA · Dr. Carlos Mendes · 12/04/2025 · 🔏 ICP-Brasil</div>
                    {[
                      { nome: "Losartana 50mg", qtd: "60 comprimidos", preco: 38.5 },
                      { nome: "Vitamina D 2000UI", qtd: "30 comprimidos", preco: 104.0 },
                    ].map((m, i) => (
                      <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: i === 0 ? `1px solid ${T.slate200}` : "none" }}>
                        <div>
                          <div style={{ fontSize: 13, fontWeight: 700, color: T.slate800 }}>{m.nome}</div>
                          <div style={{ fontSize: 11, color: T.slate400 }}>{m.qtd}</div>
                        </div>
                        <div style={{ fontSize: 13, fontWeight: 700, color: T.slate800 }}>R$ {m.preco.toFixed(2).replace(".", ",")}</div>
                      </div>
                    ))}
                  </div>

                  <div style={{ marginBottom: 14 }}>
                    <div style={{ fontSize: 11, color: T.slate400, fontWeight: 700, marginBottom: 8 }}>FORMA DE RECEBIMENTO</div>
                    <div style={{ display: "flex", gap: 8 }}>
                      {[
                        { id: "entrega", l: "🚚 Entrega", desc: farmaciaSel.tempoEntrega, taxa: farmaciaSel.taxaEntrega },
                        { id: "retirar", l: "🏪 Retirar", desc: "Pronto em 15 min", taxa: "Grátis" },
                      ].map((t) => (
                        <button key={t.id} onClick={() => setTipoEntrega(t.id)} style={{
                          flex: 1, padding: "12px 10px", border: tipoEntrega === t.id ? `2px solid ${farmaciaSel.cor}` : `1px solid ${T.slate200}`,
                          background: tipoEntrega === t.id ? `${farmaciaSel.cor}10` : T.white, borderRadius: 10, cursor: "pointer", textAlign: "center", fontFamily: "inherit"
                        }}>
                          <div style={{ fontSize: 13, fontWeight: 700, color: T.slate800 }}>{t.l}</div>
                          <div style={{ fontSize: 10, color: T.slate400, marginTop: 2 }}>{t.desc}</div>
                          <div style={{ fontSize: 11, color: tipoEntrega === t.id ? farmaciaSel.cor : T.slate600, fontWeight: 800, marginTop: 4 }}>{t.taxa}</div>
                        </button>
                      ))}
                    </div>
                  </div>

                  <Btn variant="primary" style={{ width: "100%" }} onClick={() => setEtapaCompra(2)}>Continuar →</Btn>
                </>
              )}

              {etapaCompra === 2 && (
                <>
                  <div style={{ fontWeight: 800, fontSize: 16, color: T.slate800, marginBottom: 14 }}>💳 Pagamento</div>

                  <div style={{ background: T.slate50, borderRadius: 10, padding: 14, marginBottom: 14 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", padding: "4px 0", fontSize: 12, color: T.slate600 }}>
                      <span>Subtotal</span><span>R$ {farmaciaSel.total.toFixed(2).replace(".", ",")}</span>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", padding: "4px 0", fontSize: 12, color: T.green, fontWeight: 700 }}>
                      <span>Desconto Programa Vida</span><span>−R$ {farmaciaSel.desconto.toFixed(2).replace(".", ",")}</span>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", padding: "4px 0", fontSize: 12, color: T.slate600 }}>
                      <span>{tipoEntrega === "entrega" ? "Entrega" : "Retirar na loja"}</span><span>{tipoEntrega === "entrega" ? farmaciaSel.taxaEntrega : "Grátis"}</span>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", padding: "10px 0 0", fontSize: 16, fontWeight: 900, color: T.slate800, borderTop: `1px solid ${T.slate200}`, marginTop: 6 }}>
                      <span>Total</span><span>R$ {farmaciaSel.final.toFixed(2).replace(".", ",")}</span>
                    </div>
                  </div>

                  <div style={{ fontSize: 11, color: T.slate400, fontWeight: 700, marginBottom: 8 }}>FORMA DE PAGAMENTO</div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 14 }}>
                    {[
                      { id: 1, l: "💳 Cartão de crédito •••• 4521", sub: "Visa · Vencimento 12/27", check: true },
                      { id: 2, l: "📱 Pix", sub: "Aprovação imediata", check: false },
                      { id: 3, l: "🏥 Convênio Bradesco Saúde", sub: "Cobertura parcial · 80%", check: false },
                    ].map((m) => (
                      <div key={m.id} style={{
                        background: m.check ? `${farmaciaSel.cor}10` : T.white, border: m.check ? `2px solid ${farmaciaSel.cor}` : `1px solid ${T.slate200}`,
                        borderRadius: 10, padding: "12px 14px", display: "flex", alignItems: "center", gap: 10, cursor: "pointer"
                      }}>
                        <div style={{ width: 18, height: 18, borderRadius: "50%", border: `2px solid ${m.check ? farmaciaSel.cor : T.slate300}`, background: m.check ? farmaciaSel.cor : T.white, display: "flex", alignItems: "center", justifyContent: "center" }}>
                          {m.check && <div style={{ width: 8, height: 8, borderRadius: "50%", background: "white" }} />}
                        </div>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 13, fontWeight: 700, color: T.slate800 }}>{m.l}</div>
                          <div style={{ fontSize: 11, color: T.slate400 }}>{m.sub}</div>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div style={{ display: "flex", gap: 8 }}>
                    <Btn variant="secondary" style={{ flex: 1 }} onClick={() => setEtapaCompra(1)}>← Voltar</Btn>
                    <Btn variant="primary" style={{ flex: 2 }} onClick={confirmarCompra}>Confirmar pedido</Btn>
                  </div>
                </>
              )}

              {etapaCompra === 3 && (
                <div style={{ textAlign: "center", padding: "10px 0" }}>
                  <div style={{ width: 80, height: 80, margin: "0 auto 16px", borderRadius: "50%", background: `${T.green}20`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 44 }}>✓</div>
                  <div style={{ fontWeight: 900, fontSize: 22, color: T.slate800 }}>Pedido confirmado!</div>
                  <div style={{ fontSize: 13, color: T.slate600, marginTop: 6, lineHeight: 1.5 }}>
                    Pedido #287429 enviado para a {farmaciaSel.nome}.<br />
                    {tipoEntrega === "entrega" ? `Previsão de entrega: ${farmaciaSel.tempoEntrega}` : "Pronto para retirada em 15 minutos"}
                  </div>

                  <div style={{ background: T.slate50, borderRadius: 12, padding: 16, marginTop: 18, textAlign: "left" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                      <span style={{ fontSize: 11, color: T.slate400, fontWeight: 700 }}>VALOR PAGO</span>
                      <span style={{ fontSize: 14, fontWeight: 900, color: T.slate800 }}>R$ {farmaciaSel.final.toFixed(2).replace(".", ",")}</span>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                      <span style={{ fontSize: 11, color: T.slate400, fontWeight: 700 }}>NOTA FISCAL</span>
                      <span style={{ fontSize: 12, color: T.teal, fontWeight: 700, cursor: "pointer" }}>📄 Baixar</span>
                    </div>
                  </div>

                  <div style={{ background: `${T.teal}10`, border: `1px solid ${T.teal}30`, borderRadius: 10, padding: "10px 14px", marginTop: 14, fontSize: 11, color: T.slate600, textAlign: "left" }}>
                    💡 Adicionamos lembretes automáticos para os horários das doses. Você pode ajustar em &quot;Adesão&quot;.
                  </div>

                  <div style={{ display: "flex", gap: 8, marginTop: 18 }}>
                    <Btn variant="secondary" style={{ flex: 1 }} onClick={fecharModal}>Fechar</Btn>
                    <Btn variant="primary" style={{ flex: 1 }}>📦 Acompanhar</Btn>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── APP / SHELL DO PRONTUÁRIO ─────────────────────────────────── */
export default function DemoProntuarioPage() {
  return (
    <div style={{ fontFamily: "'Inter', 'DM Sans', 'Segoe UI', sans-serif", minHeight: "100vh", background: "linear-gradient(180deg, #f8fafc 0%, #ecfdf5 100%)" }}>
      {/* Banner de demonstração */}
      <div style={{ background: "#fffbeb", borderBottom: "1px solid #fde68a", color: "#92400e", fontSize: 12, fontWeight: 600, textAlign: "center", padding: "8px 16px" }}>
        🧪 Demonstração — visão do paciente (mockup, dados fictícios e não conectados ao backend)
      </div>

      {/* HEADER */}
      <header style={{
        background: `linear-gradient(135deg, ${T.green900} 0%, ${T.green800} 60%, ${T.green700} 100%)`,
        padding: "0 24px", display: "flex", alignItems: "center", justifyContent: "space-between",
        height: 72, boxShadow: "0 4px 20px rgba(6, 78, 59, 0.25)", position: "sticky", top: 0, zIndex: 50,
        borderBottom: `1px solid ${T.green700}`,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{ width: 42, height: 42, borderRadius: 11, background: "rgba(255,255,255,0.95)", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 2px 8px rgba(0,0,0,0.15)" }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <rect x="9" y="3" width="6" height="18" rx="1.5" fill={T.green700} />
              <rect x="3" y="9" width="18" height="6" rx="1.5" fill={T.green700} />
              <circle cx="12" cy="12" r="2.5" fill="white" />
            </svg>
          </div>
          <div>
            <div style={{ color: "white", fontWeight: 800, fontSize: 18, letterSpacing: "-0.4px", lineHeight: 1.1 }}>Meu Prontuário</div>
            <div style={{ color: T.mint, fontSize: 11, fontWeight: 500, marginTop: 2, letterSpacing: 0.3 }}>Sua saúde, em um só lugar</div>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10, paddingLeft: 12 }}>
          <div style={{ textAlign: "right" }}>
            <div style={{ color: T.mint, fontSize: 10, fontWeight: 500 }}>Olá,</div>
            <div style={{ color: "white", fontSize: 13, fontWeight: 700 }}>Maria Fernanda</div>
          </div>
          <div style={{ width: 38, height: 38, borderRadius: "50%", background: "linear-gradient(135deg, #ffffff 0%, #ecfdf5 100%)", color: T.green800, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 14, boxShadow: "0 2px 8px rgba(0,0,0,0.15)", border: "2px solid rgba(255,255,255,0.4)" }}>MF</div>
        </div>
      </header>

      {/* NAV de contexto (Farmácia é a aba ativa da demo) */}
      <nav style={{ background: T.white, borderBottom: `1px solid ${T.slate200}`, padding: "0 24px", display: "flex", gap: 4, overflowX: "auto", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
        {[
          { id: "consultas", label: "Consultas", on: false },
          { id: "exames", label: "Exames", on: false },
          { id: "farmacia", label: "Farmácia", on: true },
          { id: "saude", label: "Saúde Conectada", on: false },
        ].map((item) => (
          <div key={item.id} style={{
            padding: "14px 14px", fontWeight: item.on ? 800 : 600,
            color: item.on ? T.green800 : T.slate400,
            background: item.on ? T.green50 : "transparent",
            borderBottom: item.on ? `3px solid ${T.green700}` : "3px solid transparent",
            fontSize: 12.5, whiteSpace: "nowrap",
          }}>{item.label}{!item.on && <span style={{ fontSize: 9, marginLeft: 5, color: T.slate300 }}>em breve</span>}</div>
        ))}
      </nav>

      <main style={{ padding: "24px", maxWidth: 920, margin: "0 auto" }}>
        {/* Perfil do paciente */}
        <div style={{ background: `linear-gradient(135deg, ${T.navy}08, ${T.blue}08)`, border: `1px solid ${T.blue}20`, borderRadius: 14, padding: "16px 20px", marginBottom: 18, display: "flex", gap: 14, alignItems: "center" }}>
          <Avatar iniciais={PACIENTE.iniciais} size={48} bg={T.blue} />
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 800, fontSize: 16, color: T.slate800 }}>{PACIENTE.nome}</div>
            <div style={{ fontSize: 12, color: T.slate400, marginTop: 2 }}>Nascimento: {PACIENTE.nascimento} · {PACIENTE.plano}</div>
            <div style={{ display: "flex", gap: 6, marginTop: 6, flexWrap: "wrap" }}>
              <span style={{ background: "#fee2e2", color: "#b91c1c", fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 12 }}>🩸 {PACIENTE.sangue}</span>
              {PACIENTE.alergias.map((a) => <span key={a} style={{ background: "#fef9c3", color: "#a16207", fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 12 }}>⚠️ {a}</span>)}
            </div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 11, color: T.slate400 }}>CPF</div>
            <div style={{ fontWeight: 700, fontSize: 13, color: T.slate800 }}>{PACIENTE.cpf}</div>
          </div>
        </div>

        {/* Título da seção */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
          <span style={{ fontSize: 20 }}>💊</span>
          <div style={{ fontWeight: 800, fontSize: 18, color: T.slate800 }}>Farmácia</div>
        </div>
        <div style={{ fontSize: 13, color: T.slate400, marginBottom: 20 }}>
          A partir da prescrição do prontuário, o paciente recebe a indicação de farmácias, compara preços, escolhe entrega ou retirada e acompanha a adesão ao tratamento.
        </div>

        <PainelFarmacia />
      </main>
    </div>
  );
}
