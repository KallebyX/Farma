import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/auth/session";
import { UnauthorizedError, isAtLeast } from "@/lib/auth/permissions";
import { Role, DosageForm, Prisma } from "@prisma/client";
import { z } from "zod";

const createMedicationSchema = z.object({
  brandName: z.string().trim().min(1, "Nome comercial obrigatório").max(200),
  activeIngredient: z.string().trim().min(1, "Princípio ativo obrigatório").max(200),
  dosage: z.string().trim().min(1, "Dosagem obrigatória").max(50),
  form: z.nativeEnum(DosageForm, { required_error: "Forma farmacêutica obrigatória" }),
  manufacturerName: z.string().trim().max(200).optional(),
  therapeuticClass: z.string().trim().max(100).optional(),
});

export async function POST(req: Request) {
  try {
    const ctx = await requireSession();
    if (!isAtLeast(ctx.role, Role.PHARMACIST)) {
      return NextResponse.json({ ok: false, error: "Sem permissão" }, { status: 403 });
    }

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ ok: false, error: "JSON inválido" }, { status: 400 });
    }

    const parsed = createMedicationSchema.safeParse(body);
    if (!parsed.success) {
      const fieldErrors: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        const path = issue.path[0];
        if (typeof path === "string" && !fieldErrors[path]) {
          fieldErrors[path] = issue.message;
        }
      }
      return NextResponse.json({ ok: false, fieldErrors, error: "Dados inválidos" }, { status: 400 });
    }

    const { brandName, activeIngredient, dosage, form, manufacturerName, therapeuticClass } =
      parsed.data;

    // Check against the actual unique constraint: [brandName, dosage, form, manufacturerCnpj]
    // Since manufacturerCnpj is not collected in the form, it defaults to null.
    const existing = await prisma.medicationCatalog.findFirst({
      where: {
        brandName: { equals: brandName, mode: "insensitive" },
        dosage: { equals: dosage, mode: "insensitive" },
        form,
        manufacturerCnpj: null,
      },
    });
    if (existing) {
      return NextResponse.json(
        { ok: false, error: "Já existe um medicamento com esse nome, dosagem e forma" },
        { status: 409 },
      );
    }

    const medication = await prisma.medicationCatalog.create({
      data: { brandName, activeIngredient, dosage, form, manufacturerName, therapeuticClass },
    });

    revalidatePath("/catalog");
    return NextResponse.json({ ok: true, medication }, { status: 201 });
  } catch (err) {
    if (err instanceof UnauthorizedError) {
      return NextResponse.json({ ok: false, error: err.message }, { status: 401 });
    }
    if (
      err instanceof Prisma.PrismaClientKnownRequestError &&
      err.code === "P2002"
    ) {
      return NextResponse.json(
        { ok: false, error: "Já existe um medicamento com esse nome, dosagem e forma" },
        { status: 409 },
      );
    }
    console.error("[api/catalog POST]", err);
    return NextResponse.json({ ok: false, error: "Erro inesperado" }, { status: 500 });
  }
}
