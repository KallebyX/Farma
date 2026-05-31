# Saúde Conectada — Wearables (Apple Watch, Galaxy Watch, Fitbit, Oura…)

O paciente conecta seu relógio/anel e os dados (passos, frequência cardíaca,
sono, SpO₂…) aparecem no **Meu Prontuário** e no **Hub de gamificação**. Há dois
tipos de provedor, porque nem todo fabricante oferece API web:

| Tipo | Provedores | Como os dados entram |
|---|---|---|
| **`ingest`** (push) | Apple Saúde / Apple Watch, Samsung Health, Garmin, Manual | O telefone do paciente **envia** as amostras para `POST /api/wearables/ingest` com um *token de ingestão* por conexão. |
| **`oauth`** (pull) | Fitbit, Oura, Withings, Google Health Connect, Polar | O paciente autoriza via OAuth 2.0; um **cron** (`/api/cron/sync-wearables`) puxa as amostras periodicamente. |

> Apple e Samsung **não têm API web** — por isso o caminho deles é o push. É o
> mesmo modelo que apps como o Strava usam para o Apple Watch.

---

## 1. Conectar (todos os tipos)

`POST /api/wearables/connect { provider }` (paciente autenticado via token do hub)

- **oauth**: retorna `{ authUrl }` → redirecione o paciente; ao voltar, o
  callback `/api/wearables/callback/[provider]` troca o `code` por tokens e marca
  a conexão como `CONNECTED`.
- **ingest**: retorna `{ ingestToken }` (mostrado **uma única vez**). É esse token
  que o atalho/app do paciente usa no header `Authorization: Bearer wph_…`.

`GET /api/wearables/me` lista conexões + última métrica de cada tipo.

---

## 2. Apple Watch / Apple Saúde — receita sem código (recomendada)

A forma mais simples é o app **Health Auto Export – JSON+CSV** (App Store). Ele
exporta os dados do Apple Saúde automaticamente para uma URL REST.

1. No Farma, conecte **Apple Saúde** → copie o `ingestToken` (`wph_…`).
2. No app **Health Auto Export** → **Automations** → **Add Automation** →
   **REST API**.
3. Configure:
   - **URL**: `https://SEU_DOMINIO/api/wearables/ingest`
   - **Method**: `POST`
   - **Headers**: `Authorization: Bearer wph_…` e `Content-Type: application/json`
   - **Data Type / Format**: `JSON` (padrão "Health Metrics")
   - **Metrics**: Heart Rate, Resting Heart Rate, Steps, Sleep Analysis, Blood
     Oxygen, Heart Rate Variability, Active Energy, Weight, Blood Glucose, Blood
     Pressure, Body Temperature.
   - **Frequency**: a cada hora / diário.

O endpoint aceita **nativamente** o payload do Health Auto Export
(`{ data: { metrics: [...] } }`) — não precisa transformar nada. Os nomes das
métricas são mapeados automaticamente (ver `lib/wearables/health-auto-export.ts`).

### Alternativa: Atalho do iOS (Shortcuts), 100% nativo

Para quem não quer instalar app de terceiros:

1. App **Atalhos** → novo atalho → ação **Obter amostras de saúde** (Find Health
   Samples) para cada tipo (ex.: Frequência Cardíaca, Passos…).
2. Monte um dicionário no formato nativo do Farma e ação **Obter conteúdo de URL**:
   - URL `https://SEU_DOMINIO/api/wearables/ingest`, método **POST**, header
     `Authorization: Bearer wph_…`, corpo **JSON**:
     ```json
     {
       "samples": [
         { "metric": "HEART_RATE", "value": 72, "unit": "bpm",
           "recordedAt": "2026-05-31T08:00:00Z", "source": "Apple Watch" },
         { "metric": "STEPS", "value": 8421, "unit": "steps",
           "recordedAt": "2026-05-31T08:00:00Z", "source": "Apple Watch" }
       ]
     }
     ```
3. **Automação** (aba Automação → Hora do dia) para rodar o atalho 1–2×/dia.

---

## 3. Samsung Health / Garmin

Mesmo modelo de **push** do Apple. Use um agregador (ex.: Health Connect no
Android para Samsung, ou um app que leia o Garmin) que faça `POST` para
`/api/wearables/ingest` com o `ingestToken`. O formato nativo `samples[]` acima
funciona para qualquer fonte.

---

## 4. Fitbit / Oura (e demais OAuth)

1. Crie um app no portal do provedor; configure o redirect:
   `https://SEU_DOMINIO/api/wearables/callback/<provider>` (`fitbit`, `oura`, …).
2. Defina as credenciais no ambiente (Vercel):

   | Provedor | Variáveis |
   |---|---|
   | Fitbit | `FITBIT_CLIENT_ID`, `FITBIT_CLIENT_SECRET` |
   | Oura | `OURA_CLIENT_ID`, `OURA_CLIENT_SECRET` |
   | Withings | `WITHINGS_CLIENT_ID`, `WITHINGS_CLIENT_SECRET` |
   | Google Health Connect | `GOOGLE_FIT_CLIENT_ID`, `GOOGLE_FIT_CLIENT_SECRET` |
   | Polar | `POLAR_CLIENT_ID`, `POLAR_CLIENT_SECRET` |

   Provedores sem credenciais simplesmente não aparecem como conectáveis
   (`oauthConfigured()`).
3. O cron `/api/cron/sync-wearables` (a cada 2h) renova o token e puxa os últimos
   2 dias de resumos diários. **Pullers** implementados: **Fitbit** e **Oura**
   (`lib/wearables/sync.ts`); os demais ficam conectados e podem ganhar puller
   depois sem mudar o resto.

---

## 5. Métricas suportadas (`HealthMetric`)

`HEART_RATE`, `RESTING_HR`, `STEPS`, `SLEEP_MINUTES`, `SPO2`, `HRV`, `CALORIES`,
`WEIGHT`, `GLUCOSE`, `BLOOD_PRESSURE_SYS`, `BLOOD_PRESSURE_DIA`, `TEMPERATURE`.

Toda amostra é **idempotente** por `(paciente, métrica, recordedAt, provedor)` —
reenvios não duplicam.

---

## 6. Segurança

- Token de ingestão: guardamos apenas o **sha-256**; o valor em claro aparece só
  na criação. Revogar = recriar a conexão (gera novo token).
- Tokens OAuth ficam na `WearableConnection` (em produção, criptografe em repouso
  via KMS/coluna cifrada).
- `CRON_SECRET` protege as rotas de cron (`Authorization: Bearer $CRON_SECRET`).
