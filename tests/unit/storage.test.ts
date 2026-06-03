import { describe, it, expect } from "vitest";
import { safeFileName, buildExamKey, storageConfigured, EXAM_ALLOWED_TYPES, EXAM_MAX_BYTES } from "@/lib/storage";

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

  it("exposes upload limits", () => {
    expect(EXAM_MAX_BYTES).toBe(10 * 1024 * 1024);
    expect(EXAM_ALLOWED_TYPES.has("application/pdf")).toBe(true);
    expect(EXAM_ALLOWED_TYPES.has("text/html")).toBe(false);
  });
});
