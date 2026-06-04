/**
 * Minimal GS1 parser for the DataMatrix/QR on a medicine box (caixa de remédio).
 * Extracts AI 10 (lote) and AI 17 (validade, YYMMDD). Heuristic - the pharmacist
 * confirms/edits the values. Handles the optional symbology prefix and FNC1 (\x1d).
 */
export function parseGs1(raw: string): { lote?: string; validade?: string } {
  if (!raw) return {};
  const s = raw.replace(/^\][A-Za-z]\d/, ""); // drop symbology id (]d2, ]Q3, ]C1…)
  const out: { lote?: string; validade?: string } = {};

  const exp = s.match(/17(\d{6})/);
  if (exp) {
    const yy = exp[1].slice(0, 2), mm = exp[1].slice(2, 4);
    let dd = exp[1].slice(4, 6);
    if (dd === "00") dd = "01"; // GS1 "00" = fim do mês; simplificamos para dia 01
    out.validade = `20${yy}-${mm}-${dd}`;
  }

  const lot =
    s.match(/\x1d10([^\x1d]{1,20})/) ||
    s.match(/17\d{6}10([^\x1d]{1,20})/) ||
    s.match(/10([^\x1d]{1,20})$/);
  if (lot) out.lote = lot[1];

  return out;
}
