# PRD — Plataforma Farma (visão completa E2E)

> Documento de produto vivo. Define a visão, o inventário de funcionalidades com
> **status real**, a auditoria de lacunas e o roadmap em fases até a plataforma
> 100% funcional ponta-a-ponta (farmácia + paciente + mobile).

## 1. Visão

Farma é a plataforma que fecha o ciclo do paciente para a farmácia:
**adesão ao tratamento → farmacovigilância → retorno/recompra → fidelização**,
com um app do paciente ("Meu Prontuário") que conecta wearables, exames e
recompensas. Multiloja (multitenant), LGPD-first, integrável (API + webhooks).

## 2. Personas

| Persona | Necessidade | Superfície |
|---|---|---|
| Farmacêutico/equipe | Gerir pacientes, RAM, retornos, engajamento | Painel web (`/dashboard`, `(app)/*`) |
| Proprietário (OWNER) | Tudo + equipe + chaves de API | Painel + `/integracoes` |
| Paciente | Acompanhar saúde, lembretes, exames, recompras | Hub (`/hub/[token]`), `/entrar`, mobile/PWA |
| Sistema parceiro (ERP) | Integrar dados/eventos | Partner API + webhooks |

## 3. Inventário de funcionalidades & status

Legenda: ✅ pronto/E2E · 🟡 parcial · ⛔ planejado.

### Núcleo farmácia
- ✅ Auth (Auth.js v5, credenciais, argon2), multitenant + troca de farmácia (cookie)
- ✅ RLS por tenant no Postgres (defense-in-depth, `tenantDb`)
- ✅ Pacientes: CRUD, consentimento LGPD, prescrição, posologia
- ✅ Lembretes WhatsApp (scheduler/cron, confirmação, follow-up)
- ✅ RAM (farmacovigilância) inbox + revisão + simulação VigiMed
- ✅ Retornos esperados / recompra
- ✅ Catálogo CMED (busca, princípio ativo)
- ✅ Equipe: convites (email/WhatsApp/link), aceite, papéis

### Crescimento & engajamento
- ✅ Gamificação: contas, ledger de pontos idempotente, missões, recompensas, tiers
- ✅ Afiliados: parceiros, links `/go/[code]`, cliques, conversões idempotentes, comissão
- ✅ **Surfacing no painel** (`/engajamento`, `/afiliados`) — *esta fase*
- ✅ Hub do paciente `/hub/[token]` (magic link assinado)

### Integrações
- ✅ Partner API (Bearer key, escopos, isolada por tenant): `/api/partner/v1/*`
- ✅ Chaves de API: criar/listar (`/api/keys`) + **UI** em `/integracoes` — *esta fase*
- ✅ Webhooks de saída assinados (HMAC) + cron de entrega + **UI** — *esta fase*

### Saúde conectada (wearables)
- ✅ Conectar (OAuth Fitbit/Oura/… e ingest Apple/Samsung/Garmin)
- ✅ Ingestão idempotente + Health Auto Export (Apple Watch sem código)
- ✅ Sync OAuth por cron (Fitbit/Oura)
- ✅ **Surfacing no painel** (`/saude-conectada`) — *esta fase*

### Paciente / app
- ✅ Login self-service por OTP no WhatsApp (`/entrar`)
- ✅ Demonstração `/demo/prontuario`
- 🟡 Hub real (gamificação/afiliados já reais; **exames e wearables a integrar na UI do hub**)
- ⛔ **Upload de exames (Supabase Storage)** — Fase 2
- ⛔ **Mobile/PWA** (instalável, responsivo ponta-a-ponta) — Fase 4

### Plataforma / marketing
- ✅ **Landing page que converte** (`/`) — *esta fase*
- ✅ Observabilidade (Sentry)
- ✅ Páginas legais (privacidade/termos)

## 4. Auditoria de lacunas (o que falta para "100%")

1. **Exames**: modelo `Exam`, storage (Supabase), upload (farmácia **e** paciente),
   listagem, download assinado, vínculo no prontuário. → **Fase 2**
2. **Hub do paciente "completo"**: abas reais de consultas, exames (upload/visualizar)
   e saúde conectada dentro de `/hub/[token]` (hoje algumas vivem só no `/demo`). → **Fase 3**
3. **Conexão paciente↔farmácia**: paciente envia exame/mensagem → aparece no painel;
   farmácia envia recomendação/recompra → chega no hub/WhatsApp. → **Fase 3**
4. **Mobile**: navegação mobile no painel (drawer), PWA do paciente, layout responsivo
   auditado em todas as telas. → **Fase 4**
5. **E2E/qualidade**: todos os botões/modais/endpoints exercitados por testes
   (Vitest unit + Playwright E2E), sem rotas mortas. → **Fase 5**

## 5. Roadmap por fases (PRs)

| Fase | Entregas | Status |
|---|---|---|
| **1. Surfacing + Landing** | Landing `/`; nav + páginas `/engajamento`, `/afiliados`, `/saude-conectada`, `/integracoes`; criação de chave de API; este PRD | ✅ este PR |
| **2. Exames + Storage** | `Exam` model; `lib/storage` (Supabase); `/api/exams` (upload/list/download assinado); seção de exames no paciente; bucket + RLS | ⏳ próximo |
| **3. Hub completo + conexão** | Abas reais (consultas/exames/saúde) no `/hub`; upload de exame pelo paciente; mensagens paciente↔farmácia; recomendações de recompra | ⏳ |
| **4. Mobile/PWA** | Drawer mobile no painel; manifest + service worker; auditoria responsiva | ⏳ |
| **5. Hardening E2E** | Playwright cobrindo fluxos críticos; varredura de rotas/botões; acessibilidade | ⏳ |

## 6. Especificação — Fase 2 (Exames, detalhe)

- **Modelo** `Exam { id, patientId, pharmacyId, title, category, fileKey, fileName, mimeType, sizeBytes, status, uploadedBy, notes, createdAt }` + enum `ExamStatus { PENDING, READY, ARCHIVED }`.
- **Storage**: bucket privado `exams` no Supabase; objetos em `exams/{pharmacyId}/{patientId}/{uuid}-{fileName}`.
- **`lib/storage.ts`**: `storageConfigured()`, `uploadObject(path, body, contentType)`,
  `signedDownloadUrl(path, ttl)` — via REST (sem SDK), gated por env
  `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` (degrada com aviso se ausentes).
- **APIs**:
  - `POST /api/exams` (sessão da equipe, multipart) → valida paciente do tenant, sobe, cria `Exam`.
  - `GET /api/exams?patientId=` → lista do tenant.
  - `GET /api/exams/[id]/download` → 302 para URL assinada (checa tenant/sessão).
  - `POST /api/patient/exams` (token do hub) → upload pelo paciente.
- **UI**: seção "Exames" na página do paciente (`/patients/[id]`) e no hub.

## 7. Requisitos de ambiente (Vercel)

| Var | Uso | Obrigatória |
|---|---|---|
| `AUTH_SECRET` (= `NEXTAUTH_SECRET`) | Assinatura de sessão Auth.js | **Sim — em TODOS os ambientes** (Production **e** Preview/Development) |
| `DATABASE_URL` / `DIRECT_URL` | Postgres (Supabase) | Sim |
| `WHATSAPP_*` | Envio WhatsApp (OTP, lembretes) | Recom. (mock em dev) |
| `SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY` | Storage de exames (Fase 2) | Para exames |
| `CRON_SECRET` | Proteção das rotas de cron | Recom. |
| `*_CLIENT_ID/SECRET` (Fitbit, Oura…) | Wearables OAuth | Opcional |

> ⚠️ **Erro "There was a problem with the server configuration"** = `AUTH_SECRET`
> ausente no ambiente acessado (tipicamente o **Preview**). Defina a variável para
> **All Environments** no painel da Vercel e refaça o deploy.
