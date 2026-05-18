-- AddColumn age
ALTER TABLE "Patient" ADD COLUMN "age" INTEGER;
ALTER TABLE "Patient"
  ADD CONSTRAINT "Patient_age_range_check"
  CHECK ("age" IS NULL OR ("age" >= 0 AND "age" <= 150));

-- AddColumn allergies
ALTER TABLE "Patient" ADD COLUMN "allergies" TEXT[] NOT NULL DEFAULT '{}';

-- AddColumn customMedications
ALTER TABLE "Patient" ADD COLUMN "customMedications" TEXT[] NOT NULL DEFAULT '{}';

-- AddColumn consentGiven
ALTER TABLE "Patient" ADD COLUMN "consentGiven" BOOLEAN NOT NULL DEFAULT false;

-- AddColumn consentDate
ALTER TABLE "Patient" ADD COLUMN "consentDate" TIMESTAMP(3);
