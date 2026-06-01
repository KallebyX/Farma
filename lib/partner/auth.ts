import { randomBytes, createHash, timingSafeEqual } from "node:crypto";
import { prisma } from "@/lib/db";

/**
 * Partner API authentication. Pharmacies integrate their own systems using an
 * API key (Bearer token). We store only a SHA-256 hash of the secret; the
 * plaintext is shown once at creation. Format: mpk_<prefix>_<secret>.
 */

const sha256 = (s: string) => createHash("sha256").update(s).digest("hex");

export type IssuedKey = { id: string; prefix: string; plaintext: string };

/** Creates a new API key for a pharmacy. Returns the plaintext ONCE. */
export async function createApiKey(pharmacyId: string, name: string, scopes: string[] = ["*"]): Promise<IssuedKey> {
  const prefix = `mpk_${randomBytes(4).toString("hex")}`;
  const secret = randomBytes(24).toString("base64url");
  const plaintext = `${prefix}_${secret}`;
  const rec = await prisma.apiKey.create({
    data: { pharmacyId, name, prefix, hash: sha256(plaintext), scopes },
  });
  return { id: rec.id, prefix, plaintext };
}

export type PartnerAuth = { pharmacyId: string; keyId: string; scopes: string[] };

/**
 * Verifies a Bearer token from the Authorization header and returns the
 * authenticated pharmacy context, or null. Updates lastUsedAt best-effort.
 */
export async function authenticatePartner(req: Request): Promise<PartnerAuth | null> {
  const header = req.headers.get("authorization") ?? "";
  const m = /^Bearer\s+(mpk_[a-f0-9]+_[A-Za-z0-9_-]+)$/.exec(header.trim());
  if (!m) return null;
  const plaintext = m[1];
  const prefix = plaintext.split("_").slice(0, 2).join("_"); // mpk_xxxx
  const key = await prisma.apiKey.findUnique({ where: { prefix } });
  if (!key || key.revokedAt) return null;

  const a = Buffer.from(sha256(plaintext));
  const b = Buffer.from(key.hash);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;

  prisma.apiKey.update({ where: { id: key.id }, data: { lastUsedAt: new Date() } }).catch(() => {});
  return { pharmacyId: key.pharmacyId, keyId: key.id, scopes: key.scopes };
}

export function hasScope(auth: PartnerAuth, scope: string): boolean {
  return auth.scopes.includes("*") || auth.scopes.includes(scope);
}
