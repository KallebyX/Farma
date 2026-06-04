import { getIntegrationConfig } from "@/lib/integration-config";

/**
 * Resend domain management (server-side). Lets the app create/verify the sending
 * domain via the Resend API instead of the dashboard. The API key comes from
 * IntegrationConfig (set via MCP) over env. Runs in prod, where outbound to
 * api.resend.com is allowed.
 */
const API = "https://api.resend.com";

export type DnsRecord = { record?: string; name: string; type: string; value: string; ttl?: string; priority?: number; status?: string };
export type DomainInfo = { id: string; name: string; status: string; records: DnsRecord[] };

async function resendKey(): Promise<string | null> {
  const cfg = await getIntegrationConfig();
  return cfg.resendApiKey ?? process.env.RESEND_API_KEY ?? null;
}

/** Domain of the configured emailFrom ("Farma <x@dominio.io>" -> "dominio.io"). */
export async function configuredEmailDomain(): Promise<string | null> {
  const cfg = await getIntegrationConfig();
  const from = (cfg.emailFrom ?? process.env.EMAIL_FROM ?? "").trim();
  const m = from.match(/<([^>]+)>/);
  const addr = (m ? m[1] : from).trim();
  const domain = addr.split("@")[1]?.trim().toLowerCase();
  return domain || null;
}

type RFetch = { ok: true; data: unknown } | { ok: false; error: string; status: number };

async function rfetch(path: string, init?: RequestInit): Promise<RFetch> {
  const key = await resendKey();
  if (!key) return { ok: false, error: "Resend não configurado (defina resendApiKey ou RESEND_API_KEY)", status: 400 };
  try {
    const res = await fetch(`${API}${path}`, {
      ...init,
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json", ...(init?.headers ?? {}) },
      signal: AbortSignal.timeout(15000),
    });
    const json = (await res.json().catch(() => null)) as unknown;
    if (!res.ok) return { ok: false, error: (json as { message?: string })?.message ?? `HTTP ${res.status}`, status: res.status };
    return { ok: true, data: json };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err), status: 502 };
  }
}

function toDomainInfo(d: unknown): DomainInfo {
  const o = (d ?? {}) as { id?: string; name?: string; status?: string; records?: DnsRecord[] };
  return { id: o.id ?? "", name: o.name ?? "", status: o.status ?? "unknown", records: o.records ?? [] };
}

/** Finds the configured domain in the Resend account (by name), or null. */
export async function findConfiguredDomain(): Promise<DomainInfo | null> {
  const name = await configuredEmailDomain();
  if (!name) return null;
  const r = await rfetch("/domains");
  if (!r.ok) return null;
  const list = ((r.data as { data?: { id: string; name: string; status: string }[] })?.data) ?? [];
  const match = list.find((d) => d.name?.toLowerCase() === name);
  if (!match) return null;
  const det = await rfetch(`/domains/${match.id}`);
  return det.ok ? toDomainInfo(det.data) : toDomainInfo(match);
}

export async function createConfiguredDomain(): Promise<RFetch & { name?: string }> {
  const name = await configuredEmailDomain();
  if (!name) return { ok: false, error: "Configure o emailFrom primeiro (Farma <x@dominio>)", status: 400 };
  const existing = await findConfiguredDomain();
  if (existing) return { ok: true, data: existing, name };
  const r = await rfetch("/domains", { method: "POST", body: JSON.stringify({ name }) });
  return { ...r, name };
}

export async function verifyConfiguredDomain(): Promise<RFetch> {
  const existing = await findConfiguredDomain();
  if (!existing) return { ok: false, error: "Domínio ainda não criado", status: 404 };
  const r = await rfetch(`/domains/${existing.id}/verify`, { method: "POST" });
  if (!r.ok) return r;
  // Return the fresh status + records after triggering verification.
  const det = await rfetch(`/domains/${existing.id}`);
  return det.ok ? { ok: true, data: toDomainInfo(det.data) } : r;
}
