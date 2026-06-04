import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/session";
import { UnauthorizedError } from "@/lib/auth/permissions";
import { prisma } from "@/lib/db";

const select = { id: true, name: true, priceCents: true, stock: true, couponPct: true, active: true } as const;

/** GET /api/products - this pharmacy's catalog. */
export async function GET() {
  try {
    const ctx = await requireSession();
    const products = await prisma.pharmacyProduct.findMany({ where: { pharmacyId: ctx.pharmacyId }, orderBy: { name: "asc" }, select });
    return NextResponse.json({ ok: true, products });
  } catch (err) {
    if (err instanceof UnauthorizedError) return NextResponse.json({ ok: false, error: err.message }, { status: 401 });
    return NextResponse.json({ ok: false, error: "Erro" }, { status: 500 });
  }
}

/** POST /api/products - add a catalog item. */
export async function POST(req: Request) {
  try {
    const ctx = await requireSession();
    const b = (await req.json().catch(() => ({}))) as { name?: string; priceCents?: number; stock?: number; couponPct?: number };
    const name = (b.name ?? "").trim();
    const priceCents = Math.round(Number(b.priceCents));
    if (name.length < 2 || !Number.isFinite(priceCents) || priceCents < 0) {
      return NextResponse.json({ ok: false, error: "Nome e preço válidos são obrigatórios" }, { status: 400 });
    }
    const product = await prisma.pharmacyProduct.create({
      data: {
        pharmacyId: ctx.pharmacyId, name: name.slice(0, 160), priceCents,
        stock: Math.max(0, Math.floor(Number(b.stock) || 0)),
        couponPct: b.couponPct != null ? Math.max(0, Math.min(90, Math.floor(Number(b.couponPct)))) : null,
      },
      select,
    });
    return NextResponse.json({ ok: true, product }, { status: 201 });
  } catch (err) {
    if (err instanceof UnauthorizedError) return NextResponse.json({ ok: false, error: err.message }, { status: 401 });
    return NextResponse.json({ ok: false, error: "Erro" }, { status: 500 });
  }
}

/** DELETE /api/products?id= - remove a catalog item (tenant-scoped). */
export async function DELETE(req: Request) {
  try {
    const ctx = await requireSession();
    const id = new URL(req.url).searchParams.get("id");
    if (!id) return NextResponse.json({ ok: false, error: "id obrigatório" }, { status: 400 });
    await prisma.pharmacyProduct.deleteMany({ where: { id, pharmacyId: ctx.pharmacyId } });
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof UnauthorizedError) return NextResponse.json({ ok: false, error: err.message }, { status: 401 });
    return NextResponse.json({ ok: false, error: "Erro" }, { status: 500 });
  }
}
