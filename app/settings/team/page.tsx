import Link from "next/link";
import { redirect } from "next/navigation";
import { canManageInvitations, roleLabel } from "@/lib/auth/permissions";
import { getSessionContext } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { formatRelativeDays } from "@/lib/utils";
import { InviteModal } from "./invite-modal";
import { PendingInvitationActions } from "./pending-actions";

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
    <main className="min-h-screen px-6 py-10">
      <div className="mx-auto max-w-5xl">
        <div className="flex items-start justify-between">
          <div>
            <Link href="/dashboard" className="text-xs text-slate-500 hover:underline">
              ← Voltar ao dashboard
            </Link>
            <h1 className="mt-2 text-2xl font-bold text-brand-800">Equipe</h1>
            <p className="text-sm text-slate-500">
              Gerencie quem tem acesso à sua farmácia. Convites expiram em 7 dias.
            </p>
          </div>
          {canInviteUI ? <InviteModal currentRole={ctx.role} /> : null}
        </div>

        <section className="mt-8">
          <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wide">
            Membros ({members.length})
          </h2>
          <div className="mt-3 rounded-xl border border-slate-200 bg-white overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3 font-semibold">Nome</th>
                  <th className="px-4 py-3 font-semibold">Email</th>
                  <th className="px-4 py-3 font-semibold">Papel</th>
                  <th className="px-4 py-3 font-semibold">Entrou</th>
                </tr>
              </thead>
              <tbody>
                {members.map((m) => (
                  <tr key={m.id} className="border-b border-slate-100 last:border-0">
                    <td className="px-4 py-3 font-medium text-slate-800">{m.user.name}</td>
                    <td className="px-4 py-3 text-slate-600">{m.user.email}</td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center rounded-full bg-brand-50 px-2 py-0.5 text-xs font-medium text-brand-700 border border-brand-100">
                        {roleLabel(m.role)}
                      </span>
                      {m.crf ? (
                        <span className="ml-2 text-xs text-slate-500">{m.crf}</span>
                      ) : null}
                    </td>
                    <td className="px-4 py-3 text-slate-500">
                      {new Intl.DateTimeFormat("pt-BR").format(m.joinedAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="mt-10">
          <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wide">
            Convites pendentes ({pending.length})
          </h2>
          {pending.length === 0 ? (
            <p className="mt-3 rounded-xl border border-dashed border-slate-300 bg-white px-4 py-8 text-center text-sm text-slate-500">
              Nenhum convite pendente.
            </p>
          ) : (
            <div className="mt-3 space-y-3">
              {pending.map((inv) => (
                <article
                  key={inv.id}
                  className="rounded-xl border border-slate-200 bg-white p-4"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-sm font-medium text-slate-800">{inv.email}</p>
                      <p className="mt-0.5 text-xs text-slate-500">
                        {roleLabel(inv.role)}
                        {inv.crf ? ` · ${inv.crf}` : ""} · convidado por {inv.invitedBy.name}
                      </p>
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {inv.channels.map((c) => (
                          <span
                            key={c}
                            className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-700"
                          >
                            {channelLabel(c)}
                          </span>
                        ))}
                        <span
                          className={`ml-1 text-xs ${
                            inv.expiresAt.getTime() < Date.now() + 86_400_000
                              ? "text-amber-700"
                              : "text-slate-500"
                          }`}
                        >
                          {formatRelativeDays(inv.expiresAt)}
                        </span>
                      </div>
                      {inv.deliveries.length > 0 ? (
                        <ul className="mt-2 space-y-0.5 text-[11px] text-slate-500">
                          {inv.deliveries.slice(0, 3).map((d) => (
                            <li key={d.id}>
                              {channelLabel(d.channel)} · {d.status}
                              {d.error ? ` — ${d.error}` : ""}
                            </li>
                          ))}
                        </ul>
                      ) : null}
                    </div>
                    {canInviteUI ? (
                      <PendingInvitationActions invitationId={inv.id} />
                    ) : null}
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

function channelLabel(c: string): string {
  switch (c) {
    case "EMAIL":
      return "Email";
    case "WHATSAPP":
      return "WhatsApp";
    case "LINK":
      return "Link";
    default:
      return c;
  }
}
