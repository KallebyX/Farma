-- AddColumn age
ALTER TABLE "Patient" ADD COLUMN "age" INTEGER;

-- AddColumn allergies
ALTER TABLE "Patient" ADD COLUMN "allergies" TEXT[] NOT NULL DEFAULT '{}';

-- AddColumn customMedications
ALTER TABLE "Patient" ADD COLUMN "customMedications" TEXT[] NOT NULL DEFAULT '{}';

-- AddColumn consentGiven
ALTER TABLE "Patient" ADD COLUMN "consentGiven" BOOLEAN NOT NULL DEFAULT false;

-- AddColumn consentDate
ALTER TABLE "Patient" ADD COLUMN "consentDate" TIMESTAMP(3);
