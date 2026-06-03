/**
 * One-shot, idempotent backfill of PatientAccount + PatientPharmacyLink from the
 * legacy Patient rows. Safe to re-run. Usage: `pnpm tsx scripts/backfill-patient-accounts.ts`.
 */
import { backfillPatientAccounts } from "@/lib/patient-account";

async function main() {
  const { accounts, links } = await backfillPatientAccounts();
  // eslint-disable-next-line no-console
  console.log(`[backfill] PatientAccount=${accounts} PatientPharmacyLink=${links}`);
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    // eslint-disable-next-line no-console
    console.error(err);
    process.exit(1);
  });
