import { NextResponse } from "next/server";
import {
  resendInvitation,
  InvitationConflictError,
  RateLimitError,
} from "@/lib/invitations/create";
import {
  ForbiddenError,
  UnauthorizedError,
  canManageInvitations,
} from "@/lib/auth/permissions";
import { requireSession } from "@/lib/auth/session";

export async function POST(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireSession();
    if (!canManageInvitations(session.role)) {
      return NextResponse.json({ ok: false, error: "Sem permissão" }, { status: 403 });
    }
    const { id } = await ctx.params;
    const result = await resendInvitation(session, id);
    return NextResponse.json({
      ok: true,
      inviteUrl: result.inviteUrl,
      deliveries: result.deliveries,
    });
  } catch (err) {
    if (err instanceof UnauthorizedError) {
      return NextResponse.json({ ok: false, error: err.message }, { status: 401 });
    }
    if (err instanceof ForbiddenError) {
      return NextResponse.json({ ok: false, error: err.message }, { status: 403 });
    }
    if (err instanceof RateLimitError) {
      return NextResponse.json(
        { ok: false, error: "Muitos reenvios — aguarde alguns instantes" },
        { status: 429 },
      );
    }
    if (err instanceof InvitationConflictError) {
      return NextResponse.json({ ok: false, error: err.message }, { status: err.status });
    }
    console.error("[api/invitations/:id/resend] failure", err);
    return NextResponse.json({ ok: false, error: "Erro inesperado" }, { status: 500 });
  }
}
