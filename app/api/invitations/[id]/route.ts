import { NextResponse } from "next/server";
import { revokeInvitation, InvitationConflictError } from "@/lib/invitations/create";
import {
  ForbiddenError,
  UnauthorizedError,
  canManageInvitations,
} from "@/lib/auth/permissions";
import { requireSession } from "@/lib/auth/session";

export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireSession();
    if (!canManageInvitations(session.role)) {
      return NextResponse.json({ ok: false, error: "Sem permissão" }, { status: 403 });
    }
    const { id } = await ctx.params;
    await revokeInvitation(session, id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof UnauthorizedError) {
      return NextResponse.json({ ok: false, error: err.message }, { status: 401 });
    }
    if (err instanceof ForbiddenError) {
      return NextResponse.json({ ok: false, error: err.message }, { status: 403 });
    }
    if (err instanceof InvitationConflictError) {
      return NextResponse.json({ ok: false, error: err.message }, { status: err.status });
    }
    console.error("[api/invitations/:id] failure", err);
    return NextResponse.json({ ok: false, error: "Erro inesperado" }, { status: 500 });
  }
}
