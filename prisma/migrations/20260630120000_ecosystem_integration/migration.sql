-- Ecossistema Oryum: AtendeBem (clínica) + Meu Prontuário (paciente).
-- Mirrors the migration already applied to the live DB. Idempotent guards keep
-- it safe whether the schema is reached via `prisma db push` (deploy default)
-- or `prisma migrate deploy`.

-- DigitalPrescription provenance
ALTER TABLE "DigitalPrescription" ADD COLUMN IF NOT EXISTS "source" TEXT;
ALTER TABLE "DigitalPrescription" ADD COLUMN IF NOT EXISTS "externalId" TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS "DigitalPrescription_pharmacyId_source_externalId_key"
  ON "DigitalPrescription"("pharmacyId", "source", "externalId");

-- Enums
DO $$ BEGIN CREATE TYPE "EcosystemPartner" AS ENUM ('ATENDEBEM', 'MEU_PRONTUARIO'); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE TYPE "ConnectionStatus" AS ENUM ('DISCONNECTED', 'CONNECTED', 'ERROR'); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE TYPE "SyncDirection" AS ENUM ('INBOUND', 'OUTBOUND'); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE TYPE "SyncStatus" AS ENUM ('SUCCESS', 'FAILED'); EXCEPTION WHEN duplicate_object THEN null; END $$;

-- EcosystemConnection
CREATE TABLE IF NOT EXISTS "EcosystemConnection" (
  "id"                      TEXT NOT NULL,
  "pharmacyId"              TEXT NOT NULL,
  "partner"                 "EcosystemPartner" NOT NULL,
  "baseUrl"                 TEXT,
  "secret"                  TEXT,
  "status"                  "ConnectionStatus" NOT NULL DEFAULT 'DISCONNECTED',
  "scopes"                  TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "autoPushDispensations"   BOOLEAN NOT NULL DEFAULT true,
  "autoAcceptPrescriptions" BOOLEAN NOT NULL DEFAULT true,
  "shareAdherence"          BOOLEAN NOT NULL DEFAULT true,
  "lastSyncAt"              TIMESTAMP(3),
  "lastError"               TEXT,
  "createdAt"               TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"               TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "EcosystemConnection_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "EcosystemConnection_pharmacyId_partner_key" ON "EcosystemConnection"("pharmacyId", "partner");
CREATE INDEX IF NOT EXISTS "EcosystemConnection_pharmacyId_idx" ON "EcosystemConnection"("pharmacyId");

-- IntegrationSyncLog
CREATE TABLE IF NOT EXISTS "IntegrationSyncLog" (
  "id"         TEXT NOT NULL,
  "pharmacyId" TEXT NOT NULL,
  "partner"    "EcosystemPartner" NOT NULL,
  "direction"  "SyncDirection" NOT NULL,
  "event"      TEXT NOT NULL,
  "status"     "SyncStatus" NOT NULL,
  "detail"     TEXT,
  "externalId" TEXT,
  "createdAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "IntegrationSyncLog_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "IntegrationSyncLog_pharmacyId_createdAt_idx" ON "IntegrationSyncLog"("pharmacyId", "createdAt");
CREATE INDEX IF NOT EXISTS "IntegrationSyncLog_partner_createdAt_idx" ON "IntegrationSyncLog"("partner", "createdAt");

-- Foreign keys
DO $$ BEGIN
  ALTER TABLE "EcosystemConnection" ADD CONSTRAINT "EcosystemConnection_pharmacyId_fkey"
    FOREIGN KEY ("pharmacyId") REFERENCES "Pharmacy"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN
  ALTER TABLE "IntegrationSyncLog" ADD CONSTRAINT "IntegrationSyncLog_pharmacyId_fkey"
    FOREIGN KEY ("pharmacyId") REFERENCES "Pharmacy"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;
