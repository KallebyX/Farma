import { describe, it, expect } from "vitest";
import { checkEnv } from "@/lib/env";

const baseValid = {
  DATABASE_URL: "postgresql://user:pass@host:6543/db",
  DIRECT_URL: "postgresql://user:pass@host:5432/db",
  NEXTAUTH_SECRET: "a".repeat(40),
  NEXTAUTH_URL: "https://farma.app",
  APP_URL: "https://farma.app",
};

describe("checkEnv", () => {
  it("passes for a complete valid env", () => {
    const r = checkEnv(baseValid as unknown as NodeJS.ProcessEnv);
    expect(r.ok).toBe(true);
  });

  it("rejects placeholder values", () => {
    const r = checkEnv({
      ...baseValid,
      DATABASE_URL: "postgresql://placeholder",
    } as unknown as NodeJS.ProcessEnv);
    expect(r.ok).toBe(false);
  });

  it("rejects short NEXTAUTH_SECRET", () => {
    const r = checkEnv({
      ...baseValid,
      NEXTAUTH_SECRET: "short",
    } as unknown as NodeJS.ProcessEnv);
    expect(r.ok).toBe(false);
  });

  it("rejects malformed URL", () => {
    const r = checkEnv({
      ...baseValid,
      NEXTAUTH_URL: "farma.app",
    } as unknown as NodeJS.ProcessEnv);
    expect(r.ok).toBe(false);
  });

  it("warns about missing optional production deps", () => {
    const r = checkEnv({
      ...baseValid,
      NODE_ENV: "production",
    } as unknown as NodeJS.ProcessEnv);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.warnings.some((w) => w.includes("RESEND"))).toBe(true);
      expect(r.warnings.some((w) => w.includes("CRON_SECRET"))).toBe(true);
    }
  });

  it("warns about http:// in production", () => {
    const r = checkEnv({
      ...baseValid,
      NODE_ENV: "production",
      NEXTAUTH_URL: "http://farma.app",
    } as unknown as NodeJS.ProcessEnv);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.warnings.some((w) => w.includes("https"))).toBe(true);
    }
  });

  it("does not warn about http://localhost", () => {
    const r = checkEnv({
      ...baseValid,
      NODE_ENV: "production",
      NEXTAUTH_URL: "http://localhost:3000",
    } as unknown as NodeJS.ProcessEnv);
    if (r.ok) {
      expect(r.warnings.some((w) => w.includes("http://localhost"))).toBe(false);
    }
  });
});
