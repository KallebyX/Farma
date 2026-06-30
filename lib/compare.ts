import { prisma } from "@/lib/db";
import { saoJoaoRank } from "@/lib/pharmacy-rank";

/** Price/stock comparator across pharmacies (pharmacy-configured catalog). */

/** Great-circle distance in km. */
export function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export type CompareResult = {
  productId: string; name: string; priceCents: number; couponPct: number | null; stock: number;
  finalCents: number;
  pharmacy: { id: string; name: string; chainName: string | null; city: string | null; distanceKm: number | null };
};

export async function searchNearby(term: string, lat?: number, lng?: number): Promise<CompareResult[]> {
  const q = term.trim();
  if (q.length < 2) return [];
  const rows = await prisma.pharmacyProduct.findMany({
    where: { active: true, stock: { gt: 0 }, name: { contains: q, mode: "insensitive" } },
    take: 100,
    select: {
      id: true, name: true, priceCents: true, couponPct: true, stock: true,
      pharmacy: { select: { id: true, fantasia: true, razaoSocial: true, chainName: true, city: true, latitude: true, longitude: true } },
    },
  });

  const hasLoc = typeof lat === "number" && typeof lng === "number";
  const results: CompareResult[] = rows.map((r) => {
    const finalCents = r.couponPct ? Math.round(r.priceCents * (1 - r.couponPct / 100)) : r.priceCents;
    const distanceKm = hasLoc && r.pharmacy.latitude != null && r.pharmacy.longitude != null
      ? Math.round(haversineKm(lat!, lng!, r.pharmacy.latitude, r.pharmacy.longitude) * 10) / 10
      : null;
    return {
      productId: r.id, name: r.name, priceCents: r.priceCents, couponPct: r.couponPct, stock: r.stock, finalCents,
      pharmacy: { id: r.pharmacy.id, name: r.pharmacy.fantasia ?? r.pharmacy.razaoSocial, chainName: r.pharmacy.chainName, city: r.pharmacy.city, distanceKm },
    };
  });

  // Rede São João first (flagship), then nearest (when located), then cheapest.
  // Rank from the RAW pharmacy fields (fantasia + razaoSocial + chainName) so a
  // branch whose "São João" branding lives only in razaoSocial is still caught —
  // the collapsed display `name` (fantasia ?? razaoSocial) would miss it.
  const ranked = results.map((res, i) => ({
    res,
    rank: saoJoaoRank({
      fantasia: rows[i].pharmacy.fantasia,
      razaoSocial: rows[i].pharmacy.razaoSocial,
      chainName: rows[i].pharmacy.chainName,
    }),
  }));
  ranked.sort((a, b) => {
    if (a.rank !== b.rank) return a.rank - b.rank;
    const da = a.res.pharmacy.distanceKm, db = b.res.pharmacy.distanceKm;
    if (da != null && db != null && da !== db) return da - db;
    if (da != null && db == null) return -1;
    if (da == null && db != null) return 1;
    return a.res.finalCents - b.res.finalCents;
  });
  return ranked.map((x) => x.res).slice(0, 30);
}
