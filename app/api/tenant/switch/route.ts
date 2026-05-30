import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireSession, ACTIVE_TENANT_COOKIE } from "@/lib/auth/session";
import { UnauthorizedError } from "@/lib/auth/permissions";

/**
 * Switches the user's active pharmacy (tenant). Validates that the requested
 * pharmacy is one the user actively belongs to before persisting the choice in
 * an httpOnly cookie read by getSessionContext().
 */
export async function POST(req: Request) {
  try {
    const session = await requireSession();

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ ok: false, error: "JSON inválido" }, { status: 400 });
    }

    const pharmacyId = (body as { pharmacyId?: unknown })?.pharmacyId;
    if (typeof pharmacyId !== "string" || !pharmacyId) {
      return NextResponse.json({ ok: false, error: "pharmacyId obrigatório" }, { status: 400 });
    }

    const membership = await prisma.membership.findFirst({
      where: { userId: session.userId, pharmacyId, status: "ACTIVE" },
      select: { pharmacyId: true, role: true },
    });
    if (!membership) {
      return NextResponse.json(
        { ok: false, error: "Você não tem acesso a esta farmácia" },
        { status: 403 },
      );
    }

    const res = NextResponse.json({ ok: true, pharmacyId: membership.pharmacyId });
    res.cookies.set(ACTIVE_TENANT_COOKIE, membership.pharmacyId, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 365,
    });
    return res;
  } catch (err) {
    if (err instanceof UnauthorizedError) {
      return NextResponse.json({ ok: false, error: err.message }, { status: 401 });
    }
    console.error("[api/tenant/switch]", err);
    return NextResponse.json({ ok: false, error: "Erro inesperado" }, { status: 500 });
  }
}
