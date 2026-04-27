# Usuários de teste

A seed (`pnpm prisma db seed`) cria 5 usuários cobrindo todos os papéis na **Farmácia Demo**, e 5 pacientes com prescrições + adesão histórica para popular o dashboard.

## Credenciais

Todos os 5 usuários demo compartilham a mesma senha — ela vem da env var `DEMO_PASSWORD`. Se você não passar `DEMO_PASSWORD`, o seed gera uma aleatória e imprime no final.

```bash
DEMO_PASSWORD='qualquer-coisa' pnpm prisma db seed
```

| Papel | Email | O que pode fazer |
|---|---|---|
| **OWNER** | `owner@demo.farma` | Tudo: convidar/remover qualquer um, ver faturamento, todos os pacientes, todas as RAMs, retornos, configurações |
| **PHARMACIST** | `farmaceutico@demo.farma` | Gerenciar pacientes/RAM, convidar ATTENDANT/READONLY, revisar e encaminhar RAMs ao VigiMed |
| **ATTENDANT** | `atendente1@demo.farma` | Cadastrar pacientes, adicionar prescrições, atender no balcão |
| **ATTENDANT** | `atendente2@demo.farma` | (mesmo do anterior — pra testar segundo atendente) |
| **READONLY** | `leitura@demo.farma` | Apenas leitura — não consegue criar nem editar |

> **Por que sem senha hardcoded?** Senhas hardcoded em código são um cheiro de segurança e disparam scanners (GitGuardian, Snyk, etc). Mantemos o repositório limpo — você define qual senha usar a cada seed.

## Pacientes pré-cadastrados

5 pacientes com perfis variados pra testar diferentes cenários:

| Nome | Telefone | Comorbidades | Adesão* | Polifarmácia |
|---|---|---|---|---|
| Maria Silva | +5511991110001 | Hipertensão, Diabetes 2 | ~87% | 2 medicamentos |
| João Souza | +5511991110002 | Hipertensão | ~65% | 1 + **RAM moderada pendente** |
| Beatriz Lima | +5511991110003 | Hipotireoidismo | ~92% | 1 medicamento |
| Carlos Pereira | +5511991110004 | — | ~50% (baixa) | 1 medicamento (antibiótico) |
| **Teresa Almeida** | +5511991110005 | Hipertensão + 4 outras | ~71% | **5 medicamentos · POLIFARMÁCIA** |

\* taxa simulada nos últimos 14 dias (a cada execução do seed os números variam um pouco).

Também há:
- **1 RAM pendente** (João Souza, tosse seca + tontura, moderada) — aparece em `/ram`
- **1 retorno SCHEDULED** (Teresa Almeida) — aparece em `/returns`

---

## Criar sua conta pessoal de OWNER

A seed aceita 3 variáveis de ambiente opcionais para criar **uma OWNER adicional** com seu email/senha. Útil para:

- Você ter sua própria conta sem usar a demo
- Não compartilhar a senha da conta demo com a equipe
- Manter o demo como fallback/showcase

```bash
# OWNER_CRF é opcional
OWNER_EMAIL=carlos@suaempresa.com \
OWNER_NAME='Carlos Almeida' \
OWNER_PASSWORD='your-secret' \
OWNER_CRF='CRF-RS 67890' \
DATABASE_URL='...' DIRECT_URL='...' \
pnpm prisma db seed
```

A seed é idempotente — pode rodar várias vezes. Se você rodar de novo com env vars diferentes, o usuário com aquele email é atualizado (ou criado).

---

## "Super admin" (cross-pharmacy)

Hoje o OWNER é admin total **dentro de uma farmácia**. A plataforma é multi-tenant: cada farmácia vê só seus dados (Membership.pharmacyId é o isolador).

Se você quiser uma role **acima** disso — um SUPERADMIN que veja todas as farmácias, métricas globais, possa criar/desativar farmácias inteiras — isso é um próximo passo:

- Adicionar `User.isPlatformAdmin: Boolean` no schema
- Construir UI em `/admin` com listagem de pharmacies, métricas agregadas, etc
- Bypass do filtro por `pharmacyId` nas queries quando platform admin
- Audit log próprio (quem criou que pharmacy, quem desativou quem)

Para a primeira versão, OWNER da Farmácia Demo te dá poder total para testar tudo o que o produto entrega para uma farmácia real. Faça os primeiros pilotos com isso, e adicionamos SUPERADMIN quando começar a precisar.

---

## Aplicar schema e seed pelo GitHub Actions (sem terminal local)

Se você está no Claude Code Cloud ou em qualquer ambiente sem acesso direto ao Supabase, há um workflow `DB Deploy` em `.github/workflows/db-deploy.yml` que faz tudo a partir do GitHub.

**Setup (uma vez só):** vá em **GitHub → Repo → Settings → Secrets and variables → Actions → New repository secret** e adicione:

| Secret | Valor |
|---|---|
| `PROD_DATABASE_URL` | `postgresql://postgres:SENHA@db.PROJETO.supabase.co:5432/postgres` |
| `PROD_DIRECT_URL` | mesmo valor (Supabase Direct, porta 5432) |
| `DEMO_PASSWORD` | senha que vai compartilhar entre os 5 usuários demo (ex: `admin123`) |
| `PROD_OWNER_EMAIL` | seu email pessoal |
| `PROD_OWNER_NAME` | seu nome completo |
| `PROD_OWNER_PASSWORD` | sua senha pessoal |
| `PROD_OWNER_CRF` | seu CRF (opcional) |

**Execução:** **GitHub → Repo → Actions → DB Deploy → Run workflow** (botão à direita) → marque "Run seed after schema push" → **Run**.

Em ~1min o workflow:
1. Aplica todo o schema atual (`prisma db push`)
2. Cria 12 medicamentos no catálogo
3. Cria os 5 usuários demo (todos com `DEMO_PASSWORD`)
4. Cria sua conta pessoal de OWNER (se PROD_OWNER_* estiverem configurados)
5. Cria 5 pacientes com adesão histórica + 1 RAM pendente + 1 retorno scheduled

A partir daí você pode logar em https://farma-git-main-oryum.vercel.app/sign-in

> **Para rodar de novo no futuro:** o workflow é idempotente. Você pode disparar quantas vezes quiser — `prisma db push` reflete o schema atual sem perder dados (a menos que mude algo destrutivo, aí use `accept_data_loss=true`). O seed faz `upsert`, então não duplica nada.

---

## Resetar tudo

A seed é idempotente — não apaga dados, só faz `upsert`. Se precisar **resetar do zero**, no Supabase SQL Editor:

```sql
-- ⚠️ Apaga TUDO. Confirme que está no banco certo antes!
TRUNCATE
  "AdherenceEvent",
  "ReminderJob",
  "ReturnExpectation",
  "RAMReport",
  "PatientConsent",
  "Prescription",
  "Patient",
  "BotConversation",
  "InvitationDelivery",
  "Invitation",
  "Membership",
  "Session",
  "User",
  "Pharmacy",
  "MedicationCatalog"
RESTART IDENTITY CASCADE;
```

Depois rode `pnpm prisma db seed` de novo.
