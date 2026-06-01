import { createHmac } from "node:crypto";
import { prisma } from "@/lib/db";

/**
 * Outbound webhooks: pharmacies subscribe endpoints to events. On an event we
 * persist a WebhookDelivery per matching endpoint and POST it with an HMAC
 * signature header. Failed deliveries are retried by the cron job.
 */

export type WebhookEvent =
  | "ram.created"
  | "ram.reviewed"
  | "return.due"
  | "order.created"
  | "patient.created";

function sign(secret: string, body: string): string {
  return createHmac("sha256", secret).update(body).digest("hex");
}

/** Queue a webhook for all of a pharmacy's endpoints subscribed to `event`. */
export async function emitWebhook(pharmacyId: string, event: WebhookEvent, data: unknown): Promise<void> {
  const endpoints = await prisma.webhookEndpoint.findMany({
    where: { pharmacyId, active: true, events: { has: event } },
  });
  if (endpoints.length === 0) return;
  const payload = { event, createdAt: new Date().toISOString(), data } as const;
  await prisma.webhookDelivery.createMany({
    data: endpoints.map((e) => ({ endpointId: e.id, event, payload: payload as object })),
  });
  // Best-effort immediate attempt (cron retries the rest).
  void deliverPending(50);
}

/** Attempts pending/failed deliveries. Returns a summary. Called by cron. */
export async function deliverPending(limit = 50): Promise<{ attempted: number; ok: number; failed: number }> {
  const pending = await prisma.webhookDelivery.findMany({
    where: { status: { in: ["PENDING", "FAILED"] }, attempts: { lt: 6 } },
    orderBy: { createdAt: "asc" },
    take: limit,
    include: { endpoint: true },
  });

  let ok = 0;
  let failed = 0;
  for (const d of pending) {
    if (!d.endpoint.active) continue;
    const body = JSON.stringify(d.payload);
    const signature = sign(d.endpoint.secret, body);
    try {
      const res = await fetch(d.endpoint.url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-MP-Event": d.event,
          "X-MP-Signature": `sha256=${signature}`,
          "X-MP-Delivery": d.id,
        },
        body,
        signal: AbortSignal.timeout(8000),
      });
      if (res.ok) {
        ok++;
        await prisma.webhookDelivery.update({
          where: { id: d.id },
          data: { status: "SUCCESS", attempts: d.attempts + 1, responseCode: res.status, lastError: null },
        });
      } else {
        failed++;
        await prisma.webhookDelivery.update({
          where: { id: d.id },
          data: { status: "FAILED", attempts: d.attempts + 1, responseCode: res.status, lastError: `HTTP ${res.status}` },
        });
      }
    } catch (err) {
      failed++;
      await prisma.webhookDelivery.update({
        where: { id: d.id },
        data: { status: "FAILED", attempts: d.attempts + 1, lastError: err instanceof Error ? err.message : "fetch error" },
      });
    }
  }
  return { attempted: pending.length, ok, failed };
}
