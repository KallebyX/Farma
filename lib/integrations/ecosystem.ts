import { createHmac, randomBytes } from "node:crypto";
import { prisma } from "@/lib/db";
import { EcosystemPartner, ConnectionStatus } from "@prisma/client";

/**
 * Ecossistema Oryum — ponte da Farma (farmácia) com os dois sistemas irmãos:
 *
 *   • AtendeBem      — gestão clínica. O médico prescreve lá; a receita entra na
 *                      Farma como lead de dispensação (fluxo INBOUND), e o status
 *                      de dispensação volta para o prontuário clínico (OUTBOUND).
 *   • Meu Prontuário — app do paciente. Recebe receitas, dispensações e adesão
 *                      para a carteira de saúde do paciente (OUTBOUND).
 *
 * Cada farmácia conecta um parceiro com uma `baseUrl` + um `secret` compartilhado
 * (guardado só no DB privado). Os eventos que ENVIAMOS são assinados (HMAC-SHA256)
 * e os que RECEBEMOS são autenticados pela API key de parceiro (lib/partner/auth).
 * Tudo com consentimento LGPD e CPF hasheado — nunca trafegamos CPF em claro.
 */

export type PartnerKey = EcosystemPartner;

export type EcosystemEvent =
  | "prescription.dispensed" // dispensamos uma receita
  | "ram.forwarded" // RAM encaminhada ao VigiMed
  | "adherence.updated" // paciente confirmou/perdeu dose
  | "patient.linked"; // paciente vinculou a farmácia

type PartnerMeta = {
  key: PartnerKey;
  label: string;
  short: string;
  description: string;
  /** Caminho de liveness no parceiro (concatenado à baseUrl). */
  healthPath: string;
  /** Endpoint que recebe nossos eventos no parceiro. */
  inboundPath: string;
  /** Eventos que faz sentido enviar a este parceiro. */
  subscribes: EcosystemEvent[];
  defaultScopes: string[];
  /** Sugestão de baseUrl mostrada na UI (placeholder). */
  baseUrlHint: string;
};

/** Catálogo dos parceiros do ecossistema — fonte única para libs e UI. */
export const PARTNERS: Record<PartnerKey, PartnerMeta> = {
  ATENDEBEM: {
    key: "ATENDEBEM",
    label: "AtendeBem",
    short: "Clínica",
    description:
      "Gestão clínica. Receitas emitidas pelo médico entram como leads de dispensação e o status volta ao prontuário do paciente.",
    healthPath: "/api/health",
    inboundPath: "/api/ecosystem/farma",
    subscribes: ["prescription.dispensed", "ram.forwarded"],
    defaultScopes: ["prescriptions:write", "patients:write"],
    baseUrlHint: "https://app.atendebem.io",
  },
  MEU_PRONTUARIO: {
    key: "MEU_PRONTUARIO",
    label: "Meu Prontuário",
    short: "Paciente",
    description:
      "App do paciente. Recebe receitas, dispensações e adesão para a carteira de saúde — com consentimento e CPF hasheado.",
    healthPath: "/api/v1/health",
    inboundPath: "/api/ecosystem/farma",
    subscribes: ["prescription.dispensed", "adherence.updated", "patient.linked"],
    defaultScopes: ["prescriptions:read", "adherence:read"],
    baseUrlHint: "https://meuprontuario.app",
  },
};

export const PARTNER_KEYS = Object.keys(PARTNERS) as PartnerKey[];

export function isPartnerKey(v: string): v is PartnerKey {
  return v in PARTNERS;
}

// ── Crypto helpers ──────────────────────────────────────────────────────────

// We SIGN every event we send to partners (outbound HMAC). The reverse direction
// — partners pushing to us — is authenticated by the partner API key
// (lib/partner/auth) at /api/partner/v1/*, so there is no inbound HMAC path here.
export function signPayload(secret: string, body: string): string {
  return createHmac("sha256", secret).update(body).digest("hex");
}

export function newSecret(): string {
  return `eco_${randomBytes(24).toString("base64url")}`;
}

// ── Connection management ───────────────────────────────────────────────────

export function listConnections(pharmacyId: string) {
  return prisma.ecosystemConnection.findMany({
    where: { pharmacyId },
    orderBy: { partner: "asc" },
  });
}

export function getConnection(pharmacyId: string, partner: PartnerKey) {
  return prisma.ecosystemConnection.findUnique({
    where: { pharmacyId_partner: { pharmacyId, partner } },
  });
}

export type ConnectInput = {
  baseUrl?: string | null;
  secret?: string | null;
  scopes?: string[];
  autoPushDispensations?: boolean;
  autoAcceptPrescriptions?: boolean;
  shareAdherence?: boolean;
};

/**
 * Creates or updates a partner connection (does not test it). Returns the row
 * plus `secretIssued` — true only when a NEW shared secret was minted (first
 * connect, or an explicit rotation). The caller uses this to decide whether to
 * disclose the secret to the browser; an existing secret is never re-disclosed.
 */
export async function upsertConnection(
  pharmacyId: string,
  partner: PartnerKey,
  input: ConnectInput,
): Promise<{ connection: Awaited<ReturnType<typeof prisma.ecosystemConnection.upsert>>; secretIssued: boolean }> {
  const existing = await getConnection(pharmacyId, partner);
  const baseUrl = normalizeBaseUrl(input.baseUrl);
  // Mint a secret only on first creation or explicit rotation (caller sent one).
  const rotating = typeof input.secret === "string" && input.secret.length > 0;
  const secretIssued = !existing || rotating;
  const secret = rotating ? input.secret! : existing?.secret ?? newSecret();

  const data = {
    baseUrl,
    scopes: input.scopes ?? PARTNERS[partner].defaultScopes,
    ...(rotating ? { secret } : {}),
    ...(input.autoPushDispensations !== undefined ? { autoPushDispensations: input.autoPushDispensations } : {}),
    ...(input.autoAcceptPrescriptions !== undefined ? { autoAcceptPrescriptions: input.autoAcceptPrescriptions } : {}),
    ...(input.shareAdherence !== undefined ? { shareAdherence: input.shareAdherence } : {}),
  };
  const connection = await prisma.ecosystemConnection.upsert({
    where: { pharmacyId_partner: { pharmacyId, partner } },
    create: {
      pharmacyId,
      partner,
      status: ConnectionStatus.DISCONNECTED,
      secret,
      ...data,
    },
    update: data,
  });
  return { connection, secretIssued };
}

export async function disconnect(pharmacyId: string, partner: PartnerKey) {
  return prisma.ecosystemConnection.update({
    where: { pharmacyId_partner: { pharmacyId, partner } },
    data: { status: ConnectionStatus.DISCONNECTED },
  });
}

/**
 * Normalizes a base URL: requires https (strips trailing slash). A plaintext
 * http:// loopback host is tolerated only OUTSIDE production, for local dev —
 * in production every ecosystem endpoint must be https. Returns null if blank.
 */
function normalizeBaseUrl(raw: string | null | undefined): string | null {
  const v = (raw ?? "").trim();
  if (!v) return null;
  try {
    const u = new URL(v);
    const isLoopback = u.hostname === "localhost" || u.hostname === "127.0.0.1";
    const allowHttp = isLoopback && process.env.NODE_ENV !== "production";
    if (u.protocol !== "https:" && !allowHttp) throw new Error("https obrigatório");
    return u.origin + (u.pathname === "/" ? "" : u.pathname.replace(/\/$/, ""));
  } catch {
    return null;
  }
}

// ── Health / test ───────────────────────────────────────────────────────────

/**
 * Pings the partner's health endpoint and persists the result on the connection.
 * Returns `{ ok, status, detail }`. Runs server-side (Vercel) where the partner
 * hosts are reachable.
 */
export async function testConnection(
  pharmacyId: string,
  partner: PartnerKey,
): Promise<{ ok: boolean; detail: string }> {
  const conn = await getConnection(pharmacyId, partner);
  if (!conn?.baseUrl) {
    return { ok: false, detail: "Configure a URL do parceiro primeiro." };
  }
  const meta = PARTNERS[partner];
  const url = conn.baseUrl + meta.healthPath;
  let ok = false;
  let detail = "";
  try {
    const res = await fetch(url, {
      method: "GET",
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(8000),
    });
    ok = res.ok;
    detail = ok ? `Conectado (HTTP ${res.status})` : `Parceiro respondeu HTTP ${res.status}`;
  } catch (err) {
    ok = false;
    detail = err instanceof Error ? err.message : "Falha de conexão";
  }
  await prisma.ecosystemConnection.update({
    where: { id: conn.id },
    data: {
      status: ok ? ConnectionStatus.CONNECTED : ConnectionStatus.ERROR,
      lastError: ok ? null : detail,
      lastSyncAt: new Date(),
    },
  });
  await logSync({ pharmacyId, partner, direction: "OUTBOUND", event: "health.check", ok, detail });
  return { ok, detail };
}

// ── Sync log ────────────────────────────────────────────────────────────────

export async function logSync(args: {
  pharmacyId: string;
  partner: PartnerKey;
  direction: "INBOUND" | "OUTBOUND";
  event: string;
  ok: boolean;
  detail?: string;
  externalId?: string | null;
}): Promise<void> {
  try {
    await prisma.integrationSyncLog.create({
      data: {
        pharmacyId: args.pharmacyId,
        partner: args.partner,
        direction: args.direction,
        event: args.event,
        status: args.ok ? "SUCCESS" : "FAILED",
        detail: args.detail?.slice(0, 500) ?? null,
        externalId: args.externalId ?? null,
      },
    });
  } catch {
    // Logging is best-effort; never let it break the main flow.
  }
}

export function recentSyncLogs(pharmacyId: string, take = 12) {
  return prisma.integrationSyncLog.findMany({
    where: { pharmacyId },
    orderBy: { createdAt: "desc" },
    take,
  });
}

// ── Outbound events ─────────────────────────────────────────────────────────

/**
 * Fans an event out to every CONNECTED partner that subscribes to it. Best-effort
 * and non-blocking — callers `void notifyEcosystem(...)`. Each delivery is signed
 * (HMAC) and recorded in the sync log so the UI can show what flowed where.
 */
export async function notifyEcosystem(
  pharmacyId: string,
  event: EcosystemEvent,
  data: Record<string, unknown>,
): Promise<void> {
  let conns;
  try {
    conns = await prisma.ecosystemConnection.findMany({
      where: { pharmacyId, status: ConnectionStatus.CONNECTED },
    });
  } catch {
    return;
  }

  await Promise.all(
    conns.map(async (conn) => {
      const meta = PARTNERS[conn.partner];
      if (!meta.subscribes.includes(event)) return;
      if (!conn.baseUrl || !conn.secret) return;
      // Respect per-partner toggles.
      if (event === "prescription.dispensed" && !conn.autoPushDispensations) return;
      if (event === "adherence.updated" && !conn.shareAdherence) return;

      const payload = JSON.stringify({
        event,
        partner: conn.partner,
        pharmacyId,
        createdAt: new Date().toISOString(),
        data,
      });
      const url = conn.baseUrl + meta.inboundPath;
      try {
        const res = await fetch(url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Farma-Event": event,
            "X-Farma-Partner": conn.partner,
            "X-Farma-Signature": `sha256=${signPayload(conn.secret, payload)}`,
          },
          body: payload,
          signal: AbortSignal.timeout(8000),
        });
        await logSync({
          pharmacyId,
          partner: conn.partner,
          direction: "OUTBOUND",
          event,
          ok: res.ok,
          detail: res.ok ? `Enviado (HTTP ${res.status})` : `HTTP ${res.status}`,
          externalId: typeof data.id === "string" ? data.id : null,
        });
        if (!res.ok) {
          await prisma.ecosystemConnection
            .update({ where: { id: conn.id }, data: { lastError: `Falha ao enviar ${event}: HTTP ${res.status}` } })
            .catch(() => {});
        }
      } catch (err) {
        await logSync({
          pharmacyId,
          partner: conn.partner,
          direction: "OUTBOUND",
          event,
          ok: false,
          detail: err instanceof Error ? err.message : "fetch error",
        });
      }
    }),
  );
}
