# PRD & Plano de Arquitetura — Meu Prontuário × Farma

> Plataforma única, dois produtos: **Farma** (SaaS B2B para farmácias) e **Meu Prontuário**
> (app B2C do paciente, mobile-first, em domínio próprio). 100% integrados por uma API
> versionada compartilhada.

- **Status:** proposta para aprovação
- **Data:** 2026-06-01
- **Decisões fechadas com o cliente:**
  1. **Identidade do paciente:** telefone (OTP via WhatsApp/SMS) **+ Sign in with Apple/Google** (exigência da App Store).
  2. **Modelo de dados:** nova **conta global do paciente** (`PatientAccount`) dona dos dados clínicos + **vínculo M2M** com farmácias mediante consentimento.
  3. **Repositórios:** **separados** — backend/API + web Farma neste repo; Meu Prontuário **web (React)**, **iOS (Swift)** e **Android (Kotlin)** em repos próprios consumindo a API versionada/SDK.

---

## 1. Contexto e objetivo

Hoje o Farma e o "Meu Prontuário" vivem no mesmo app Next.js. O paciente só existe **dentro
de uma farmácia** (`Patient.pharmacyId` obrigatório, `@@unique([pharmacyId, phone])`), e o
cadastro (`lib/patient-register.ts`) **exige escolher uma farmácia**. Isso impede a visão do
cliente: *qualquer pessoa instala o Meu Prontuário, cria conta sozinha e usa tudo; depois, as
farmácias que se cadastrarem no Farma acessam os dados de quem aceitar vincular.*

**Objetivo:** transformar o paciente em um **usuário soberano dos próprios dados**, com um app
dedicado (mobile-first nativo + web), mantendo o Farma como o produto das farmácias — e tornar a
integração entre os dois o principal argumento de venda, demonstrável por um **modo demo guiado**.

### Métricas de sucesso
- Paciente cria conta e usa o app **sem nenhuma farmácia vinculada**.
- Vínculo paciente↔farmácia 100% **opt-in**, revogável, com escopo de consentimento (LGPD).
- API pública versionada com **paridade total** entre web e nativo (mesmos endpoints).
- Demo guiado roda em ambiente isolado, do Farma ao Meu Prontuário, sem dados reais.

---

## 2. Estado atual (levantamento no código)

### Já existe e será reaproveitado
- **Auth do paciente pronta para mobile:** `lib/patient-token.ts` emite **token HMAC stateless**
  (`{p: patientId, exp}`, TTL 90d), lido por `Authorization: Bearer` **ou** cookie `mp_hub`
  (`lib/patient-session.ts:resolvePatientFromRequest`). OTP em `lib/patient-auth.ts`
  (`requestPatientCode`/`verifyPatientCode`, código 6 dígitos, hash sha256, TTL 10 min).
- **API do paciente já existe** (pública no `middleware.ts`, autorizada por token):
  `app/api/patient/{profile,prescriptions,exams,exams/[id]/download,appointments,messages,ram,receipts,referral}`
  e `app/api/patient-auth/{request,verify,register}`.
- **API de parceiro versionada** com API-Key: `app/api/partner/v1/...` — padrão a estender para B2B/labs.
- **Web hub do paciente:** `app/hub` + `app/hub/[token]` (entrada por magic link).
- **Demo embrionário:** `app/demo/prontuario/page.jsx` (sem tour guiado).
- **Domínio clínico rico (~50 models):** `Prescription`/`ReminderJob`/`AdherenceEvent`,
  `ReturnExpectation`, `RAMReport`, `Exam`, `Receipt`+`Loyalty/Mission/Reward/Redemption/PointsEntry`,
  `Appointment`, `DigitalPrescription`/`Dispensation` (SNGPC/ICP-Brasil), `WearableConnection`/`Sample`,
  `Referral`, `AffiliatePartner` (labs), `WebhookEndpoint`, `ApiKey`, **`PatientConsent`+`ConsentScope`**.
- **Integrações:** WhatsApp (Twilio via `IntegrationConfig` no banco), webhooks de saída
  (`lib/webhooks/*` + cron), wearables (`lib/wearables/*` + cron), storage Supabase (`lib/storage.ts`).

### Lacunas a resolver
1. `Patient` é **mono-tenant**; não há conta global nem vínculo M2M efetivo.
2. `registerPatient` **exige farmácia**; não há cadastro 100% aberto.
3. Token do paciente é de **longa duração e não-revogável** (sem refresh/rotação/logout server-side) — inadequado para nativo.
4. Sem **login social** (Apple/Google) nem **push** (APNs/FCM).
5. API não versionada para o paciente, **sem OpenAPI/SDK**, sem rate-limit/escopos por device.
6. Demo não é **guiado** nem isola dados.

---

## 3. Arquitetura-alvo

```
                         ┌─────────────────────────────────────────┐
                         │      Plataforma (este repo)               │
   Farmácias  ──────────▶│  Farma web (Next.js, app/(app))           │
   (B2B)                 │  + Núcleo de domínio (lib/*)              │
                         │  + API pública versionada  /api/v1/*      │
                         │  + Supabase (Postgres + RLS + Storage)    │
                         └──────────────┬───────────────────────────┘
                                        │  HTTPS JSON + OpenAPI
        ┌───────────────────────────────┼───────────────────────────────┐
        ▼                                ▼                               ▼
  Meu Prontuário web              Meu Prontuário iOS              Meu Prontuário Android
  (React, repo próprio)           (Swift, repo próprio)           (Kotlin, repo próprio)
  prontuario.<dominio>            App Store                       Play Store
        └──────────────── SDK TS gerado / cliente OpenAPI ───────────────┘
```

- **Backend único** (este repo) é a fonte de verdade: domínio em `lib/*`, exposto por **`/api/v1`**
  (paciente) e **`/api/partner/v1`** (B2B). O Farma web continua aqui.
- **Meu Prontuário** vira 3 clientes magros (web/iOS/Android) **sem lógica de negócio** — só consomem a API.
- **Contrato de API** publicado como **OpenAPI 3.1**; gera SDKs (TS para web, e tipos para Swift/Kotlin).
- **Domínios separados:** `app.farmaapp...` (Farma) e `prontuario...` (Meu Prontuário web). CORS allow-list por origem + apps nativos via bearer.

---

## 4. Modelo de identidade e dados (o refactor central)

### 4.1 Novas entidades
```prisma
model PatientAccount {            // dono soberano dos dados clínicos
  id            String   @id @default(uuid())
  phone         String   @unique  // E.164 — identidade primária (OTP)
  email         String?  @unique
  name          String
  cpf           String?  @unique
  birthDate     DateTime?
  sex           String?
  appleSub      String?  @unique  // Sign in with Apple
  googleSub     String?  @unique  // Google
  status        String   @default("ACTIVE")
  createdAt     DateTime @default(now())
  // dados clínicos pessoais migram para cá (allergies, comorbidities, customMedications, exams pessoais, wearables…)
  links         PatientPharmacyLink[]
  devices       PatientDevice[]
  refreshTokens PatientRefreshToken[]
}

model PatientPharmacyLink {       // vínculo M2M opt-in, com consentimento por escopo
  id           String   @id @default(uuid())
  accountId    String
  pharmacyId   String
  status       String   @default("ACTIVE")    // PENDING | ACTIVE | REVOKED
  scopes       String[] @default([])          // reaproveita ConsentScope
  linkedAt     DateTime @default(now())
  revokedAt    DateTime?
  // ponte para o Patient legado daquela farmácia (dados clínicos pharmacy-scoped)
  patientId    String?
  @@unique([accountId, pharmacyId])
  @@index([pharmacyId, status])
}

model PatientDevice {             // push + sessão por dispositivo
  id          String @id @default(uuid())
  accountId   String
  platform    String            // ios | android | web
  pushToken   String?           // APNs/FCM
  lastSeenAt  DateTime @default(now())
}

model PatientRefreshToken {       // rotação + revogação (logout real)
  id         String   @id @default(uuid())
  accountId  String
  tokenHash  String   @unique
  deviceId   String?
  expiresAt  DateTime
  revokedAt  DateTime?
}
```

### 4.2 Propriedade dos dados (regra)
- **Pessoais/globais** (do paciente, visíveis em qualquer farmácia vinculada *só se tiver escopo*):
  perfil, alergias/comorbidades, medicamentos auto-cadastrados, **exames** que o paciente subiu,
  wearables, gamificação agregada.
- **Pharmacy-scoped** (geradas pela farmácia, visíveis a ela e ao paciente):
  `Prescription`/lembretes, `Dispensation`/SNGPC, `Receipt`/pontos daquela loja, `Appointment`,
  `RAMReport` revisada, mensagens.
- A farmácia **só enxerga** dados do paciente com `PatientPharmacyLink ACTIVE` e o **escopo** correspondente.

### 4.3 Estratégia de migração (sem downtime)
1. Criar novas tabelas (expand) — nada quebra.
2. **Backfill:** para cada `Patient` existente, criar/achar `PatientAccount` por `phone`; criar
   `PatientPharmacyLink` (ACTIVE, escopos = consentimentos atuais) apontando para o `Patient` legado.
3. Dual-write/leitura por feature flag (`PATIENT_ACCOUNTS=on`).
4. Migrar dados pessoais para a conta; manter o clínico pharmacy-scoped no `Patient`.
5. Contract: remover obrigatoriedade de `pharmacyId` no cadastro.
- Tudo via **Supabase MCP `apply_migration`** (idempotente) + `prisma db push`, com **RLS** revisada.

---

## 5. API pública versionada (`/api/v1`) para mobile

- **Auth:** OTP (request/verify) → emite **access token (JWT curto, ~15 min)** + **refresh token rotativo**
  (`PatientRefreshToken`, revogável = logout real). **Sign in with Apple/Google**: valida `id_token`,
  casa por `appleSub`/`googleSub`/e-mail, vincula ou cria conta. Substitui o token de 90d em mobile
  (mantém compat no web hub durante transição).
- **Escopos & multi-conta:** endpoints "globais" (`/v1/me`, `/v1/exams`, `/v1/devices`) e
  "por farmácia" (`/v1/pharmacies/{id}/prescriptions`…), filtrando por vínculo ACTIVE.
- **Endpoints (estende o que já existe):** auth, `me` (perfil/edição), `links` (listar/vincular por
  busca ou QR/`refCode`, revogar), `prescriptions`, `reminders` (responder tomei/adiei), `exams`
  (upload via signed URL do `lib/storage.ts`), `receipts` (QR NF-e → pontos), `loyalty`, `appointments`,
  `ram` (reportar reação), `referral`, `compare` (farmácias próximas/preço/cupom — `lib/compare.ts`),
  `devices` (registrar push).
- **Contrato:** **OpenAPI 3.1** versionado no repo (`openapi/v1.yaml`), CI valida que rotas batem com o spec;
  SDK TS gerado para o web; tipos para Swift/Kotlin.
- **Infra:** rate-limit por conta/device (estende `lib/rate-limit.ts`), CORS allow-list, idempotency-key
  em POSTs, paginação cursor.

---

## 6. Apps Meu Prontuário (repos separados)

Todos mobile-first, mesma UX, consumindo `/api/v1` + push.

| Repo | Stack | Notas |
|------|-------|-------|
| `meu-prontuario-web` | React + Vite/Next, PWA | Design system compartilhado (tokens publicados via npm). |
| `meu-prontuario-ios` | Swift/SwiftUI | Sign in with Apple, APNs, HealthKit (wearables), Secure Enclave p/ refresh token. |
| `meu-prontuario-android` | Kotlin/Compose | Google Sign-In, FCM, Health Connect, EncryptedSharedPrefs. |

- **Fluxos:** onboarding (OTP/Apple/Google) → home (lembretes, pontos, exames) → vincular farmácia
  (busca/QR) → meus remédios → exames (foto/upload) → gamificação → relatar RAM → comparar preços.
- **Offline-first** no nativo (cache local + sync). **Deep links** `prontuario://link/{refCode}` p/ vínculo via QR do Farma.
- **CI/CD:** Fastlane (iOS), Gradle Play Publisher (Android), Vercel/Netlify (web). Versão da API pinada por header.

---

## 7. Integrações, MCPs e conectores

| Necessidade | Conector/Serviço | MCP disponível | Observação |
|-------------|------------------|----------------|------------|
| Banco/RLS/migrações/Storage | **Supabase** | ✅ Supabase MCP | `apply_migration`, `execute_sql`, advisors de segurança/RLS. |
| WhatsApp/SMS/OTP | **Twilio** (Messaging Service + Content templates) | ✅ Twilio MCP (busca/docs) | Já ativo via `IntegrationConfig`; OTP=template *authentication*. |
| Push nativo | **APNs** (iOS) + **FCM** (Android) | — | Novo serviço `lib/push/*` + `PatientDevice.pushToken`; cron de envio. |
| Pagamentos/comissão de afiliado | **Stripe** (Connect) | ✅ Stripe MCP | Repasse de comissão de labs/afiliados; assinaturas das farmácias. |
| Observabilidade | **Sentry** | ✅ Sentry MCP | Erros web/nativo + API; já em uso. |
| Deploy/logs/preview | **Vercel** | ✅ Vercel MCP (read) | Logs runtime para validar disparos/integrações. |
| Repos/PRs/CI | **GitHub** | ✅ GitHub MCP | 1 repo por app; PRs draft + checks. |
| Login social | **Apple / Google Identity** | — | Validação de `id_token` no backend. |
| Mapas/geo (farmácias próximas) | provider de geocoding | — | Já há lat/long em `Pharmacy` + `lib/compare.ts`. |
| Receita digital/assinatura | **ICP-Brasil** (`lib/icp-brasil.ts`) | — | Validação de validade já existe. |

---

## 8. Modo Demo guiado (Farma → Meu Prontuário)

Experiência de vendas, isolada de produção:
- **Tenant demo** semeado (`scripts/seed-demo.ts`): 1 rede + 2 filiais, farmacêutico demo, ~8 pacientes
  com prescrições/lembretes/RAM/pontos realistas. Flag `DEMO_MODE`/tenant somente-leitura.
- **Tour guiado** (coachmarks/stepper, novo `components/ui/tour.tsx`):
  1. **Farma:** dashboard → paciente → adicionar receita (foto/QR) → lembrete → inbox RAM → retornos/pontos.
  2. **Transição:** "veja como o paciente recebe isso" → abre o **Meu Prontuário demo** (`app/demo/prontuario` evoluído / deep link) com o mesmo paciente.
  3. **Meu Prontuário:** lembrete chega → responde "tomei" → reflete no Farma (mostra a integração em tempo real) → vincular farmácia (QR) → pontos/comparador.
- **Reset** periódico do tenant demo (cron) para manter a demo limpa.
- CTA ao fim: agendar/contratar (entra no funil B2B).

---

## 9. Roadmap por fases (workstreams multi-agente)

Cada fase = 1+ PR draft, branch própria, CI verde, migrações idempotentes. Agentes paralelos onde não há dependência.

| Fase | Entrega | Workstream (agente) | Depende de |
|------|---------|---------------------|-----------|
| **0. Fundação** | OpenAPI inicial, `/api/v1` namespace, scaffolding de erros/paginação/rate-limit, CORS | Backend | — |
| **1. Identidade** | `PatientAccount`+`PatientPharmacyLink`+`PatientDevice`+`PatientRefreshToken`, migração+backfill, RLS | Backend/DB | 0 |
| **2. Auth mobile** | OTP→access+refresh, **Apple/Google**, logout/rotação, devices | Auth | 1 |
| **3. Cadastro aberto + vínculo** | registro sem farmácia, vincular por busca/QR/refCode, revogar; ajustar `registerPatient` | Backend + Farma web (QR de vínculo) | 1,2 |
| **4. Paridade de API** | migrar `/api/patient/*` → `/api/v1/*`, exames/upload, receipts/pontos, comparador, RAM | Backend | 1–3 |
| **5. Push** | `lib/push` (APNs/FCM), cron, preferências; lembretes via push+WhatsApp | Notifications | 1,4 |
| **6. SDK & contrato** | gerar SDK TS + tipos Swift/Kotlin, CI de contrato | Tooling | 0–4 |
| **7. App web** (repo) | Meu Prontuário web React sobre o SDK | Web (repo separado) | 4,6 |
| **8. App iOS** (repo) | SwiftUI + Apple + APNs + HealthKit | iOS (repo separado) | 2,5,6 |
| **9. App Android** (repo) | Compose + Google + FCM + Health Connect | Android (repo separado) | 2,5,6 |
| **10. Demo guiado** | seed demo + tour Farma→Prontuário + reset | Growth/Frontend | 3,4,7 |
| **11. Comissão/afiliados** | Stripe Connect p/ repasse de labs/afiliados | Payments | 4 |
| **12. Hardening** | RLS audit, LGPD (exportar/excluir conta), e2e, observabilidade | Segurança/QA | todas |

---

## 10. Segurança, LGPD e compliance
- **RLS** revisada para `PatientAccount`/links; farmácia só lê via vínculo ACTIVE+escopo (advisors do Supabase MCP).
- **Tokens:** access curto + refresh rotativo/revogável; segredos só no banco privado/Vercel env, nunca no repo.
- **LGPD:** consentimento por escopo, **revogação** de vínculo, **exportação** e **exclusão** de conta (direito do titular), trilha de auditoria.
- **Regulatório:** mantém SNGPC/SNCR/ANVISA e ICP-Brasil já existentes; dados de dispensação seguem pharmacy-scoped.
- **App stores:** Sign in with Apple obrigatório (há social), política de privacidade + data safety, exclusão de conta in-app (exigência Apple/Google).

## 11. Testes, observabilidade e rollout
- **Unit/contrato:** Vitest (já há `tests/unit/*`); novo conjunto de contrato validando rotas × OpenAPI.
- **E2E:** Playwright (web) + smoke do fluxo OTP/vínculo; testes nativos (XCUITest/Espresso) nos repos.
- **Observabilidade:** Sentry (web/nativo/API), logs de runtime Vercel para disparos.
- **Rollout:** feature flags (`PATIENT_ACCOUNTS`, `API_V1`, `SOCIAL_LOGIN`, `PUSH`), canary por farmácia, métricas de adesão.

## 12. Riscos e decisões em aberto
- **Migração de identidade** é o maior risco — mitigado por expand/backfill/dual-write + flags.
- **Custo/aprovação WhatsApp** (templates) vs. push: push nativo reduz dependência do WhatsApp.
- **Domínios/branding** do Meu Prontuário (definir domínio final) e **monetização** do app do paciente (assumido gratuito).
- Definir provider de **geocoding** e SLA de **reset** do tenant demo.

---

### Próximo passo sugerido
Aprovado o plano, começar pela **Fase 0 + 1** (fundação `/api/v1` + identidade `PatientAccount`/M2M com
migração e backfill) neste repo, em PR draft, e em paralelo abrir os 3 repos do Meu Prontuário com o
scaffolding consumindo o SDK gerado.
