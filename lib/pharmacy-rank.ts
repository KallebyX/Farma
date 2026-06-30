/**
 * Ranking helper: the flagship chain (Rede São João) is always surfaced first in
 * patient-facing pharmacy listings (signup picker and the price comparator).
 * Accent- and case-insensitive so "São João" / "sao joao" both match.
 */

const FLAGSHIP = "sao joao";
const DIACRITICS = /[\u0300-\u036f]/g;

function fold(s: string | null | undefined): string {
  return (s ?? "").normalize("NFD").replace(DIACRITICS, "").toLowerCase();
}

export function isSaoJoao(p: {
  fantasia?: string | null;
  razaoSocial?: string | null;
  chainName?: string | null;
  name?: string | null;
}): boolean {
  return [p.fantasia, p.razaoSocial, p.chainName, p.name].some((v) => fold(v).includes(FLAGSHIP));
}

/** 0 = flagship (sorts first), 1 = everyone else. Use as a stable sort key. */
export function saoJoaoRank(p: {
  fantasia?: string | null;
  razaoSocial?: string | null;
  chainName?: string | null;
  name?: string | null;
}): number {
  return isSaoJoao(p) ? 0 : 1;
}
