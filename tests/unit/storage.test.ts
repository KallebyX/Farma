import { describe, it, expect } from "vitest";
import { safeFileName, buildExamKey, storageConfigured, validateStorageUrl, EXAM_ALLOWED_TYPES, EXAM_MAX_BYTES } from "@/lib/storage";

describe("storage helpers", () => {
  it("is not configured without env/DB credentials", async () => {
    // No SUPABASE_URL/SERVICE_ROLE_KEY in env and the DB config read fails → false.
    expect(await storageConfigured()).toBe(false);
  });

  it("sanitizes filenames", () => {
    expect(safeFileName("Hemograma 2024.pdf")).toBe("Hemograma_2024.pdf");
    expect(safeFileName("../../etc/passwd")).not.toContain("/");
    expect(safeFileName("résumé final!.png")).toMatch(/\.png$/);
    expect(safeFileName("")).toBe("arquivo");
  });

  it("builds a namespaced, unique object key", () => {
    const key = buildExamKey("ph1", "pt1", "exame.pdf");
    expect(key.startsWith("ph1/pt1/")).toBe(true);
    expect(key.endsWith("-exame.pdf")).toBe(true);
    expect(buildExamKey("ph1", "pt1", "exame.pdf")).not.toBe(key); // uuid makes it unique
  });

  it("validateStorageUrl: accepts Supabase host from DB, normalizes to origin", () => {
    expect(validateStorageUrl("https://abc.supabase.co", true)).toBe("https://abc.supabase.co");
    expect(validateStorageUrl("https://abc.supabase.co/", true)).toBe("https://abc.supabase.co");
  });
  it("validateStorageUrl: rejects DB-sourced non-Supabase / non-https / non-origin / credentials", () => {
    expect(validateStorageUrl("https://evil.com", true)).toBeNull(); // not a supabase host
    expect(validateStorageUrl("http://abc.supabase.co", true)).toBeNull(); // not https
    expect(validateStorageUrl("https://abc.supabase.co/path?x=1", true)).toBeNull(); // has path/query
    expect(validateStorageUrl("https://abc.supabase.co#frag", true)).toBeNull(); // has hash
    expect(validateStorageUrl("https://user:pass@abc.supabase.co", true)).toBeNull(); // credentials
    expect(validateStorageUrl("https://abc.supabase.co.evil.com", true)).toBeNull(); // suffix spoof
    expect(validateStorageUrl("", true)).toBeNull();
  });
  it("validateStorageUrl: env-sourced allows any https origin (self-host/dev), still origin-only", () => {
    expect(validateStorageUrl("https://storage.local", false)).toBe("https://storage.local");
    expect(validateStorageUrl("https://storage.local/x", false)).toBeNull(); // still must be origin-only
    expect(validateStorageUrl("http://storage.local", false)).toBeNull(); // still https-only
  });

  it("exposes upload limits", () => {
    expect(EXAM_MAX_BYTES).toBe(10 * 1024 * 1024);
    expect(EXAM_ALLOWED_TYPES.has("application/pdf")).toBe(true);
    expect(EXAM_ALLOWED_TYPES.has("text/html")).toBe(false);
  });
});
