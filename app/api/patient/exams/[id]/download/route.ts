import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/db";
import { verifyPatientToken } from "@/lib/patient-token";
import { signedDownloadUrl } from "@/lib/storage";

/** GET /api/patient/exams/[id]/download - 302 to a signed URL for the patient's own exam. */
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = req.headers.get("authorization");
  const bearer = auth?.startsWith("Bearer ") ? auth.slice(7) : null;
  const queryToken = new URL(req.url).searchParams.get("t"); // for <a> links that can't set headers
  const cookieToken = (await cookies()).get("mp_hub")?.value ?? null;
  const patientId = verifyPatientToken(bearer ?? queryToken ?? cookieToken);
  if (!patientId) return NextResponse.json({ ok: false, error: "Sessão inválida" }, { status: 401 });

  const { id } = await params;
  const exam = await prisma.exam.findFirst({ where: { id, patientId }, select: { fileKey: true } });
  if (!exam) return NextResponse.json({ ok: false, error: "Exame não encontrado" }, { status: 404 });
  const url = await signedDownloadUrl(exam.fileKey, 120);
  if (!url) return NextResponse.json({ ok: false, error: "Indisponível" }, { status: 503 });
  return NextResponse.redirect(url);
}
