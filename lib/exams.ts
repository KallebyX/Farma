import { prisma } from "@/lib/db";
import {
  buildExamKey, uploadObject, storageConfigured,
  EXAM_ALLOWED_TYPES, EXAM_MAX_BYTES,
} from "@/lib/storage";

/** Shared exam-creation path used by both staff and patient upload routes. */
export type CreateExamArgs = {
  patientId: string;
  pharmacyId: string;
  title: string;
  category?: string | null;
  file: File;
  uploadedBy: string; // userId (staff) or "patient"
};

export type CreateExamResult =
  | { ok: true; exam: { id: string; title: string; fileName: string; createdAt: Date } }
  | { ok: false; status: number; error: string };

export async function createExamFromFile(args: CreateExamArgs): Promise<CreateExamResult> {
  if (!storageConfigured()) {
    return { ok: false, status: 503, error: "Armazenamento de exames não configurado (SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY)" };
  }
  const { file, title } = args;
  if (!(file instanceof File) || file.size === 0) return { ok: false, status: 400, error: "Arquivo obrigatório" };
  if (title.trim().length < 2) return { ok: false, status: 400, error: "Informe um título" };
  if (file.size > EXAM_MAX_BYTES) return { ok: false, status: 413, error: "Arquivo acima de 10 MB" };
  if (!EXAM_ALLOWED_TYPES.has(file.type)) return { ok: false, status: 415, error: "Tipo não suportado (PDF, JPG, PNG, HEIC, WebP)" };

  const key = buildExamKey(args.pharmacyId, args.patientId, file.name);
  const up = await uploadObject(key, Buffer.from(await file.arrayBuffer()), file.type);
  if (!up.ok) return { ok: false, status: 502, error: "Falha ao enviar o arquivo" };

  const exam = await prisma.exam.create({
    data: {
      patientId: args.patientId, pharmacyId: args.pharmacyId,
      title: title.trim(), category: args.category?.slice(0, 60) ?? null,
      fileKey: key, fileName: file.name.slice(0, 200), mimeType: file.type,
      sizeBytes: file.size, uploadedBy: args.uploadedBy,
    },
  });
  return { ok: true, exam: { id: exam.id, title: exam.title, fileName: exam.fileName, createdAt: exam.createdAt } };
}

const examSelect = {
  id: true, title: true, category: true, fileName: true, mimeType: true,
  sizeBytes: true, status: true, uploadedBy: true, createdAt: true,
} as const;

export function listExamsForPatient(patientId: string, pharmacyId?: string) {
  return prisma.exam.findMany({
    where: { patientId, ...(pharmacyId ? { pharmacyId } : {}) },
    orderBy: { createdAt: "desc" },
    select: examSelect,
  });
}
