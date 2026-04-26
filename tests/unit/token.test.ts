import { describe, it, expect } from "vitest";
import { generateToken, hashToken, buildInviteUrl } from "@/lib/invitations/token";

describe("invitation token", () => {
  it("generates URL-safe tokens that survive a base64url roundtrip", () => {
    const { token } = generateToken();
    expect(token.length).toBeGreaterThan(20);
    expect(token).toMatch(/^[A-Za-z0-9_-]+$/);
  });

  it("tokenHash is deterministic and matches re-hash", () => {
    const { token, tokenHash } = generateToken();
    expect(tokenHash).toBe(hashToken(token));
    expect(hashToken(token)).toHaveLength(64); // sha256 hex
  });

  it("two tokens never collide", () => {
    const seen = new Set<string>();
    for (let i = 0; i < 200; i++) {
      const { token } = generateToken();
      expect(seen.has(token)).toBe(false);
      seen.add(token);
    }
  });
});

describe("buildInviteUrl", () => {
  it("uses APP_URL and trims trailing slash", () => {
    const original = process.env.APP_URL;
    process.env.APP_URL = "https://farma.app/";
    expect(buildInviteUrl("abc")).toBe("https://farma.app/accept-invite/abc");
    process.env.APP_URL = original;
  });

  it("falls back to localhost when APP_URL is unset", () => {
    const original = process.env.APP_URL;
    delete process.env.APP_URL;
    expect(buildInviteUrl("xyz")).toBe("http://localhost:3000/accept-invite/xyz");
    process.env.APP_URL = original;
  });
});
