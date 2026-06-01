import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/session";
import { UnauthorizedError, isAtLeast } from "@/lib/auth/permissions";
import { Role } from "@prisma/client";
import { prisma } from "@/lib/db";

const select = {
  fantasia: true, razaoSocial: true, chainName: true, addressLine: true, city: true, state: true,
  latitude: true, longitude: true, referralEnabled: true, referralPoints: true,
} as const;

/** GET /api/pharmacy/settings — current pharmacy configuration. */
export async function GET() {
  try {
    const ctx = await requireSession();
    const pharmacy = await prisma.pharmacy.findUnique({ where: { id: ctx.pharmacyId }, select });
    return NextResponse.json({ ok: true, pharmacy, canEdit: isAtLeast(ctx.role, Role.OWNER) });
  } catch (err) {
    if (err instanceof UnauthorizedError) return NextResponse.json({ ok: false, error: err.message }, { status: 401 });
    return NextResponse.json({ ok: false, error: "Erro" }, { status: 500 });
  }
}

/** PATCH /api/pharmacy/settings — OWNER updates location, chain and referral config. */
export async function PATCH(req: Request) {
  try {
    const ctx = await requireSession();
    if (!isAtLeast(ctx.role, Role.OWNER)) return NextResponse.json({ ok: false, error: "Apenas o proprietário pode alterar" }, { status: 403 });
    const b = (await req.json().catch(() => ({}))) as Record<string, unknown>;

    const data: Record<string, unknown> = {};
    const str = (v: unknown, max = 120) => (typeof v === "string" ? v.trim().slice(0, max) || null : undefined);
    if ("chainName" in b) data.chainName = str(b.chainName, 80);
    if ("addressLine" in b) data.addressLine = str(b.addressLine, 200);
    if ("city" in b) data.city = str(b.city, 80);
    if ("state" in b) data.state = str(b.state, 2);
    if ("latitude" in b) data.latitude = b.latitude === null || b.latitude === "" ? null : Number(b.latitude);
    if ("longitude" in b) data.longitude = b.longitude === null || b.longitude === "" ? null : Number(b.longitude);
    if ("referralEnabled" in b) data.referralEnabled = Boolean(b.referralEnabled);
    if ("referralPoints" in b) data.referralPoints = Math.max(0, Math.min(100000, Math.floor(Number(b.referralPoints) || 0)));

    // drop NaN coordinates
    if (typeof data.latitude === "number" && isNaN(data.latitude)) data.latitude = null;
    if (typeof data.longitude === "number" && isNaN(data.longitude)) data.longitude = null;

    if (Object.keys(data).length === 0) return NextResponse.json({ ok: false, error: "Nada para atualizar" }, { status: 400 });
    const pharmacy = await prisma.pharmacy.update({ where: { id: ctx.pharmacyId }, data, select });
    return NextResponse.json({ ok: true, pharmacy });
  } catch (err) {
    if (err instanceof UnauthorizedError) return NextResponse.json({ ok: false, error: err.message }, { status: 401 });
    return NextResponse.json({ ok: false, error: "Erro" }, { status: 500 });
  }
}
