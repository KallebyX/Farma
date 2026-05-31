import { NextResponse } from "next/server";
import { searchPharmacies } from "@/lib/patient-register";

/** GET /api/pharmacies/search?q= — public list of pharmacies for patient signup. */
export async function GET(req: Request) {
  const q = new URL(req.url).searchParams.get("q") ?? "";
  const pharmacies = await searchPharmacies(q);
  // Mask the CNPJ a bit; expose enough to disambiguate.
  return NextResponse.json({
    ok: true,
    pharmacies: pharmacies.map((p) => ({
      id: p.id,
      name: p.fantasia ?? p.razaoSocial,
      cnpj: p.cnpj ? `${p.cnpj.slice(0, 2)}.***.***/****-${p.cnpj.slice(-2)}` : null,
    })),
  });
}
