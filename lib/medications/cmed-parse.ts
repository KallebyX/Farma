import { DosageForm } from "@prisma/client";

/**
 * CMED ("Câmara de Regulação do Mercado de Medicamentos" — Anvisa) publishes
 * a monthly XLS with every regulated medication in Brazil. This module turns
 * a raw row into a MedicationCatalog input.
 *
 * Reference: https://www.gov.br/anvisa/pt-br/assuntos/medicamentos/cmed/precos
 */

export type CmedRow = Record<string, unknown>;

export type ParsedCmedEntry = {
  cmedGgrem: string;
  activeIngredient: string;
  brandName: string;
  dosage: string;
  form: DosageForm;
  manufacturerName: string | null;
  manufacturerCnpj: string | null;
  anvisaCode: string | null;
  ean: string | null;
  therapeuticClass: string | null;
  productType: string | null;
  pmcMax: number | null;
};

const FORM_PATTERNS: Array<[RegExp, DosageForm]> = [
  // Order matters: more specific (longer) tokens come first so they match
  // before generic ones (e.g. "COM REV" before bare "COM").
  [/\b(SOL\s*INJ|PO\s*LIOF\s*INJ|PO\s*INJ|SOL\s*DIL\s*INJ|INJ)\b/, DosageForm.INJECTION],
  // Bare "COM" requires lookahead to a packaging/count token so we don't
  // match the Portuguese preposition in strings like "CONJUNTO COM
  // ACESSORIOS" — those should fall through to OTHER.
  [/\b(COM\s+EFERV|COM\s+SUB|COM\s+REV(?:\s+LIB)?|COM\s+MAST|COM(?=\s+(?:CT|BL|FR|VD|AMP|X|REV|EFERV|MAST)\b)|DRG|DRAG|COMP|COMPRIMIDO)\b/, DosageForm.TABLET],
  [/\b(CAP\s*DURA|CAP\s*MOLE|CAPS?|CAPSULA)\b/, DosageForm.CAPSULE],
  [/\b(SOL\s*ORAL|SUS\s*ORAL|XAR(?:OPE)?|SUSP|EMU|SOL\s*OFT|SOL\s*OTOL|SOL\s*TOP|ELIXIR|SOLUCAO)\b/, DosageForm.LIQUID],
  [/\b(GTS|GOTAS)\b/, DosageForm.DROPS],
  [/\b(CR|CREME)\b/, DosageForm.CREAM],
  [/\b(POM|POMADA|UNG)\b/, DosageForm.OINTMENT],
  [/\b(AER(?:O)?|INAL|SPRAY)\b/, DosageForm.INHALER],
  [/\b(ADES(?:IVO)?)\b/, DosageForm.PATCH],
];

export function parseApresentacao(raw: string): { dosage: string; form: DosageForm } {
  const upper = raw.toUpperCase();
  let form: DosageForm = DosageForm.OTHER;
  let firstMatchIdx = upper.length;

  for (const [pattern, f] of FORM_PATTERNS) {
    const m = upper.match(pattern);
    if (m && m.index !== undefined && m.index < firstMatchIdx) {
      firstMatchIdx = m.index;
      form = f;
    }
  }

  const head = upper.slice(0, firstMatchIdx).trim();
  const dosage = normalizeDosage(head || upper);
  return { dosage, form };
}

function normalizeDosage(s: string): string {
  return s
    .replace(/\s+/g, " ")
    .replace(/[,;]+$/, "")
    .trim()
    .slice(0, 200);
}

const onlyDigits = (s: string) => s.replace(/\D/g, "");

function pickPmcMax(row: CmedRow): number | null {
  // PMC columns vary by tax rate ("PMC 0%", "PMC 12%", ..., "PMC 22% ALC"). We
  // pick the highest one that's a valid number — the consumer-facing ceiling.
  let max: number | null = null;
  for (const [key, value] of Object.entries(row)) {
    if (!key.toUpperCase().startsWith("PMC")) continue;
    const n = parseDecimal(value);
    if (n !== null && (max === null || n > max)) max = n;
  }
  return max;
}

function parseDecimal(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  // CMED uses comma as decimal separator: "12,3456"
  const normalized = trimmed.replace(/\./g, "").replace(",", ".");
  const n = Number(normalized);
  return Number.isFinite(n) ? n : null;
}

function pickEan(row: CmedRow): string | null {
  for (const k of ["EAN 1", "EAN 2", "EAN 3"]) {
    const v = row[k];
    if (v === null || v === undefined) continue;
    const s = String(v).trim();
    if (s && s !== "0" && /^\d{8,14}$/.test(s)) return s;
  }
  return null;
}

function getStr(row: CmedRow, key: string): string | null {
  const v = row[key];
  if (v === null || v === undefined) return null;
  const s = String(v).trim();
  return s ? s : null;
}

/**
 * Map a raw CMED row to our MedicationCatalog shape. Returns null when the
 * row is missing the regulatory key (CÓDIGO GGREM) or essential identity
 * fields — those rows are "empty"/header continuation in the CMED file.
 */
export function mapCmedRow(row: CmedRow): ParsedCmedEntry | null {
  const ggrem = getStr(row, "CÓDIGO GGREM") ?? getStr(row, "CODIGO GGREM");
  const produto = getStr(row, "PRODUTO");
  const apresentacao = getStr(row, "APRESENTAÇÃO") ?? getStr(row, "APRESENTACAO");
  const substancia = getStr(row, "SUBSTÂNCIA") ?? getStr(row, "SUBSTANCIA");
  if (!ggrem || !produto || !apresentacao || !substancia) return null;

  const { dosage, form } = parseApresentacao(apresentacao);
  const cnpj = getStr(row, "CNPJ");
  const lab = getStr(row, "LABORATÓRIO") ?? getStr(row, "LABORATORIO");
  const registro = getStr(row, "REGISTRO");
  const classe = getStr(row, "CLASSE TERAPÊUTICA") ?? getStr(row, "CLASSE TERAPEUTICA");
  const tipo = getStr(row, "TIPO DE PRODUTO (STATUS DO PRODUTO)") ?? getStr(row, "TIPO DE PRODUTO");

  return {
    cmedGgrem: ggrem,
    activeIngredient: substancia.slice(0, 300),
    brandName: produto.slice(0, 200),
    dosage,
    form,
    manufacturerName: lab ? lab.slice(0, 200) : null,
    manufacturerCnpj: cnpj ? onlyDigits(cnpj).slice(0, 14) : null,
    anvisaCode: registro ? registro.slice(0, 50) : null,
    ean: pickEan(row),
    therapeuticClass: classe ? classe.slice(0, 200) : null,
    productType: tipo ? tipo.slice(0, 60) : null,
    pmcMax: pickPmcMax(row),
  };
}

/**
 * Find the header row of a CMED sheet. The file starts with ~50 lines of
 * metadata before the actual table, so we scan for a row containing the
 * canonical column markers.
 */
export function findHeaderRowIndex(rows: unknown[][]): number {
  for (let i = 0; i < Math.min(rows.length, 200); i++) {
    const row = rows[i] ?? [];
    const hasSubstancia = row.some(
      (c) => typeof c === "string" && /SUBST[ÂA]NCIA/i.test(c.trim()),
    );
    const hasGgrem = row.some(
      (c) => typeof c === "string" && /C[ÓO]DIGO\s*GGREM/i.test(c.trim()),
    );
    if (hasSubstancia && hasGgrem) return i;
  }
  return -1;
}
