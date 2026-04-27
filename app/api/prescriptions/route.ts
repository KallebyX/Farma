import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/session";
import { ForbiddenError, UnauthorizedError, isAtLeast } from "@/lib/auth/permissions";
import { Role } from "@prisma/client";
import { createPrescriptionSchema } from "@/lib/patients/schema";
import { addPrescription, PatientConflictError } from "@/lib/patients/create";

export async function POST(req: Request) {
  try {
    const ctx = await requireSession();
    if (!isAtLeast(ctx.role, Role.ATTENDANT)) {
      return NextResponse.json({ ok: false, error: "Sem permissão" }, { status: 403 });
    }

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ ok: false, error: "JSON inválido" }, { status: 400 });
    }

    const parsed = createPrescriptionSchema.safeParse(body);
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

    const prescription = await addPrescription(ctx, parsed.data);
    return NextResponse.json({ ok: true, prescription });
  } catch (err) {
    if (err instanceof UnauthorizedError) {
      return NextResponse.json({ ok: false, error: err.message }, { status: 401 });
    }
    if (err instanceof ForbiddenError) {
      return NextResponse.json({ ok: false, error: err.message }, { status: 403 });
    }
    if (err instanceof PatientConflictError) {
      return NextResponse.json({ ok: false, error: err.message }, { status: err.status });
    }
    console.error("[api/prescriptions POST]", err);
    return NextResponse.json({ ok: false, error: "Erro inesperado" }, { status: 500 });
  }
}
