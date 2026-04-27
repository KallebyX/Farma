import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/auth/session";
import { UnauthorizedError } from "@/lib/auth/permissions";

export async function GET(req: Request) {
  try {
    await requireSession();
    const url = new URL(req.url);
    const q = url.searchParams.get("q")?.trim() ?? "";
    if (q.length < 1) return NextResponse.json({ ok: true, results: [] });

    const results = await prisma.medicationCatalog.findMany({
      where: {
        OR: [
          { brandName: { contains: q, mode: "insensitive" } },
          { activeIngredient: { contains: q, mode: "insensitive" } },
        ],
      },
      orderBy: [{ brandName: "asc" }, { dosage: "asc" }],
      take: 20,
    });

    return NextResponse.json({ ok: true, results });
  } catch (err) {
    if (err instanceof UnauthorizedError) {
      return NextResponse.json({ ok: false, error: err.message }, { status: 401 });
    }
    return NextResponse.json({ ok: false, error: "Erro" }, { status: 500 });
  }
}
