import { NextResponse } from "next/server";
import { acceptInvitationSchema } from "@/lib/invitations/schema";
import { acceptInvitation, InvalidInviteError } from "@/lib/invitations/accept";

export async function POST(req: Request, ctx: { params: Promise<{ token: string }> }) {
  const { token } = await ctx.params;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "JSON inválido" }, { status: 400 });
  }

  const parsed = acceptInvitationSchema.safeParse({ ...(body as object), token });
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

  try {
    await acceptInvitation(parsed.data);
    return NextResponse.json({ ok: true, redirectTo: "/dashboard" });
  } catch (err) {
    if (err instanceof InvalidInviteError) {
      return NextResponse.json({ ok: false, error: err.message }, { status: err.status });
    }
    console.error("[accept-invite] failure", err);
    return NextResponse.json(
      { ok: false, error: "Erro inesperado ao aceitar convite" },
      { status: 500 },
    );
  }
}
