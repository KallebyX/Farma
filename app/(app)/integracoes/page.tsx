import { redirect } from "next/navigation";
import { getSessionContext } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { isAtLeast } from "@/lib/auth/permissions";
import { Role } from "@prisma/client";
import { PageShell, PageHeader, Card, Badge, Icon } from "@/components/ui";
import { ApiKeysPanel } from "./api-keys-client";
import { EcosystemPanel, type PartnerCard } from "./ecosystem-client";
import { PARTNER_KEYS, PARTNERS, listConnections, recentSyncLogs } from "@/lib/integrations/ecosystem";

export const dynamic = "force-dynamic";

const DELIV_TONE: Record<string, "amber" | "emerald" | "rose"> = { PENDING: "amber", SUCCESS: "emerald", FAILED: "rose" };

export default async function IntegracoesPage() {
  const ctx = await getSessionContext();
  if (!ctx) redirect("/sign-in");
  const isOwner = isAtLeast(ctx.role, Role.OWNER);

  const [keys, endpoints, deliveries, connections, syncLogs] = await Promise.all([
    prisma.apiKey.findMany({
      where: { pharmacyId: ctx.pharmacyId },
      orderBy: { createdAt: "desc" },
      select: { id: true, name: true, prefix: true, scopes: true, lastUsedAt: true, revokedAt: true, createdAt: true },
    }),
    prisma.webhookEndpoint.findMany({
      where: { pharmacyId: ctx.pharmacyId },
      orderBy: { createdAt: "desc" },
      select: { id: true, url: true, events: true, active: true },
    }),
    prisma.webhookDelivery.findMany({
      where: { endpoint: { pharmacyId: ctx.pharmacyId } },
      orderBy: { createdAt: "desc" }, take: 10,
      select: { id: true, event: true, status: true, attempts: true, responseCode: true, createdAt: true },
    }),
    listConnections(ctx.pharmacyId),
    recentSyncLogs(ctx.pharmacyId, 12),
  ]);

  const partners: PartnerCard[] = PARTNER_KEYS.map((key) => {
    const meta = PARTNERS[key];
    const c = connections.find((x) => x.partner === key);
    return {
      key,
      label: meta.label,
      short: meta.short,
      description: meta.description,
      baseUrlHint: meta.baseUrlHint,
      connection: c
        ? {
            baseUrl: c.baseUrl,
            status: c.status,
            scopes: c.scopes,
            lastSyncAt: c.lastSyncAt?.toISOString() ?? null,
            lastError: c.lastError,
            autoPushDispensations: c.autoPushDispensations,
            autoAcceptPrescriptions: c.autoAcceptPrescriptions,
            shareAdherence: c.shareAdherence,
            hasSecret: Boolean(c.secret),
          }
        : null,
    };
  });

  return (
    <PageShell>
      <PageHeader eyebrow="Para desenvolvedores" title="Integrações" subtitle="Conecte o ecossistema Oryum e o sistema da sua farmácia: parceiros clínicos, API com chaves seguras e webhooks assinados." />

      <div className="mt-8">
        <EcosystemPanel
          partners={partners}
          logs={syncLogs.map((l) => ({ ...l, createdAt: l.createdAt.toISOString() }))}
          canManage={isOwner}
        />
      </div>

      <div className="mt-6">
        <ApiKeysPanel
          initialKeys={keys.map((k) => ({ ...k, lastUsedAt: k.lastUsedAt?.toISOString() ?? null, revokedAt: k.revokedAt?.toISOString() ?? null, createdAt: k.createdAt.toISOString() }))}
          canCreate={isOwner}
        />
      </div>

      <div className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-6">
          <h2 className="text-[15px] font-semibold text-slate-800 flex items-center gap-2"><Icon.Bell size={16} /> Webhooks</h2>
          <p className="mt-1 text-[12.5px] text-slate-500">Eventos assinados (HMAC) enviados ao seu sistema: <code className="text-[11.5px]">ram.created</code>, <code className="text-[11.5px]">return.due</code>, <code className="text-[11.5px]">order.created</code>, <code className="text-[11.5px]">patient.created</code>.</p>
          <div className="mt-4 space-y-2">
            {endpoints.length === 0 && <p className="text-[13px] text-slate-500">Nenhum endpoint configurado.</p>}
            {endpoints.map((e) => (
              <div key={e.id} className="rounded-lg border border-slate-100 px-3.5 py-2.5">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-[12.5px] font-mono text-slate-700 truncate">{e.url}</p>
                  <Badge tone={e.active ? "emerald" : "slate"} dot className="shrink-0">{e.active ? "ativo" : "inativo"}</Badge>
                </div>
                <p className="mt-1 text-[11.5px] text-slate-500">{e.events.length ? e.events.join(", ") : "todos os eventos"}</p>
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-6">
          <h2 className="text-[15px] font-semibold text-slate-800 flex items-center gap-2"><Icon.Activity size={16} /> Entregas recentes</h2>
          <div className="mt-4 space-y-2">
            {deliveries.length === 0 && <p className="text-[13px] text-slate-500">Nenhuma entrega ainda.</p>}
            {deliveries.map((d) => (
              <div key={d.id} className="flex items-center justify-between rounded-lg border border-slate-100 px-3.5 py-2.5">
                <div className="min-w-0">
                  <p className="text-[13px] font-medium text-slate-800 truncate">{d.event}</p>
                  <p className="text-[11.5px] text-slate-500">{d.createdAt.toLocaleString("pt-BR")} · {d.attempts} tentativa(s){d.responseCode ? ` · HTTP ${d.responseCode}` : ""}</p>
                </div>
                <Badge tone={DELIV_TONE[d.status]} dot className="shrink-0">{d.status.toLowerCase()}</Badge>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <Card className="mt-6 p-6">
        <h2 className="text-[15px] font-semibold text-slate-800 flex items-center gap-2"><Icon.Book size={16} /> Início rápido</h2>
        <p className="mt-1 text-[12.5px] text-slate-500">Autentique com <code className="text-[11.5px]">Authorization: Bearer &lt;sua-chave&gt;</code>.</p>
        <pre className="mt-3 overflow-x-auto rounded-lg bg-slate-900 px-4 py-3 text-[12px] leading-relaxed text-slate-100">
{`curl https://app.farma.com.br/api/partner/v1/patients \\
  -H "Authorization: Bearer mpk_sua_chave_aqui"`}
        </pre>
      </Card>
    </PageShell>
  );
}
