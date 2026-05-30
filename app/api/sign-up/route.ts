import { NextResponse } from "next/server";
import { signUpSchema } from "@/lib/auth/sign-up-schema";
import { registerOwner, SignUpError } from "@/lib/auth/sign-up";

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "JSON inválido" }, { status: 400 });
  }

  const parsed = signUpSchema.safeParse(body);
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
    await registerOwner(parsed.data);
    return NextResponse.json({ ok: true, redirectTo: "/dashboard" });
  } catch (err) {
    if (err instanceof SignUpError) {
      const fieldErrors = err.field ? { [err.field]: err.message } : undefined;
      return NextResponse.json(
        { ok: false, fieldErrors, error: err.message },
        { status: err.status },
      );
    }
    console.error("[sign-up] failure", err);
    return NextResponse.json(
      { ok: false, error: "Erro inesperado ao criar conta" },
      { status: 500 },
    );
  }
}
