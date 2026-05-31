import { verifyPatientToken } from "@/lib/patient-token";
import { getHubData } from "@/lib/loyalty/service";
import { getOrCreateLink } from "@/lib/affiliate/service";
import { connectionsFor, latestMetrics } from "@/lib/wearables/service";
import { listProviders, oauthConfigured } from "@/lib/wearables/providers";
import { HubClient } from "./hub-client";

export const dynamic = "force-dynamic";

export default async function HubPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const patientId = verifyPatientToken(token);

  if (!patientId) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-[#0a1f1a] px-6 text-center">
        <div className="max-w-sm">
          <div className="text-4xl mb-3">🔒</div>
          <h1 className="text-white text-lg font-bold">Link inválido ou expirado</h1>
          <p className="text-emerald-200/70 text-sm mt-2">
            Solicite um novo link do seu hub de saúde na sua farmácia ou no WhatsApp.
          </p>
        </div>
      </main>
    );
  }

  const data = await getHubData(patientId);
  if (!data.patient) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-[#0a1f1a] px-6 text-center">
        <p className="text-white">Paciente não encontrado.</p>
      </main>
    );
  }

  // Build a trackable affiliate link per partner for this patient.
  const offers = await Promise.all(
    data.partners.map(async (p) => {
      const r = await getOrCreateLink(p.slug, patientId);
      return {
        slug: p.slug,
        name: p.name,
        color: p.color,
        logo: p.logo,
        pointsPerReal: p.pointsPerReal,
        code: r?.link.code ?? null,
      };
    }),
  );

  const [connections, latest] = await Promise.all([connectionsFor(patientId), latestMetrics(patientId)]);
  const wearables = {
    providers: listProviders().map((p) => ({
      slug: p.slug, name: p.name, logo: p.logo, kind: p.kind,
      available: p.kind === "ingest" || oauthConfigured(p),
    })),
    connections: connections.map((c) => ({
      provider: c.provider, status: c.status, lastSyncAt: c.lastSyncAt ? c.lastSyncAt.toISOString() : null,
    })),
    latest: Object.entries(latest).map(([metric, v]) => ({ metric, value: v.value, unit: v.unit, source: v.source })),
  };

  return (
    <HubClient
      token={token}
      patientName={data.patient.name}
      wearables={wearables}
      account={{
        points: data.account.points,
        lifetime: data.account.lifetime,
        tier: data.account.tier,
        streakDays: data.account.streakDays,
      }}
      missions={data.missions.map((m) => ({
        code: m.code,
        title: m.title,
        description: m.description,
        points: m.points,
        icon: m.icon,
        completed: m.completed,
      }))}
      rewards={data.rewards.map((r) => ({
        code: r.code,
        title: r.title,
        description: r.description,
        costPoints: r.costPoints,
      }))}
      offers={offers}
      recent={data.recentPoints.map((e) => ({ delta: e.delta, reason: e.reason, at: e.createdAt.toISOString() }))}
    />
  );
}
