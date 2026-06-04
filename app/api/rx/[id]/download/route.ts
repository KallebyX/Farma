import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/session";
import { UnauthorizedError } from "@/lib/auth/permissions";
import { prisma } from "@/lib/db";
import { signedDownloadUrl } from "@/lib/storage";

/** GET /api/rx/[id]/download - staff opens a prescription file via signed URL. */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const ctx = await requireSession();
    const { id } = await params;
    const rx = await prisma.digitalPrescription.findFirst({ where: { id, pharmacyId: ctx.pharmacyId }, select: { fileKey: true } });
    if (!rx) return NextResponse.json({ ok: false, error: "Receita não encontrada" }, { status: 404 });
    const url = await signedDownloadUrl(rx.fileKey, 120);
    if (!url) return NextResponse.json({ ok: false, error: "Indisponível" }, { status: 503 });
    return NextResponse.redirect(url);
  } catch (err) {
    if (err instanceof UnauthorizedError) return NextResponse.json({ ok: false, error: err.message }, { status: 401 });
    return NextResponse.json({ ok: false, error: "Erro" }, { status: 500 });
  }
}
