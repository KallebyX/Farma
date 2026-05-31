# Integrações — Partner API, Webhooks, Afiliados e Hub de Gamificação

Esta entrega adiciona, de forma **modular** (módulos isolados em `lib/`), três
superfícies novas, todas funcionando e2e sobre o banco real.

## Módulos
| Domínio | Código | Rotas |
|---|---|---|
| Gamificação/Loyalty | `lib/loyalty/*`, `lib/patient-token.ts` | `/hub/[token]`, `/api/loyalty/*` |
| Afiliados | `lib/affiliate/*` | `/go/[code]`, `/api/affiliate/conversion` |
| Partner API + Webhooks | `lib/partner/*`, `lib/webhooks/*` | `/api/partner/v1/*`, `/api/keys`, `/api/cron/deliver-webhooks` |

## 1. Hub de gamificação do paciente
- O paciente acessa `/hub/<token>` — `token` é um **magic link** assinado (HMAC) por paciente, gerado pela farmácia em `GET /api/patients/:id/hub-link` (envie via WhatsApp).
- Missões dão pontos; recompensas são resgatadas por pontos; tiers Bronze→Platina por pontos acumulados.
- Pontos são um **ledger append-only** (`PointsEntry`) com chave única `(reason, refType, refId)` → concessões idempotentes.

## 2. Programa de afiliados (compras com link rastreável)
- Cada parceiro (Drogasil, Pague Menos, …) tem `slug`, `baseUrl`, `commissionPct`, `pointsPerReal`.
- O hub gera um link por paciente → `/go/<code>` registra o clique e **302** para a farmácia com `utm_source/medium/campaign/content` + `mpx=<clickRef>` (estilo `fbclid`).
- A farmácia reporta a compra em `POST /api/affiliate/conversion` (API key). Idempotente em `(partner, externalOrderId)`. Credita comissão + pontos e dispara webhook `order.created`.

## 3. Partner API (a farmácia conecta o sistema dela)
Autenticação por **API key** (`Authorization: Bearer mpk_...`). A key é escopada à farmácia → isolamento de tenant automático.
- Criar key (OWNER): `POST /api/keys { name }` → retorna a chave **uma única vez**.
- `GET /api/partner/v1/patients` · `POST /api/partner/v1/patients` (upsert por telefone).
- `POST /api/affiliate/conversion` (escopo `affiliate:write`).

### Webhooks de saída
- Endpoints assinam eventos (`ram.created`, `return.due`, `order.created`, `patient.created`).
- Entrega com header `X-MP-Signature: sha256=<hmac>`; retentativas via cron `/api/cron/deliver-webhooks` (a cada 10 min).

## Modularização / repos separados
O acesso de automação está restrito a **um repositório** (`kallebyx/farma`), então
o código foi modularizado **dentro do monorepo** (fronteiras limpas por domínio),
que roda melhor em um único projeto Vercel. Para extrair em repos separados depois:
1. Mover cada `lib/<domínio>` + rotas para um pacote (`packages/loyalty`, …) ou repo.
2. Criar o projeto no Vercel apontando para o novo repo; compartilhar o mesmo Supabase (`DATABASE_URL`) e `AUTH_SECRET`.
3. Conectar Sentry (`@sentry/nextjs`) por projeto (DSN público pode ir no código/env).

## Pendências de painel (fora do meu acesso)
- **Auth secret** no Vercel para **todos os ambientes** (`AUTH_SECRET`/`NEXTAUTH_SECRET`) — senão `MissingSecret` quebra o login.
- **Deployment Protection** → "Only Preview" para liberar produção ao público.
- *(opcional)* `DATABASE_URL_APP` para ligar o RLS no banco (já validado seguro).
- *(opcional)* Sentry: `npx @sentry/wizard@latest -i nextjs` + DSN.
