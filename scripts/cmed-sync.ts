/**
 * CLI entry for `pnpm cmed:sync`. Downloads the CMED list and upserts every
 * row into MedicationCatalog. Intended to be invoked from the GitHub Actions
 * workflow (.github/workflows/cmed-sync.yml) which has DB connectivity that
 * a sandboxed dev box may not.
 *
 *   pnpm cmed:sync
 *   CMED_URL=https://.../lista_xx.xlsx pnpm cmed:sync
 */
import { PrismaClient } from "@prisma/client";
import { importCmed } from "../lib/medications/cmed-import";

async function main() {
  const prisma = new PrismaClient();
  let lastReportAt = 0;
  try {
    const result = await importCmed(prisma, {
      onProgress: (p) => {
        const now = Date.now();
        if (now - lastReportAt < 1000 && p.processed < p.total) return;
        lastReportAt = now;
        const pct = p.total === 0 ? 0 : Math.round((p.processed / p.total) * 100);
        console.log(`[cmed] ${p.processed}/${p.total} (${pct}%)`);
      },
    });
    console.log(
      `[cmed] done: ${result.processed} rows in ${(result.durationMs / 1000).toFixed(1)}s from ${result.url}`,
    );
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error("[cmed] failed:", err);
  process.exit(1);
});
