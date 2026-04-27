import { notFound } from "next/navigation";
import { loadInviteForAcceptance, InvalidInviteError } from "@/lib/invitations/accept";
import { roleLabel } from "@/lib/auth/permissions";
import { Role } from "@prisma/client";
import { AcceptInviteForm } from "./accept-form";
import { InviteError } from "./invite-error";

export const dynamic = "force-dynamic";

const fmt = new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "long", year: "numeric" });

export default async function AcceptInvitePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  if (!token) notFound();

  let invite: Awaited<ReturnType<typeof loadInviteForAcceptance>>;
  try {
    invite = await loadInviteForAcceptance(token);
  } catch (err) {
    if (err instanceof InvalidInviteError) {
      return <InviteError message={err.message} />;
    }
    throw err;
  }

  return (
    <main className="min-h-screen flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-lg">
        <div className="mb-6 text-center">
          <p className="text-xs font-bold tracking-[0.2em] text-brand-500 uppercase">
            Farma · Adesão e Farmacovigilância
          </p>
        </div>

        <div className="rounded-xl bg-white border border-slate-200 shadow-sm overflow-hidden">
          <div className="bg-brand-800 text-white px-6 py-5">
            <p className="text-xs font-semibold uppercase tracking-widest text-brand-200">
              Convite para a equipe
            </p>
            <h1 className="mt-1 text-xl font-bold">{invite.pharmacyName}</h1>
          </div>

          <div className="px-6 py-5 border-b border-slate-100 space-y-3">
            <Row label="Convidado por">{invite.inviterName}</Row>
            <Row label="Email">{invite.email}</Row>
            <Row label="Papel">{roleLabel(invite.roleLabel as Role)}</Row>
            <Row label="Convite expira em">{fmt.format(invite.expiresAt)}</Row>
          </div>

          <div className="px-6 py-5">
            <h2 className="text-sm font-semibold text-slate-700 mb-3">
              {invite.userExists
                ? "Confirme sua identidade para vincular esta conta à farmácia"
                : "Crie sua conta para aceitar o convite"}
            </h2>
            <AcceptInviteForm token={token} email={invite.email} userExists={invite.userExists} />
          </div>
        </div>
      </div>
    </main>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex justify-between text-sm">
      <span className="text-slate-500">{label}</span>
      <span className="font-medium text-slate-800">{children}</span>
    </div>
  );
}
