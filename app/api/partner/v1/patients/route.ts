import { NextResponse } from "next/server";
import { z } from "zod";
import { authenticatePartner, hasScope } from "@/lib/partner/auth";
import { prisma } from "@/lib/db";
import { emitWebhook } from "@/lib/webhooks/dispatch";

/**
 * Partner Data API v1 - lets a pharmacy integrate its own system.
 * Auth: Bearer API key (scoped to the issuing pharmacy → automatic tenant
 * isolation). GET lists patients; POST upserts a patient by phone.
 */

const createSchema = z.object({
  name: z.string().trim().min(2).max(120),
  phone: z.string().trim().regex(/^\+\d{10,15}$/, "E.164"),
  cpf: z.string().trim().regex(/^\d{11}$/).optional(),
  birthDate: z.string().datetime().optional(),
  consentGiven: z.boolean().optional(),
});

export async function GET(req: Request) {
  const auth = await authenticatePartner(req);
  if (!auth || !hasScope(auth, "patients:read")) {
    return NextResponse.json({ ok: false, error: "API key inválida ou sem escopo" }, { status: 401 });
  }
  const url = new URL(req.url);
  const take = Math.min(Number(url.searchParams.get("limit") ?? 50), 200);
  const patients = await prisma.patient.findMany({
    where: { pharmacyId: auth.pharmacyId },
    orderBy: { createdAt: "desc" },
    take,
    select: { id: true, name: true, phone: true, status: true, createdAt: true },
  });
  return NextResponse.json({ ok: true, data: patients });
}

export async function POST(req: Request) {
  const auth = await authenticatePartner(req);
  if (!auth || !hasScope(auth, "patients:write")) {
    return NextResponse.json({ ok: false, error: "API key inválida ou sem escopo" }, { status: 401 });
  }
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "JSON inválido" }, { status: 400 });
  }
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "Dados inválidos", issues: parsed.error.issues }, { status: 400 });
  }
  const d = parsed.data;

  // A partner key has no user; attribute creation to the pharmacy's first OWNER.
  const owner = await prisma.membership.findFirst({
    where: { pharmacyId: auth.pharmacyId, role: "OWNER", status: "ACTIVE" },
    orderBy: { joinedAt: "asc" },
    select: { userId: true },
  });
  if (!owner) return NextResponse.json({ ok: false, error: "Farmácia sem proprietário" }, { status: 409 });

  const existing = await prisma.patient.findUnique({
    where: { pharmacyId_phone: { pharmacyId: auth.pharmacyId, phone: d.phone } },
  });

  const patient = existing
    ? await prisma.patient.update({
        where: { id: existing.id },
        data: { name: d.name, cpf: d.cpf, birthDate: d.birthDate ? new Date(d.birthDate) : undefined },
      })
    : await prisma.patient.create({
        data: {
          pharmacyId: auth.pharmacyId,
          name: d.name,
          phone: d.phone,
          cpf: d.cpf,
          birthDate: d.birthDate ? new Date(d.birthDate) : undefined,
          consentGiven: d.consentGiven ?? false,
          consentDate: d.consentGiven ? new Date() : undefined,
          createdById: owner.userId,
        },
      });

  if (!existing) {
    void emitWebhook(auth.pharmacyId, "patient.created", { patientId: patient.id, phone: patient.phone });
  }
  return NextResponse.json({ ok: true, data: { id: patient.id }, created: !existing }, { status: existing ? 200 : 201 });
}
