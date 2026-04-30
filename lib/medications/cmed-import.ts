import type { PrismaClient } from "@prisma/client";
import { findHeaderRowIndex, mapCmedRow, type ParsedCmedEntry } from "@/lib/medications/cmed-parse";

/**
 * CMED ingestion. Anvisa publishes the price list as XLS at
 * https://www.gov.br/anvisa/pt-br/assuntos/medicamentos/cmed/precos and
 * dados.gov.br re-publishes it as CSV (semicolon-separated, Latin-1).
 *
 * We use the CSV variant: it parses without a native dep, and the column
 * layout is identical to the canonical XLS.
 *
 * The actual download URL changes monthly. Operators override CMED_URL when
 * the slug rolls; the GH Actions workflow surfaces it as a repo secret.
 */
const DEFAULT_CMED_URL =
  "https://dados.anvisa.gov.br/dados/TA_PRECO_MEDICAMENTO.csv";

export type ImportProgress = {
  total: number;
  processed: number;
};

export type ImportOptions = {
  url?: string;
  onProgress?: (p: ImportProgress) => void;
  /** Chunk size for batched upserts. */
  chunkSize?: number;
};

export async function fetchCmedCsv(url: string): Promise<string> {
  const res = await fetch(url, { redirect: "follow" });
  if (!res.ok) {
    throw new Error(`Falha ao baixar CMED (${res.status} ${res.statusText}) em ${url}`);
  }
  // Anvisa serves CSV in Latin-1 (ISO-8859-1). UTF-8 decoding mojibakes the
  // Portuguese accents in column names like "SUBSTÂNCIA" so we decode the
  // raw bytes explicitly.
  const buf = await res.arrayBuffer();
  return new TextDecoder("latin1").decode(buf);
}

/**
 * Tolerant CSV parser supporting CMED's `;` separator + RFC4180-style quoting.
 */
export function parseCsv(text: string, sep = ";"): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += c;
      }
    } else {
      if (c === '"') {
        inQuotes = true;
      } else if (c === sep) {
        row.push(field);
        field = "";
      } else if (c === "\n") {
        row.push(field);
        field = "";
        rows.push(row);
        row = [];
      } else if (c === "\r") {
        // skip — CRLF handled on \n
      } else {
        field += c;
      }
    }
  }
  if (field !== "" || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows;
}

export function parseCmedCsv(text: string): ParsedCmedEntry[] {
  // Pick delimiter by counting occurrences in the first ~10k chars: the first
  // line is usually metadata ("DADOS COMPILADOS PELA CMED..." with no
  // separators), so a one-line sniff would default wrong.
  const sample = text.slice(0, 10_000);
  const semi = (sample.match(/;/g) ?? []).length;
  const comma = (sample.match(/,/g) ?? []).length;
  const sep = semi >= comma ? ";" : ",";
  const matrix = parseCsv(text, sep);

  const headerIdx = findHeaderRowIndex(matrix);
  if (headerIdx === -1) {
    throw new Error(
      "Não encontrei o cabeçalho da CMED (nenhuma linha com SUBSTÂNCIA + CÓDIGO GGREM nos primeiros 200 registros).",
    );
  }

  const header = (matrix[headerIdx] as unknown[]).map((c) =>
    typeof c === "string" ? c.trim() : c == null ? "" : String(c).trim(),
  );

  const entries: ParsedCmedEntry[] = [];
  for (let i = headerIdx + 1; i < matrix.length; i++) {
    const cells = matrix[i] ?? [];
    const row: Record<string, unknown> = {};
    for (let j = 0; j < header.length; j++) {
      const key = header[j];
      if (!key) continue;
      row[key] = cells[j];
    }
    const parsed = mapCmedRow(row);
    if (parsed) entries.push(parsed);
  }
  return entries;
}

/**
 * Upsert a parsed CMED catalog into the DB. Uses cmedGgrem as the row key so
 * subsequent syncs update prices and metadata instead of duplicating.
 *
 * Within each chunk we run a transaction; chunks run sequentially so we
 * don't exhaust the connection pool on Supabase.
 */
export async function upsertCmedEntries(
  prisma: PrismaClient,
  entries: ParsedCmedEntry[],
  options: { chunkSize?: number; onProgress?: (p: ImportProgress) => void } = {},
): Promise<ImportProgress> {
  const chunkSize = Math.max(1, options.chunkSize ?? 50);
  const progress: ImportProgress = { total: entries.length, processed: 0 };

  for (let i = 0; i < entries.length; i += chunkSize) {
    const chunk = entries.slice(i, i + chunkSize);
    await prisma.$transaction(
      async (tx) => {
        for (const entry of chunk) {
          // pmcMax is Decimal? — Prisma accepts string for Decimal inputs and
          // sidesteps the tuple-vs-array overload friction we'd hit if we
          // passed `prisma.medicationCatalog.upsert(...)` calls inside an
          // array to $transaction.
          const pmcMax = entry.pmcMax === null ? null : entry.pmcMax.toString();
          const data = {
            cmedGgrem: entry.cmedGgrem,
            activeIngredient: entry.activeIngredient,
            brandName: entry.brandName,
            dosage: entry.dosage,
            form: entry.form,
            manufacturerName: entry.manufacturerName,
            manufacturerCnpj: entry.manufacturerCnpj,
            anvisaCode: entry.anvisaCode,
            ean: entry.ean,
            therapeuticClass: entry.therapeuticClass,
            productType: entry.productType,
            pmcMax,
          };
          await tx.medicationCatalog.upsert({
            where: { cmedGgrem: entry.cmedGgrem },
            create: data,
            update: data,
          });
        }
      },
      { timeout: 60_000 },
    );
    progress.processed += chunk.length;
    options.onProgress?.({ ...progress });
  }

  return progress;
}

export async function importCmed(
  prisma: PrismaClient,
  options: ImportOptions = {},
): Promise<ImportProgress & { url: string; durationMs: number }> {
  const url = options.url ?? process.env.CMED_URL ?? DEFAULT_CMED_URL;
  const t0 = Date.now();

  const csv = await fetchCmedCsv(url);
  const entries = parseCmedCsv(csv);
  const progress = await upsertCmedEntries(prisma, entries, {
    chunkSize: options.chunkSize,
    onProgress: options.onProgress,
  });

  return { ...progress, url, durationMs: Date.now() - t0 };
}
