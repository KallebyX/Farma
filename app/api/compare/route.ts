import { NextResponse } from "next/server";
import { searchNearby } from "@/lib/compare";

/** GET /api/compare?term=&lat=&lng= - public price/stock comparator across pharmacies. */
export async function GET(req: Request) {
  const u = new URL(req.url);
  const term = u.searchParams.get("term") ?? "";
  const lat = u.searchParams.get("lat");
  const lng = u.searchParams.get("lng");
  if (term.trim().length < 2) return NextResponse.json({ ok: false, error: "Informe ao menos 2 caracteres" }, { status: 400 });
  const results = await searchNearby(term, lat ? Number(lat) : undefined, lng ? Number(lng) : undefined);
  return NextResponse.json({ ok: true, results });
}
