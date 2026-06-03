import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/session";
import { UnauthorizedError } from "@/lib/auth/permissions";
import { buildExamKey, uploadObject, storageConfigured, EXAM_MAX_BYTES, EXAM_ALLOWED_TYPES } from "@/lib/storage";

/** POST /api/prescriptions/photo (multipart {file, patientId}) — uploads a prescription photo → returns its key. */
export async function POST(req: Request) {
  try {
    const ctx = await requireSession();
    if (!(await storageConfigured())) return NextResponse.json({ ok: false, error: "Armazenamento não configurado (defina em Integrações no banco ou SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY)" }, { status: 503 });
    const form = await req.formData();
    const file = form.get("file");
    const patientId = String(form.get("patientId") ?? "anon");
    if (!(file instanceof File) || file.size === 0) return NextResponse.json({ ok: false, error: "Arquivo obrigatório" }, { status: 400 });
    if (file.size > EXAM_MAX_BYTES) return NextResponse.json({ ok: false, error: "Arquivo acima de 10 MB" }, { status: 413 });
    if (file.type && !EXAM_ALLOWED_TYPES.has(file.type)) return NextResponse.json({ ok: false, error: "Envie PDF ou imagem" }, { status: 415 });

    const key = `rx-photo/${buildExamKey(ctx.pharmacyId, patientId, file.name)}`;
    const up = await uploadObject(key, Buffer.from(await file.arrayBuffer()), file.type || "application/octet-stream");
    if (!up.ok) return NextResponse.json({ ok: false, error: "Falha no upload" }, { status: 502 });
    return NextResponse.json({ ok: true, key }, { status: 201 });
  } catch (err) {
    if (err instanceof UnauthorizedError) return NextResponse.json({ ok: false, error: err.message }, { status: 401 });
    return NextResponse.json({ ok: false, error: "Erro" }, { status: 500 });
  }
}
