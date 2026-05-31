import { randomUUID } from "node:crypto";

/**
 * Supabase Storage access via the REST API (no SDK dependency). Files are
 * uploaded server-side using the service-role key, which bypasses storage RLS —
 * so the bucket stays private and every read goes through a short-lived signed
 * URL minted by our own authorization checks.
 *
 * Activation needs SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY in the environment.
 * When absent, storageConfigured() is false and callers degrade gracefully.
 */

const SUPABASE_URL = (process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").replace(/\/+$/, "");
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const BUCKET = process.env.SUPABASE_EXAMS_BUCKET ?? "exams";

export function storageConfigured(): boolean {
  return Boolean(SUPABASE_URL && SERVICE_KEY);
}

/** Sanitize a user-supplied filename into something safe for an object key. */
export function safeFileName(name: string): string {
  const base = name.normalize("NFKD").replace(/[^\w.\- ]+/g, "").replace(/\s+/g, "_").slice(-80);
  return base || "arquivo";
}

/** Object key: <pharmacyId>/<patientId>/<uuid>-<filename>. */
export function buildExamKey(pharmacyId: string, patientId: string, fileName: string): string {
  return `${pharmacyId}/${patientId}/${randomUUID()}-${safeFileName(fileName)}`;
}

function encodePath(path: string): string {
  return path.split("/").map(encodeURIComponent).join("/");
}

function authHeaders(): Record<string, string> {
  return { Authorization: `Bearer ${SERVICE_KEY}`, apikey: SERVICE_KEY as string };
}

/** Uploads bytes to the private bucket. */
export async function uploadObject(
  path: string,
  body: Buffer | ArrayBuffer | Uint8Array,
  contentType: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!storageConfigured()) return { ok: false, error: "storage_not_configured" };
  const src = Buffer.isBuffer(body) ? body : Buffer.from(body as ArrayBuffer);
  // Copy into a fresh ArrayBuffer-backed view so the body type is a clean BodyInit.
  const bytes = new Uint8Array(src.byteLength);
  bytes.set(src);
  try {
    const res = await fetch(`${SUPABASE_URL}/storage/v1/object/${BUCKET}/${encodePath(path)}`, {
      method: "POST",
      headers: { ...authHeaders(), "Content-Type": contentType || "application/octet-stream", "x-upsert": "true", "cache-control": "3600" },
      body: bytes,
      signal: AbortSignal.timeout(20000),
    });
    if (!res.ok) return { ok: false, error: `upload_failed_${res.status}` };
    return { ok: true };
  } catch {
    return { ok: false, error: "upload_error" };
  }
}

/** Mints a short-lived signed GET URL for a stored object, or null. */
export async function signedDownloadUrl(path: string, expiresIn = 300): Promise<string | null> {
  if (!storageConfigured()) return null;
  try {
    const res = await fetch(`${SUPABASE_URL}/storage/v1/object/sign/${BUCKET}/${encodePath(path)}`, {
      method: "POST",
      headers: { ...authHeaders(), "Content-Type": "application/json" },
      body: JSON.stringify({ expiresIn }),
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) return null;
    const j = (await res.json()) as { signedURL?: string };
    return j.signedURL ? `${SUPABASE_URL}/storage/v1${j.signedURL}` : null;
  } catch {
    return null;
  }
}

/** Deletes an object (best-effort). */
export async function removeObject(path: string): Promise<boolean> {
  if (!storageConfigured()) return false;
  try {
    const res = await fetch(`${SUPABASE_URL}/storage/v1/object/${BUCKET}/${encodePath(path)}`, {
      method: "DELETE",
      headers: authHeaders(),
      signal: AbortSignal.timeout(10000),
    });
    return res.ok;
  } catch {
    return false;
  }
}

export const EXAM_MAX_BYTES = 10 * 1024 * 1024; // 10 MB
export const EXAM_ALLOWED_TYPES = new Set([
  "application/pdf", "image/jpeg", "image/png", "image/heic", "image/heif", "image/webp",
]);
