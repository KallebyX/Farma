import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/auth/session";
import { ForbiddenError, UnauthorizedError, isAtLeast } from "@/lib/auth/permissions";
import { Role } from "@prisma/client";
import { createPatientSchema } from "@/lib/patients/schema";
import { createPatient, PatientConflictError } from "@/lib/patients/create";

export async function GET(req: Request) {
  try {
    const ctx = await requireSession();
    const url = new URL(req.url);
    const q = url.searchParams.get("q")?.trim() ?? "";
    const status = url.searchParams.get("status") ?? "ACTIVE";

    const patients = await prisma.patient.findMany({
      where: {
        pharmacyId: ctx.pharmacyId,
        ...(status !== "ALL" ? { status: status as "ACTIVE" | "PAUSED" | "WITHDRAWN" } : {}),
        ...(q
          ? {
              OR: [
                { name: { contains: q, mode: "insensitive" } },
                { phone: { contains: q } },
                { cpf: { contains: q } },
              ],
            }
          : {}),
      },
      include: {
        _count: { select: { prescriptions: true, ramReports: true } },
        prescriptions: {
          where: { status: "ACTIVE" },
          select: {
            id: true,
            medication: { select: { brandName: true, dosage: true } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 100,
    });

    return NextResponse.json({ ok: true, patients });
  } catch (err) {
    return errorResponse(err);
  }
}

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

    const parsed = createPatientSchema.safeParse(body);
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

    const patient = await createPatient(ctx, parsed.data);
    return NextResponse.json({ ok: true, patient });
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
  if (err instanceof PatientConflictError) {
    return NextResponse.json({ ok: false, error: err.message }, { status: err.status });
  }
  console.error("[api/patients] failure", err);
  return NextResponse.json({ ok: false, error: "Erro inesperado" }, { status: 500 });
}
