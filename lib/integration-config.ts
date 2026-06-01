import { prisma } from "@/lib/db";
import type { TemplateKey } from "@/lib/whatsapp/client";

/**
 * Singleton integration config stored in the DB (id="default"). Lets infra
 * integrations (WhatsApp/Twilio, e-mail) be configured via the DB/MCP when
 * Vercel env vars aren't writable. Read by the WhatsApp/email clients and merged
 * OVER the env. Cached briefly to avoid a query per send. Secrets live only in
 * the private DB — never in the repo.
 */
export type IntegrationConfig = {
  whatsappProvider?: string | null;
  twilioAccountSid?: string | null;
  twilioAuthToken?: string | null;
  twilioWhatsappFrom?: string | null;
  twilioMessagingServiceSid?: string | null;
  /** Generic fallback Content template (single {{1}} body var). */
  twilioContentSid?: string | null;
  /** Per-category approved Content template SIDs, keyed by TemplateKey. */
  twilioTemplates?: Partial<Record<TemplateKey, string>> | null;
  emailProvider?: string | null;
  resendApiKey?: string | null;
  emailFrom?: string | null;
};

let cache: { at: number; cfg: IntegrationConfig } | null = null;
const TTL_MS = 60_000;

export async function getIntegrationConfig(): Promise<IntegrationConfig> {
  if (cache && Date.now() - cache.at < TTL_MS) return cache.cfg;
  try {
    const row = await prisma.integrationConfig.findUnique({ where: { id: "default" } });
    const cfg: IntegrationConfig = row
      ? { ...row, twilioTemplates: normalizeTemplates(row.twilioTemplates) }
      : {};
    cache = { at: Date.now(), cfg };
    return cfg;
  } catch {
    // Cache the fallback (last good, or empty) so a transient/missing-table
    // error doesn't re-query the DB on every send.
    cache = { at: Date.now(), cfg: cache?.cfg ?? {} };
    return cache.cfg;
  }
}

/** Coerces the JSON column into a string→string map (ignores malformed entries). */
function normalizeTemplates(value: unknown): Partial<Record<TemplateKey, string>> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
    if (typeof v === "string" && v.trim()) out[k] = v.trim();
  }
  return Object.keys(out).length ? (out as Partial<Record<TemplateKey, string>>) : null;
}

/**
 * Resolves the approved ContentSid for a template key, falling back to the
 * generic template. Returns null when nothing is configured (caller sends Body).
 */
export function resolveTemplateSid(cfg: IntegrationConfig, key: TemplateKey): string | null {
  return cfg.twilioTemplates?.[key] ?? cfg.twilioContentSid ?? null;
}

export function clearIntegrationConfigCache(): void {
  cache = null;
}
