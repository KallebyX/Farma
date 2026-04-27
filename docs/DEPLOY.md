# Deploy — Vercel + Supabase + Resend + Z-API

Runbook completo para colocar a plataforma Farma em produção. Tempo total estimado: **30-45 minutos** se for a primeira vez. Reexecuções: 5 minutos.

---

## Pré-requisitos

Você vai precisar de contas em:

- [Vercel](https://vercel.com) — hospedagem (free tier suficiente para piloto)
- [Supabase](https://supabase.com) — PostgreSQL gerenciado (free tier 500MB)
- [Resend](https://resend.com) — email transacional (free tier 3.000 emails/mês)
- [Z-API](https://z-api.io) — WhatsApp Business API (~R$ 90/mês — opcional para v1)
- (Opcional) [Upstash](https://upstash.com) — Redis serverless para rate limit

---

## 1. Provisionar Supabase (5 min)

1. Acesse https://supabase.com → **New project** → escolha região **South America (São Paulo)** (LGPD)
2. Anote a **Database password**. Você vai precisar dela.
3. Aguarde provisionamento (~2 min)
4. Em **Project Settings → Database**, copie:
   - **Connection string · URI · Transaction mode** → vai virar `DATABASE_URL` (usa pgbouncer pooler na 6543)
   - **Connection string · URI · Session mode** → vai virar `DIRECT_URL` (usa porta 5432, necessário para `prisma migrate`)
5. Substitua `[YOUR-PASSWORD]` pela senha anotada
6. Adicione `?pgbouncer=true&connection_limit=1` ao final do `DATABASE_URL`

Exemplo:
```
DATABASE_URL=postgresql://postgres.xyz:senha@aws-0-sa-east-1.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1
DIRECT_URL=postgresql://postgres.xyz:senha@aws-0-sa-east-1.pooler.supabase.com:5432/postgres
```

---

## 2. Aplicar schema + seed (3 min)

Local, com as URLs acima exportadas:

```bash
export DATABASE_URL=...
export DIRECT_URL=...
pnpm install
pnpm prisma migrate deploy   # aplica migrations no Supabase
pnpm prisma db seed          # cria farmácia demo + owner@demo.farma / admin123 + 12 medicamentos
```

> **IMPORTANT:** Em produção, troque a senha do owner demo imediatamente (ou apague e recadastre).

---

## 3. Configurar Resend (5 min)

1. https://resend.com → **API Keys → Create**
2. Copie o token → vai virar `RESEND_API_KEY`
3. Em **Domains**, adicione seu domínio e configure SPF/DKIM. Para piloto inicial, pode usar `onboarding@resend.dev` para testar (não use em produção).
4. Defina `EMAIL_FROM=Farma <no-reply@seudominio.com>`

---

## 4. Provisionar Z-API (10 min) — opcional para piloto

Se ainda não vai usar WhatsApp real, **pule esta seção**. O bot funciona em modo mock (logs no stdout/Vercel logs) sem credenciais.

1. https://z-api.io → criar instância nova
2. Conectar com WhatsApp Business via QR code
3. Em **Configurações da instância**, copie:
   - `WHATSAPP_INSTANCE_ID`
   - `WHATSAPP_API_KEY`
4. Em **Webhooks**, configure:
   - URL: `https://SEU-DOMINIO.vercel.app/api/whatsapp/webhook`
   - Eventos: **Mensagem recebida**, **Status de mensagem**
5. Defina `WHATSAPP_WEBHOOK_SECRET=<algo-aleatorio>` e mande a Z-API enviar esse valor no header `x-webhook-secret`

---

## 5. Deploy no Vercel (10 min)

1. https://vercel.com → **New project** → import o repositório do GitHub
2. **Framework**: Next.js (detectado automaticamente)
3. **Build command**: `pnpm build` (default ok)
4. **Environment variables**: cole todas as variáveis abaixo. Use o checklist ao final.
5. **Deploy**

### Configurar Vercel Cron

O `vercel.json` já tem dois jobs configurados:

```json
{
  "crons": [
    { "path": "/api/cron/expire-invitations",   "schedule": "0 3 * * *"   },
    { "path": "/api/cron/dispatch-reminders",   "schedule": "*/5 * * * *" }
  ]
}
```

Eles ativam automaticamente no primeiro deploy. **Confirme em Project → Cron Jobs.**

### Custom domain

Em **Settings → Domains**, adicione seu domínio. Atualize:
- `NEXTAUTH_URL` para o domínio final
- `APP_URL` para o domínio final

Redeploy depois de mudar essas envs.

---

## 6. Smoke test em produção (5 min)

Login em `https://seu-dominio/sign-in` com `owner@demo.farma / admin123` (e troque a senha em seguida).

### Convite de equipe
1. `/settings/team` → Convidar membro com seu email pessoal
2. Verifique o email no Resend dashboard (ou na sua inbox)
3. Abra o link em janela anônima → aceitar termos → criar senha
4. Confirme que vira ATTENDANT no painel

### Cadastro de paciente + lembrete
1. `/patients/new` → cadastre você mesmo com seu telefone real
2. **Recebeu mensagem de consentimento no WhatsApp?** Confirme com "Sim, aceito"
3. `/patients/[seu-id]` → Adicionar medicamento → Losartana 50mg, intervalo 1h, 1 cp
4. Aguarde até 5 min (próximo cron) ou trigger manual:
   ```bash
   curl -H "Authorization: Bearer $CRON_SECRET" https://seu-dominio/api/cron/dispatch-reminders
   ```
5. Você deve receber a mensagem de lembrete. Clique "✅ Tomei". Verifique em `/patients/[seu-id]` que a adesão subiu.

### RAM
1. No WhatsApp do paciente, mande `/reacao`
2. Selecione gravidade
3. Volte ao painel `/ram` e revise o caso

---

## 7. Checklist de variáveis de ambiente

Copie isso para o Vercel **Environment Variables**:

| Variável | Obrigatório | Exemplo |
|---|---|---|
| `DATABASE_URL` | ✅ | postgres pooler (6543) |
| `DIRECT_URL` | ✅ | postgres direct (5432) |
| `NEXTAUTH_SECRET` | ✅ | `openssl rand -base64 32` |
| `NEXTAUTH_URL` | ✅ | `https://seu-dominio.com` |
| `APP_URL` | ✅ | `https://seu-dominio.com` |
| `RESEND_API_KEY` | ✅ | `re_...` |
| `EMAIL_FROM` | ✅ | `Farma <no-reply@seudominio.com>` |
| `INVITE_TTL_DAYS` | recomendado | `7` |
| `CRON_SECRET` | ✅ | `openssl rand -base64 32` |
| `WHATSAPP_API_KEY` | opcional | Z-API token (vazio = mock) |
| `WHATSAPP_INSTANCE_ID` | opcional | Z-API instance |
| `WHATSAPP_API_BASE_URL` | opcional | `https://api.z-api.io` (default) |
| `WHATSAPP_WEBHOOK_SECRET` | opcional | header check |
| `UPSTASH_REDIS_REST_URL` | opcional | rate limit (vazio = in-memory) |
| `UPSTASH_REDIS_REST_TOKEN` | opcional | rate limit |

---

## 8. Hardening pós-deploy

Antes de receber o primeiro paciente real:

- [ ] Trocar a senha do `owner@demo.farma` (ou criar OWNER novo e desativar o demo)
- [ ] Configurar custom domain em Resend e remover `onboarding@resend.dev`
- [ ] Habilitar Row-Level Security no Supabase (policies por `pharmacyId`) — backup para o isolamento que já fazemos no app
- [ ] Configurar webhooks de delivery do Resend para tracking de bounce
- [ ] Configurar alertas no Vercel para falhas em `/api/cron/*`
- [ ] Apontar GitGuardian / outro SAST para o repo
- [ ] Definir DPO da plataforma e atualizar `app/legal/privacy/page.tsx` com email real
- [ ] Configurar backup automatizado no Supabase (Project Settings → Database → Backups)
- [ ] Testar o fluxo de `/sair` (LGPD direito ao esquecimento) e validar que dado é apagado/anonimizado conforme a política

---

## 9. Troubleshooting rápido

**"P1001: Can't reach database server"** durante `prisma migrate deploy`
→ Verifique se está usando o `DIRECT_URL` (5432), não o pooler.

**Build falha com "Module not found: argon2"**
→ Já está em `serverExternalPackages` no `next.config.ts`. Se persistir, recrie o lockfile.

**Email não chega**
→ Veja Resend dashboard → Emails → ver status. Geralmente é DKIM não verificado ou domínio em sandbox.

**WhatsApp não envia**
→ Veja logs em Vercel → Functions → `/api/cron/dispatch-reminders`. Se aparecer `[wa:mock]`, é porque as credenciais Z-API estão vazias.

**Cron não dispara**
→ Vercel Cron precisa que o projeto esteja em paid plan? Não — o free tier permite até 2 cron jobs. Verifique em Project → Cron Jobs se eles estão "Enabled".

**"Sessão inválida" depois de aceitar convite**
→ `NEXTAUTH_URL` precisa bater exatamente com o domínio (com ou sem www, http vs https). Ajuste e redeploy.
