import { randomUUID } from "node:crypto";
import { getIntegrationConfig } from "@/lib/integration-config";

/**
 * Supabase Storage access via the REST API (no SDK dependency). Files are
 * uploaded server-side using the service-role key, which bypasses storage RLS —
 * so the bucket stays private and every read goes through a short-lived signed
 * URL minted by our own authorization checks.
 *
 * Config comes from the DB (IntegrationConfig, set via MCP) OVER the environment
 * (SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY), so storage can be activated without
 * Vercel env vars. When neither is set, storageConfigured() is false and callers
 * degrade gracefully.
 */

type StorageCfg = { url: string; key: string; bucket: string };

/**
 * Validates a storage base URL and normalizes it to an ORIGIN (scheme+host, no
 * path/query/hash/credentials). The service-role key is sent as a Bearer token to
 * this URL, so this is security-critical:
 *  - must be https;
 *  - must be origin-only (a path/query/hash/userinfo would break `${url}/storage/v1/…`
 *    and could divert the key to an unintended endpoint);
 *  - when DB-sourced (settable via MCP), the host is locked to Supabase domains so a
 *    tampered IntegrationConfig row can't exfiltrate the key (SSRF). Env-sourced URLs
 *    are trusted (local dev / self-hosted Supabase).
 * Returns the clean origin, or null if invalid.
 */
export function validateStorageUrl(rawUrl: string, fromDb: boolean): string | null {
  if (!rawUrl) return null;
  let u: URL;
  try {
    u = new URL(rawUrl);
  } catch {
    return null;
  }
  if (u.protocol !== "https:") return null;
  if (u.username || u.password) return null;
  if ((u.pathname && u.pathname !== "/") || u.search || u.hash) return null;
  if (fromDb && !/(^|\.)supabase\.(co|in|net)$/i.test(u.hostname)) return null;
  return u.origin;
}

async function resolveStorage(): Promise<StorageCfg | null> {
  // getIntegrationConfig() already swallows errors (returns {}), so no .catch needed.
  const cfg = await getIntegrationConfig();
  const dbUrl = (cfg.supabaseUrl ?? "").trim();
  const envUrl = (process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").trim();
  const key = cfg.supabaseServiceRoleKey ?? process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
  const bucket = cfg.supabaseExamsBucket ?? process.env.SUPABASE_EXAMS_BUCKET ?? "exams";
  // DB takes precedence; a DB-sourced URL is host-restricted, env is trusted.
  const url = dbUrl ? validateStorageUrl(dbUrl, true) : validateStorageUrl(envUrl, false);
  if (!url || !key) return null;
  return { url, key, bucket };
}

export async function storageConfigured(): Promise<boolean> {
  return (await resolveStorage()) !== null;
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

function authHeaders(key: string): Record<string, string> {
  return { Authorization: `Bearer ${key}`, apikey: key };
}

/** Uploads bytes to the private bucket. */
export async function uploadObject(
  path: string,
  body: Buffer | ArrayBuffer | Uint8Array,
  contentType: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const s = await resolveStorage();
  if (!s) return { ok: false, error: "storage_not_configured" };
  const src = Buffer.isBuffer(body) ? body : Buffer.from(body as ArrayBuffer);
  // Copy into a fresh ArrayBuffer-backed view so the body type is a clean BodyInit.
  const bytes = new Uint8Array(src.byteLength);
  bytes.set(src);
  try {
    const res = await fetch(`${s.url}/storage/v1/object/${s.bucket}/${encodePath(path)}`, {
      method: "POST",
      headers: { ...authHeaders(s.key), "Content-Type": contentType || "application/octet-stream", "x-upsert": "true", "cache-control": "3600" },
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
  const s = await resolveStorage();
  if (!s) return null;
  try {
    const res = await fetch(`${s.url}/storage/v1/object/sign/${s.bucket}/${encodePath(path)}`, {
      method: "POST",
      headers: { ...authHeaders(s.key), "Content-Type": "application/json" },
      body: JSON.stringify({ expiresIn }),
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) return null;
    const j = (await res.json()) as { signedURL?: string };
    return j.signedURL ? `${s.url}/storage/v1${j.signedURL}` : null;
  } catch {
    return null;
  }
}

/** Deletes an object (best-effort). */
export async function removeObject(path: string): Promise<boolean> {
  const s = await resolveStorage();
  if (!s) return false;
  try {
    const res = await fetch(`${s.url}/storage/v1/object/${s.bucket}/${encodePath(path)}`, {
      method: "DELETE",
      headers: authHeaders(s.key),
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
