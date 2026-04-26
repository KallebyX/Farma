# Farma

Plataforma de adesão a tratamento e farmacovigilância para farmácias. Esta primeira release entrega o fluxo de **convite de membros da equipe** end-to-end: criação, entrega multi-canal (email, WhatsApp, link copiável), página de aceite com termos LGPD, e gestão de pendentes (reenviar / revogar / expirar).

## Stack

- **Next.js 15** (App Router) + TypeScript + Tailwind CSS
- **PostgreSQL** via Supabase + **Prisma** ORM
- **Auth.js v5** (NextAuth) com credentials provider, senha hashada com argon2
- **Resend** para email transacional, **React Email** para templates
- **Z-API** (ou Meta Cloud API) para WhatsApp; fallback `wa.me` se não configurado
- **Upstash Redis** para rate limit; fallback in-memory para dev
- **Vitest** (unit) + **Playwright** (E2E)
- Hospedagem: **Vercel** (app) + **Supabase** (DB)

## Setup local

```bash
pnpm install
cp .env.example .env.local
# Preencha DATABASE_URL, DIRECT_URL, NEXTAUTH_SECRET (openssl rand -base64 32), RESEND_API_KEY
pnpm prisma migrate dev   # cria schema no Postgres
pnpm prisma db seed       # cria farmácia demo + OWNER (owner@demo.farma / admin123)
pnpm dev                  # http://localhost:3000
```

## Fluxo manual de validação

1. **Login** em `/sign-in` como `owner@demo.farma` / `admin123`
2. **Equipe** em `/settings/team` → clicar "Convidar membro"
3. Preencher email, papel (Atendente), marcar canais (Email + Link copiável)
4. **Confirmar entrega** — toast de sucesso, link aparece copiável; convite aparece em "Pendentes"
5. **Abrir link** em aba anônima → ver card com nome da farmácia, papel, expiração
6. Criar senha + aceitar termos → redireciona para `/dashboard` autenticado como Atendente
7. Voltar como OWNER → convite some de "Pendentes" e aparece em "Membros"

### Testes
```bash
pnpm test                 # unit tests (permissions, token, schema)
RUN_E2E=1 pnpm test:e2e   # Playwright (precisa DB seedado + dev server rodando)
```

## Arquitetura

```
app/
  sign-in/                   # login
  accept-invite/[token]/     # página de aceite (convidado)
  dashboard/                 # home pós-login
  settings/team/             # gestão de equipe (lista + modal de convite)
  api/
    auth/[...nextauth]/      # NextAuth handlers
    invitations/             # POST criar / GET listar / [id] revogar / [id]/resend
    accept-invite/[token]/   # POST aceitar
    cron/expire-invitations/ # job diário (Vercel Cron)
lib/
  auth/
    config.ts                # Auth.js setup
    permissions.ts           # canInvite, requireSession, roleLabel
  invitations/
    create.ts                # criação + dispatch
    accept.ts                # validação + transação de aceite
    deliver.ts               # roteador multi-canal
    channels/{email,whatsapp,link}.ts
    schema.ts                # Zod schemas
    token.ts                 # crypto-safe token + hash
  rate-limit.ts              # Upstash + fallback in-memory
  db.ts                      # Prisma singleton
prisma/
  schema.prisma              # User, Pharmacy, Membership, Invitation, InvitationDelivery
  seed.ts
emails/
  invite.tsx                 # React Email template
```

## Roles & permissões

| Role        | Pode convidar                  |
| ----------- | ------------------------------ |
| OWNER       | qualquer papel                 |
| PHARMACIST  | ATTENDANT, READONLY            |
| ATTENDANT   | (nenhum)                       |
| READONLY    | (nenhum)                       |

CRF é exigido pela validação Zod quando o papel convidado é PHARMACIST.

## Segurança

- Tokens de convite: 32 bytes random base64url, armazenados apenas como SHA-256 (`tokenHash`). O plain token só existe no email/WhatsApp/link mostrado uma única vez. Reenvio rotaciona o token.
- Expiração padrão: 7 dias (`INVITE_TTL_DAYS`).
- Rate limit: 5 convites por minuto por admin.
- Senha hashada com argon2id.
- Aceite registra `consentVersion` no User para auditoria LGPD.
- Cron diário marca como `EXPIRED` qualquer convite pendente vencido.

## Deploy (Vercel + Supabase)

1. Criar projeto Supabase, copiar `DATABASE_URL` (pooler com `pgbouncer=true`) e `DIRECT_URL`.
2. `pnpm prisma migrate deploy` apontando para o Supabase para aplicar o schema.
3. Push do branch → Vercel cria preview automático.
4. Configurar env vars no Vercel: `DATABASE_URL`, `DIRECT_URL`, `NEXTAUTH_SECRET`, `NEXTAUTH_URL`, `APP_URL`, `RESEND_API_KEY`, `EMAIL_FROM`, `CRON_SECRET`. WhatsApp e Upstash são opcionais.
5. (Opcional) Configurar webhook do Resend para tracking de delivery/bounce.
6. Smoke test: convide seu email pessoal a partir do owner demo, abra o link em janela anônima, aceite e verifique o redirecionamento para o dashboard.

## Fora de escopo (v1.1+)

- 2FA / SSO Google/Microsoft
- Convite em lote por CSV
- Aceite via WhatsApp inline (sem abrir browser)
- Custom roles além das 4 fixas
- Audit log com UI
