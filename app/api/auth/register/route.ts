import { NextResponse } from "next/server";
import { registerSchema, registerAccount, RegisterConflictError } from "@/lib/auth/register";

export async function POST(req: Request) {
  try {
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ ok: false, error: "JSON inválido" }, { status: 400 });
    }

    const parsed = registerSchema.safeParse(body);
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

    const result = await registerAccount(parsed.data);
    return NextResponse.json({ ok: true, ...result, redirectTo: "/dashboard" });
  } catch (err) {
    if (err instanceof RegisterConflictError) {
      const fieldErrors = err.field ? { [err.field]: err.message } : undefined;
      return NextResponse.json(
        { ok: false, fieldErrors, error: err.message },
        { status: err.status },
      );
    }
    console.error("[api/auth/register]", err);
    return NextResponse.json({ ok: false, error: "Erro inesperado" }, { status: 500 });
  }
}
