import type { WearableProvider } from "@prisma/client";

/**
 * Wearable provider registry.
 *  - kind "oauth": has a server/web API → OAuth 2.0 connect flow (needs client
 *    credentials in env). We store tokens; a sync worker pulls samples.
 *  - kind "ingest": no web API (Apple Health / Samsung Health) → the phone app /
 *    Apple Shortcut / aggregator pushes samples to /api/wearables/ingest using a
 *    per-connection token. Garmin is treated as ingest here to avoid OAuth1.0a.
 */
export type ProviderDef = {
  slug: WearableProvider;
  name: string;
  logo: string;
  color: string;
  kind: "oauth" | "ingest";
  authUrl?: string;
  tokenUrl?: string;
  scopes?: string[];
  clientIdEnv?: string;
  clientSecretEnv?: string;
};

export const PROVIDERS: Record<WearableProvider, ProviderDef> = {
  APPLE_HEALTH: { slug: "APPLE_HEALTH", name: "Apple Saúde (Apple Watch)", logo: "🍎", color: "#000000", kind: "ingest" },
  SAMSUNG_HEALTH: { slug: "SAMSUNG_HEALTH", name: "Samsung Health (Galaxy Watch)", logo: "⌚", color: "#1428a0", kind: "ingest" },
  GARMIN: { slug: "GARMIN", name: "Garmin", logo: "⌚", color: "#007cc3", kind: "ingest" },
  FITBIT: {
    slug: "FITBIT", name: "Fitbit", logo: "🟦", color: "#00b0b9", kind: "oauth",
    authUrl: "https://www.fitbit.com/oauth2/authorize",
    tokenUrl: "https://api.fitbit.com/oauth2/token",
    scopes: ["activity", "heartrate", "sleep", "oxygen_saturation", "weight"],
    clientIdEnv: "FITBIT_CLIENT_ID", clientSecretEnv: "FITBIT_CLIENT_SECRET",
  },
  OURA: {
    slug: "OURA", name: "Oura Ring", logo: "💍", color: "#9333ea", kind: "oauth",
    authUrl: "https://cloud.ouraring.com/oauth/authorize",
    tokenUrl: "https://api.ouraring.com/oauth/token",
    scopes: ["daily", "heartrate", "personal"],
    clientIdEnv: "OURA_CLIENT_ID", clientSecretEnv: "OURA_CLIENT_SECRET",
  },
  WITHINGS: {
    slug: "WITHINGS", name: "Withings", logo: "⚖️", color: "#10b981", kind: "oauth",
    authUrl: "https://account.withings.com/oauth2_user/authorize2",
    tokenUrl: "https://wbsapi.withings.net/v2/oauth2",
    scopes: ["user.metrics", "user.activity"],
    clientIdEnv: "WITHINGS_CLIENT_ID", clientSecretEnv: "WITHINGS_CLIENT_SECRET",
  },
  GOOGLE_FIT: {
    slug: "GOOGLE_FIT", name: "Google Health Connect", logo: "🤖", color: "#34a853", kind: "oauth",
    authUrl: "https://accounts.google.com/o/oauth2/v2/auth",
    tokenUrl: "https://oauth2.googleapis.com/token",
    scopes: ["https://www.googleapis.com/auth/fitness.activity.read", "https://www.googleapis.com/auth/fitness.heart_rate.read"],
    clientIdEnv: "GOOGLE_FIT_CLIENT_ID", clientSecretEnv: "GOOGLE_FIT_CLIENT_SECRET",
  },
  POLAR: {
    slug: "POLAR", name: "Polar", logo: "🔵", color: "#d50000", kind: "oauth",
    authUrl: "https://flow.polar.com/oauth2/authorization",
    tokenUrl: "https://polarremote.com/v2/oauth2/token",
    scopes: ["accesslink.read_all"],
    clientIdEnv: "POLAR_CLIENT_ID", clientSecretEnv: "POLAR_CLIENT_SECRET",
  },
  MANUAL: { slug: "MANUAL", name: "Entrada manual", logo: "✍️", color: "#64748b", kind: "ingest" },
};

/** True when an OAuth provider has its client credentials configured. */
export function oauthConfigured(p: ProviderDef): boolean {
  return p.kind === "oauth" && !!p.clientIdEnv && !!process.env[p.clientIdEnv] && !!p.clientSecretEnv && !!process.env[p.clientSecretEnv];
}

export function listProviders(): ProviderDef[] {
  return Object.values(PROVIDERS);
}
