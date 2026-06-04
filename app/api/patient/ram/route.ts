import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { RAMSeverity } from "@prisma/client";
import { resolvePatientFromRequest } from "@/lib/patient-session";

const VALID = new Set(Object.values(RAMSeverity));

/** POST /api/patient/ram - patient reports an adverse drug reaction (→ staff inbox). */
export async function POST(req: Request) {
  try {
    const p = await resolvePatientFromRequest(req);
    if (!p) return NextResponse.json({ ok: false, error: "Sessão inválida" }, { status: 401 });
    const b = (await req.json().catch(() => ({}))) as { symptoms?: unknown; severity?: string; freeText?: string };

    const symptoms = Array.isArray(b.symptoms) ? b.symptoms.filter((s) => typeof s === "string").slice(0, 20).map((s) => (s as string).slice(0, 120)) : [];
    const freeText = typeof b.freeText === "string" ? b.freeText.trim().slice(0, 2000) : "";
    if (symptoms.length === 0 && freeText.length === 0) {
      return NextResponse.json({ ok: false, error: "Descreva ao menos um sintoma" }, { status: 400 });
    }
    const severity = (b.severity && VALID.has(b.severity as RAMSeverity) ? b.severity : "MODERATE") as RAMSeverity;

    const ram = await prisma.rAMReport.create({
      data: { patientId: p.id, symptoms, freeText: freeText || null, severity, status: "PENDING_REVIEW" },
      select: { id: true },
    });

    // Surface it in the pharmacy thread so the team sees it promptly.
    const patient = await prisma.patient.findUnique({ where: { id: p.id }, select: { name: true } });
    await prisma.patientMessage.create({
      data: {
        patientId: p.id, pharmacyId: p.pharmacyId, direction: "FROM_PATIENT",
        body: `⚠️ Relato de reação adversa (${severity}): ${[...symptoms, freeText].filter(Boolean).join(" · ").slice(0, 500)}`,
      },
    }).catch(() => {});

    return NextResponse.json({ ok: true, id: ram.id, patient: patient?.name }, { status: 201 });
  } catch {
    return NextResponse.json({ ok: false, error: "Erro" }, { status: 500 });
  }
}
