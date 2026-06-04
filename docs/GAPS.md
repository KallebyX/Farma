# Gaps da Plataforma Farma — auditoria

> Levantamento de tudo que ainda falta para "100% em produção", por categoria, com
> prioridade (P0 crítico → P3 futuro), esforço e responsável (eu via código/MCP, ou você).
> Data: 2026-06-04.

## A. Configuração pendente (P0 — destrava recurso já pronto; eu ativo via MCP)
| # | Gap | Estado | Ação |
|---|-----|--------|------|
| A1 | **Upload de exames/receitas** (Supabase Storage) | Código pronto + bucket criado; falta a `service_role key` | Você me passa a key → gravo em `IntegrationConfig` via MCP |
| A2 | **E-mail (convites, etc.)** via Resend | Código lê DB/env; Resend em modo teste (só envia p/ você) | Verificar domínio no Resend + me passar `resendApiKey`/`emailFrom` |
| A3 | **WhatsApp não-OTP** (lembrete, retorno, boas-vindas, convite) | Disparo via Twilio pronto; só o template **OTP** aprovado | Aprovar templates **Utility** na WABA → me passar os `HX…` |

## B. Funcionalidades incompletas / stub (P1 — código existe mas não faz o real)
| # | Gap | Onde | Observação |
|---|-----|------|-----------|
| B1 | **VigiMed**: submissão é **placeholder** (gera protocolo fake) | `app/api/ram/[id]/review/route.ts` | Não há API pública oficial do VigiMed; hoje registra "encaminhado" + protocolo gerado. Integrar quando houver credencial/endpoint (e-Notivisa). |
| B2 | **Comissão de afiliado**: registrada (`commissionCents`, status CONFIRMED) mas **sem repasse financeiro** | `lib/affiliate/service.ts` | Falta liquidação (ex.: Stripe Connect) e conciliação. É só contábil hoje. |
| B3 | **SNGPC / Dispensação de controlados**: modelos existem (`Dispensation`, `SngpcStatus`) mas sem submissão real à Anvisa | `prisma/schema.prisma` | Escriturar/transmitir SNGPC exige integração regulatória dedicada. |
| B4 | **ICP-Brasil**: detecta assinatura na receita; validação completa da cadeia/CRL a confirmar | `lib/icp-brasil.ts` | Verificar profundidade da validação (revogação, âncora ICP). |

## C. Produto / roadmap (P2 — peças grandes do PRD ainda não construídas)
| # | Gap | Observação |
|---|-----|-----------|
| C1 | **Apps nativos** iOS (Swift) / Android (Kotlin) | Repos próprios consumindo `/api/v1` (PRD). A API base e os models já existem. |
| C2 | **Login social (Apple/Google)** | Necessário p/ App Store; só OTP hoje. Models (`appleSub`/`googleSub`) já no schema. |
| C3 | **Push (APNs/FCM)** | `PatientDevice` já existe; falta serviço de envio + cron. |
| C4 | **Unificação multi-farmácia (cutover)** | Conta global + troca de contexto no app/auth. Models + backfill + sync já feitos; falta o cutover de leitura/auth. |
| C5 | **Demo guiado Farma→Meu Prontuário** | Hoje `/demo/prontuario` abre o hub real; falta o tour guiado começando no Farma. |
| C6 | **Refresh tokens / logout real do paciente** | `PatientRefreshToken` existe; auth do paciente ainda é token HMAC de 90d. |
| C7 | **Comparador de preços com scraping real** | Hoje compara `PharmacyProduct` cadastrado; scraping de farmácias externas é roadmap. |

## D. Qualidade / hardening (P2–P3)
| # | Gap | Observação |
|---|-----|-----------|
| D1 | **RLS nas novas tabelas de identidade** | `PatientAccount/Link/Device/RefreshToken` criadas via db push; sem policy (deny-all p/ anon, acessadas via service role). Adicionar policies por consistência. |
| D2 | **Cobertura de testes** | ~22 libs / 23 testes. Faltam testes p/ rx, exams, appointments, patient-pharmacies, demo. |
| D3 | **Performance (advisors)** | Índices "unused" (falso-positivo de base nova) e estratégia de conexões do Auth (percentual) — revisar com tráfego real. |
| D4 | **Monetização das farmácias** (assinatura/billing) | Sem cobrança das farmácias (Stripe). Modelo de receita a definir. |
| D5 | **Reset periódico do tenant demo** | O paciente demo é mutável por visitantes; cron de reset deixaria a demo sempre limpa. |

## E. Já entregue nesta fase (referência)
OTP WhatsApp; Meu Prontuário (perfil, multi-farmácia/ranking, QR Safari, exames, receitas, RAM, mensagens, nota premiada, comparador, indicação, gamificação); demo = hub real; API `/api/v1` + models de conta global/M2M (+ backfill/sync); RLS otimizada + índices de FK; StatusCallback de entrega; automação de lembrete de consulta; config por MCP (WhatsApp/Storage/Email) com hardening anti-SSRF; service worker corrigido; landing melhorada e sem travessões.

---

### Prioridade sugerida
1. **A1–A3** (você + eu): destrava exames, e-mail e disparos WhatsApp — valor imediato, baixo esforço.
2. **B2 + D4** (Stripe Connect): repasse de comissão de afiliado + billing das farmácias — habilita receita.
3. **C4** (cutover multi-farmácia) e **C1–C3** (apps nativos + social + push): a fase mobile do PRD.
4. **B1/B3/B4** (VigiMed/SNGPC/ICP): integrações regulatórias, conforme credenciais.
