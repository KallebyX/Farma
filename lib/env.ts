import { z } from "zod";

/**
 * Environment validation. Used by `pnpm check:env` (scripts/check-env.ts) and
 * imported in production-only code paths to fail fast on misconfiguration.
 */

const required = z
  .string()
  .min(1, "obrigatória")
  .refine((v) => !v.includes("placeholder") && !v.includes("changeme"), {
    message: "ainda contém valor placeholder",
  });

const optional = z.string().optional();

export const envSchema = z.object({
  DATABASE_URL: required,
  DIRECT_URL: required,
  NEXTAUTH_SECRET: required.refine((v) => v.length >= 32, {
    message: "deve ter pelo menos 32 caracteres",
  }),
  NEXTAUTH_URL: required.refine((v) => /^https?:\/\//.test(v), {
    message: "deve começar com http:// ou https://",
  }),
  APP_URL: required.refine((v) => /^https?:\/\//.test(v), {
    message: "deve começar com http:// ou https://",
  }),
  RESEND_API_KEY: optional,
  EMAIL_FROM: optional,
  CRON_SECRET: optional,
  INVITE_TTL_DAYS: optional,
  WHATSAPP_API_KEY: optional,
  WHATSAPP_INSTANCE_ID: optional,
  WHATSAPP_API_BASE_URL: optional,
  WHATSAPP_WEBHOOK_SECRET: optional,
  UPSTASH_REDIS_REST_URL: optional,
  UPSTASH_REDIS_REST_TOKEN: optional,
});

export type Env = z.infer<typeof envSchema>;

export type CheckResult =
  | { ok: true; warnings: string[] }
  | { ok: false; errors: string[]; warnings: string[] };

export function checkEnv(env: NodeJS.ProcessEnv = process.env): CheckResult {
  const parsed = envSchema.safeParse(env);
  const warnings: string[] = [];

  // Warn about production-only concerns
  const isProd = env.NODE_ENV === "production" || env.VERCEL_ENV === "production";
  if (isProd) {
    if (!env.RESEND_API_KEY) warnings.push("RESEND_API_KEY ausente — convites por email não serão enviados");
    if (!env.CRON_SECRET) warnings.push("CRON_SECRET ausente — endpoints de cron estão sem autenticação");
    if (!env.WHATSAPP_API_KEY) warnings.push("WHATSAPP_API_KEY ausente — WhatsApp em modo mock");
    if (!env.UPSTASH_REDIS_REST_URL) warnings.push("UPSTASH_REDIS_REST_URL ausente — rate limit é in-memory (não funciona em multi-instância)");
    if (env.NEXTAUTH_URL?.startsWith("http://") && !env.NEXTAUTH_URL.includes("localhost")) {
      warnings.push("NEXTAUTH_URL usa http:// — produção deve usar https://");
    }
  }

  if (!parsed.success) {
    const errors = parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`);
    return { ok: false, errors, warnings };
  }
  return { ok: true, warnings };
}
