-- ─────────────────────────────────────────────────────────────────────────────
-- Row-Level Security (multitenant defense-in-depth)
-- ─────────────────────────────────────────────────────────────────────────────
-- Idempotent. Apply with the privileged role (postgres) e.g.:
--   psql "$DIRECT_URL" -f prisma/rls.sql
--
-- Model: the app connects at runtime with the least-privilege role `farma_app`
-- (NOBYPASSRLS) and sets the GUC `app.pharmacy_id` before each query (see
-- lib/db.ts → tenantDb). RLS policies below isolate every tenant's rows.
-- The privileged migration/admin role is NOT forced under RLS, so migrations,
-- cron jobs and auth keep full access via DATABASE_URL.
--
-- The role/password is created out-of-band (kept out of git). Create it once:
--   CREATE ROLE farma_app LOGIN PASSWORD '<generated-secret>';
--   ALTER ROLE farma_app NOBYPASSRLS;
-- then point DATABASE_URL_APP at it. See docs/DEPLOY.md.
-- ─────────────────────────────────────────────────────────────────────────────

-- Privileges (RLS still governs row visibility) -----------------------------
GRANT USAGE ON SCHEMA public TO farma_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO farma_app;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO farma_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO farma_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT USAGE, SELECT ON SEQUENCES TO farma_app;

-- Direct pharmacyId tables --------------------------------------------------
DROP POLICY IF EXISTS tenant_isolation ON "Pharmacy";
CREATE POLICY tenant_isolation ON "Pharmacy" TO farma_app
  USING (id = current_setting('app.pharmacy_id', true));

DROP POLICY IF EXISTS tenant_isolation ON "Membership";
CREATE POLICY tenant_isolation ON "Membership" TO farma_app
  USING ("pharmacyId" = current_setting('app.pharmacy_id', true))
  WITH CHECK ("pharmacyId" = current_setting('app.pharmacy_id', true));

DROP POLICY IF EXISTS tenant_isolation ON "Invitation";
CREATE POLICY tenant_isolation ON "Invitation" TO farma_app
  USING ("pharmacyId" = current_setting('app.pharmacy_id', true))
  WITH CHECK ("pharmacyId" = current_setting('app.pharmacy_id', true));

DROP POLICY IF EXISTS tenant_isolation ON "Patient";
CREATE POLICY tenant_isolation ON "Patient" TO farma_app
  USING ("pharmacyId" = current_setting('app.pharmacy_id', true))
  WITH CHECK ("pharmacyId" = current_setting('app.pharmacy_id', true));

DROP POLICY IF EXISTS tenant_isolation ON "BotConversation";
CREATE POLICY tenant_isolation ON "BotConversation" TO farma_app
  USING ("pharmacyId" = current_setting('app.pharmacy_id', true))
  WITH CHECK ("pharmacyId" = current_setting('app.pharmacy_id', true));

-- Via Invitation ------------------------------------------------------------
DROP POLICY IF EXISTS tenant_isolation ON "InvitationDelivery";
CREATE POLICY tenant_isolation ON "InvitationDelivery" TO farma_app
  USING (EXISTS (SELECT 1 FROM "Invitation" i
                 WHERE i.id = "InvitationDelivery"."invitationId"
                   AND i."pharmacyId" = current_setting('app.pharmacy_id', true)))
  WITH CHECK (EXISTS (SELECT 1 FROM "Invitation" i
                 WHERE i.id = "InvitationDelivery"."invitationId"
                   AND i."pharmacyId" = current_setting('app.pharmacy_id', true)));

-- Via Patient ---------------------------------------------------------------
DROP POLICY IF EXISTS tenant_isolation ON "PatientConsent";
CREATE POLICY tenant_isolation ON "PatientConsent" TO farma_app
  USING (EXISTS (SELECT 1 FROM "Patient" p
                 WHERE p.id = "PatientConsent"."patientId"
                   AND p."pharmacyId" = current_setting('app.pharmacy_id', true)))
  WITH CHECK (EXISTS (SELECT 1 FROM "Patient" p
                 WHERE p.id = "PatientConsent"."patientId"
                   AND p."pharmacyId" = current_setting('app.pharmacy_id', true)));

DROP POLICY IF EXISTS tenant_isolation ON "Prescription";
CREATE POLICY tenant_isolation ON "Prescription" TO farma_app
  USING (EXISTS (SELECT 1 FROM "Patient" p
                 WHERE p.id = "Prescription"."patientId"
                   AND p."pharmacyId" = current_setting('app.pharmacy_id', true)))
  WITH CHECK (EXISTS (SELECT 1 FROM "Patient" p
                 WHERE p.id = "Prescription"."patientId"
                   AND p."pharmacyId" = current_setting('app.pharmacy_id', true)));

DROP POLICY IF EXISTS tenant_isolation ON "RAMReport";
CREATE POLICY tenant_isolation ON "RAMReport" TO farma_app
  USING (EXISTS (SELECT 1 FROM "Patient" p
                 WHERE p.id = "RAMReport"."patientId"
                   AND p."pharmacyId" = current_setting('app.pharmacy_id', true)))
  WITH CHECK (EXISTS (SELECT 1 FROM "Patient" p
                 WHERE p.id = "RAMReport"."patientId"
                   AND p."pharmacyId" = current_setting('app.pharmacy_id', true)));

-- Via Prescription -> Patient ----------------------------------------------
DROP POLICY IF EXISTS tenant_isolation ON "ReminderJob";
CREATE POLICY tenant_isolation ON "ReminderJob" TO farma_app
  USING (EXISTS (SELECT 1 FROM "Prescription" pr JOIN "Patient" p ON p.id = pr."patientId"
                 WHERE pr.id = "ReminderJob"."prescriptionId"
                   AND p."pharmacyId" = current_setting('app.pharmacy_id', true)))
  WITH CHECK (EXISTS (SELECT 1 FROM "Prescription" pr JOIN "Patient" p ON p.id = pr."patientId"
                 WHERE pr.id = "ReminderJob"."prescriptionId"
                   AND p."pharmacyId" = current_setting('app.pharmacy_id', true)));

DROP POLICY IF EXISTS tenant_isolation ON "AdherenceEvent";
CREATE POLICY tenant_isolation ON "AdherenceEvent" TO farma_app
  USING (EXISTS (SELECT 1 FROM "Prescription" pr JOIN "Patient" p ON p.id = pr."patientId"
                 WHERE pr.id = "AdherenceEvent"."prescriptionId"
                   AND p."pharmacyId" = current_setting('app.pharmacy_id', true)))
  WITH CHECK (EXISTS (SELECT 1 FROM "Prescription" pr JOIN "Patient" p ON p.id = pr."patientId"
                 WHERE pr.id = "AdherenceEvent"."prescriptionId"
                   AND p."pharmacyId" = current_setting('app.pharmacy_id', true)));

DROP POLICY IF EXISTS tenant_isolation ON "ReturnExpectation";
CREATE POLICY tenant_isolation ON "ReturnExpectation" TO farma_app
  USING (EXISTS (SELECT 1 FROM "Prescription" pr JOIN "Patient" p ON p.id = pr."patientId"
                 WHERE pr.id = "ReturnExpectation"."prescriptionId"
                   AND p."pharmacyId" = current_setting('app.pharmacy_id', true)))
  WITH CHECK (EXISTS (SELECT 1 FROM "Prescription" pr JOIN "Patient" p ON p.id = pr."patientId"
                 WHERE pr.id = "ReturnExpectation"."prescriptionId"
                   AND p."pharmacyId" = current_setting('app.pharmacy_id', true)));

-- Shared catalog: readable by every tenant ---------------------------------
DROP POLICY IF EXISTS shared_read ON "MedicationCatalog";
CREATE POLICY shared_read ON "MedicationCatalog" FOR SELECT TO farma_app USING (true);

-- Identity/auth tables: never accessible to the app role (auth uses the
-- privileged connection). Explicit deny documents intent + clears the linter.
DROP POLICY IF EXISTS app_no_access ON "User";
CREATE POLICY app_no_access ON "User" TO farma_app USING (false) WITH CHECK (false);

DROP POLICY IF EXISTS app_no_access ON "Session";
CREATE POLICY app_no_access ON "Session" TO farma_app USING (false) WITH CHECK (false);

-- Close the anon-executable SECURITY DEFINER helper flagged by the linter.
REVOKE EXECUTE ON FUNCTION public.rls_auto_enable() FROM anon, authenticated, PUBLIC;
