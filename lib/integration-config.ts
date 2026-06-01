import { prisma } from "@/lib/db";

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
  twilioContentSid?: string | null;
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
    const cfg: IntegrationConfig = row ?? {};
    cache = { at: Date.now(), cfg };
    return cfg;
  } catch {
    return cache?.cfg ?? {};
  }
}

export function clearIntegrationConfigCache(): void {
  cache = null;
}
