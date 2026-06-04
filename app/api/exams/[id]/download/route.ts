import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/session";
import { UnauthorizedError } from "@/lib/auth/permissions";
import { prisma } from "@/lib/db";
import { signedDownloadUrl } from "@/lib/storage";

/** GET /api/exams/[id]/download - 302 to a short-lived signed URL (staff, tenant-scoped). */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const ctx = await requireSession();
    const { id } = await params;
    const exam = await prisma.exam.findFirst({ where: { id, pharmacyId: ctx.pharmacyId }, select: { fileKey: true } });
    if (!exam) return NextResponse.json({ ok: false, error: "Exame não encontrado" }, { status: 404 });
    const url = await signedDownloadUrl(exam.fileKey, 120);
    if (!url) return NextResponse.json({ ok: false, error: "Indisponível" }, { status: 503 });
    return NextResponse.redirect(url);
  } catch (err) {
    if (err instanceof UnauthorizedError) return NextResponse.json({ ok: false, error: err.message }, { status: 401 });
    return NextResponse.json({ ok: false, error: "Erro" }, { status: 500 });
  }
}
