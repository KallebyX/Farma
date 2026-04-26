import { NextResponse } from "next/server";
import { createInvitationSchema } from "@/lib/invitations/schema";
import {
  createInvitation,
  InvitationConflictError,
  RateLimitError,
} from "@/lib/invitations/create";
import {
  ForbiddenError,
  UnauthorizedError,
  canManageInvitations,
} from "@/lib/auth/permissions";
import { requireSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db";

export async function GET() {
  try {
    const ctx = await requireSession();
    if (!canManageInvitations(ctx.role)) {
      return NextResponse.json({ ok: false, error: "Sem permissão" }, { status: 403 });
    }

    const pending = await prisma.invitation.findMany({
      where: { pharmacyId: ctx.pharmacyId, status: "PENDING" },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        email: true,
        role: true,
        crf: true,
        channels: true,
        expiresAt: true,
        createdAt: true,
      },
    });
    return NextResponse.json({ ok: true, pending });
  } catch (err) {
    return errorResponse(err);
  }
}

export async function POST(req: Request) {
  try {
    const ctx = await requireSession();
    if (!canManageInvitations(ctx.role)) {
      return NextResponse.json({ ok: false, error: "Sem permissão" }, { status: 403 });
    }

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ ok: false, error: "JSON inválido" }, { status: 400 });
    }

    const parsed = createInvitationSchema.safeParse(body);
    if (!parsed.success) {
      const fieldErrors: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        const path = issue.path[0];
        if (typeof path === "string" && !fieldErrors[path]) {
          fieldErrors[path] = issue.message;
        }
      }
      return NextResponse.json(
        { ok: false, fieldErrors, error: "Dados inválidos" },
        { status: 400 },
      );
    }

    const result = await createInvitation(ctx, parsed.data);
    return NextResponse.json({
      ok: true,
      invitationId: result.invitationId,
      inviteUrl: result.inviteUrl,
      expiresAt: result.expiresAt,
      deliveries: result.deliveries,
    });
  } catch (err) {
    return errorResponse(err);
  }
}

function errorResponse(err: unknown) {
  if (err instanceof UnauthorizedError) {
    return NextResponse.json({ ok: false, error: err.message }, { status: 401 });
  }
  if (err instanceof ForbiddenError) {
    return NextResponse.json({ ok: false, error: err.message }, { status: 403 });
  }
  if (err instanceof RateLimitError) {
    return NextResponse.json(
      { ok: false, error: "Muitos convites — aguarde alguns instantes" },
      { status: 429 },
    );
  }
  if (err instanceof InvitationConflictError) {
    return NextResponse.json({ ok: false, error: err.message }, { status: err.status });
  }
  console.error("[api/invitations] failure", err);
  return NextResponse.json({ ok: false, error: "Erro inesperado" }, { status: 500 });
}
