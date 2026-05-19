import { redirect } from "next/navigation";
import { canManageInvitations } from "@/lib/auth/permissions";
import { getSessionContext } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { InviteModal } from "./invite-modal";
import { PendingInvitationActions } from "./pending-actions";
import { PageShell, PageHeader, Card, Badge, Avatar, Icon } from "@/components/ui";
import { roleLabel, channelLabel, fmtDateBR, fmtRelative } from "@/components/ui/utils";

export const dynamic = "force-dynamic";

export default async function TeamPage() {
  const ctx = await getSessionContext();
  if (!ctx) redirect("/sign-in");

  const [members, pending] = await Promise.all([
    prisma.membership.findMany({
      where: { pharmacyId: ctx.pharmacyId, status: "ACTIVE" },
      include: { user: { select: { name: true, email: true } } },
      orderBy: [{ role: "asc" }, { joinedAt: "asc" }],
    }),
    prisma.invitation.findMany({
      where: { pharmacyId: ctx.pharmacyId, status: "PENDING" },
      include: {
        invitedBy: { select: { name: true } },
        deliveries: {
          orderBy: { attemptedAt: "desc" },
          take: 5,
        },
      },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  const canInviteUI = canManageInvitations(ctx.role);

  return (
    <PageShell>
      <div className="flex items-start justify-between gap-4">
        <PageHeader
          eyebrow="Configurações"
          title="Equipe"
          subtitle="Gerencie quem tem acesso à sua farmácia. Convites expiram em 7 dias."
        />
        {canInviteUI && <InviteModal currentRole={ctx.role} />}
      </div>

      <section className="mt-8">
        <h2 className="text-[12px] font-bold tracking-[0.15em] uppercase text-slate-500 mb-3">
          Membros ({members.length})
        </h2>
        <Card className="overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200 text-left text-[11px] uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3 font-semibold">Membro</th>
                <th className="px-4 py-3 font-semibold hidden sm:table-cell">Email</th>
                <th className="px-4 py-3 font-semibold">Papel</th>
                <th className="px-4 py-3 font-semibold hidden md:table-cell">Entrou</th>
              </tr>
            </thead>
            <tbody>
              {members.map((m) => (
                <tr key={m.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/70 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <Avatar name={m.user.name ?? m.user.email} size={32}/>
                      <p className="text-[13px] font-medium text-slate-800">{m.user.name}</p>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-[13px] text-slate-600 hidden sm:table-cell">{m.user.email}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <Badge tone="brand">{roleLabel(m.role)}</Badge>
                      {m.crf && (
                        <span className="text-[11.5px] text-slate-500">{m.crf}</span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-[12.5px] text-slate-500 hidden md:table-cell">
                    {fmtDateBR(m.joinedAt)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      </section>

      <section className="mt-10">
        <h2 className="text-[12px] font-bold tracking-[0.15em] uppercase text-slate-500 mb-3">
          Convites pendentes ({pending.length})
        </h2>
        {pending.length === 0 ? (
          <Card className="p-8 text-center">
            <p className="text-[13px] text-slate-500">Nenhum convite pendente.</p>
          </Card>
        ) : (
          <div className="space-y-3">
            {pending.map((inv) => (
              <Card key={inv.id} className="p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <p className="text-[13.5px] font-medium text-slate-800">{inv.email}</p>
                    <p className="mt-0.5 text-[12px] text-slate-500">
                      {roleLabel(inv.role)}
                      {inv.crf ? ` · ${inv.crf}` : ""}
                      {" · convidado por "}
                      {inv.invitedBy.name}
                    </p>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {inv.channels.map((c) => (
                        <Badge key={c} tone="slate" size="sm">{channelLabel(c)}</Badge>
                      ))}
                      <span className={`ml-1 text-[11.5px] ${
                        inv.expiresAt.getTime() < Date.now() + 86_400_000
                          ? "text-amber-700"
                          : "text-slate-500"
                      }`}>
                        {fmtRelative(inv.expiresAt)}
                      </span>
                    </div>
                    {inv.deliveries.length > 0 && (
                      <ul className="mt-2 space-y-0.5 text-[11px] text-slate-500">
                        {inv.deliveries.slice(0, 3).map((d) => (
                          <li key={d.id}>
                            {channelLabel(d.channel)} · {d.status}
                            {d.error ? ` — ${d.error}` : ""}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                  {canInviteUI && (
                    <PendingInvitationActions invitationId={inv.id} />
                  )}
                </div>
              </Card>
            ))}
          </div>
        )}
      </section>
    </PageShell>
  );
}
