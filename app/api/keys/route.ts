import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/auth/session";
import { UnauthorizedError, isAtLeast } from "@/lib/auth/permissions";
import { Role } from "@prisma/client";
import { createApiKey } from "@/lib/partner/auth";

/** GET: list this pharmacy's API keys (metadata only). */
export async function GET() {
  try {
    const ctx = await requireSession();
    const keys = await prisma.apiKey.findMany({
      where: { pharmacyId: ctx.pharmacyId },
      orderBy: { createdAt: "desc" },
      select: { id: true, name: true, prefix: true, scopes: true, lastUsedAt: true, revokedAt: true, createdAt: true },
    });
    return NextResponse.json({ ok: true, keys });
  } catch (err) {
    if (err instanceof UnauthorizedError) return NextResponse.json({ ok: false, error: err.message }, { status: 401 });
    return NextResponse.json({ ok: false, error: "Erro" }, { status: 500 });
  }
}

const schema = z.object({
  name: z.string().trim().min(2).max(60),
  scopes: z.array(z.string()).optional(),
});

/** POST: create a new API key (OWNER only). Returns the plaintext ONCE. */
export async function POST(req: Request) {
  try {
    const ctx = await requireSession();
    if (!isAtLeast(ctx.role, Role.OWNER)) {
      return NextResponse.json({ ok: false, error: "Apenas o proprietário pode criar chaves" }, { status: 403 });
    }
    const body = await req.json().catch(() => ({}));
    const parsed = schema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ ok: false, error: "Dados inválidos" }, { status: 400 });

    const issued = await createApiKey(ctx.pharmacyId, parsed.data.name, parsed.data.scopes ?? ["*"]);
    return NextResponse.json({ ok: true, id: issued.id, prefix: issued.prefix, apiKey: issued.plaintext }, { status: 201 });
  } catch (err) {
    if (err instanceof UnauthorizedError) return NextResponse.json({ ok: false, error: err.message }, { status: 401 });
    return NextResponse.json({ ok: false, error: "Erro" }, { status: 500 });
  }
}
