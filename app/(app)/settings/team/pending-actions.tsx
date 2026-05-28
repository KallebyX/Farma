"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

export function PendingInvitationActions({ invitationId }: { invitationId: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [resentLink, setResentLink] = useState<string | null>(null);

  function resend() {
    setError(null);
    setResentLink(null);
    startTransition(async () => {
      const res = await fetch(`/api/invitations/${invitationId}/resend`, { method: "POST" });
      const json = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        inviteUrl?: string;
        error?: string;
      };
      if (!res.ok || !json.ok) {
        setError(json.error ?? "Falha ao reenviar");
        return;
      }
      setResentLink(json.inviteUrl ?? null);
      router.refresh();
    });
  }

  function revoke() {
    if (!confirm("Revogar este convite? O link enviado deixará de funcionar.")) return;
    setError(null);
    startTransition(async () => {
      const res = await fetch(`/api/invitations/${invitationId}`, { method: "DELETE" });
      const json = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string };
      if (!res.ok || !json.ok) {
        setError(json.error ?? "Falha ao revogar");
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col items-end gap-2">
      <div className="flex gap-2">
        <button
          type="button"
          onClick={resend}
          disabled={pending}
          className="rounded border border-slate-300 bg-white px-3 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60"
        >
          Reenviar
        </button>
        <button
          type="button"
          onClick={revoke}
          disabled={pending}
          className="rounded border border-red-200 bg-white px-3 py-1 text-xs font-medium text-red-700 hover:bg-red-50 disabled:opacity-60"
        >
          Revogar
        </button>
      </div>
      {error ? <p className="text-xs text-red-600">{error}</p> : null}
      {resentLink ? (
        <p className="max-w-[260px] break-all text-[11px] text-slate-500">
          Novo link: <span className="font-mono">{resentLink}</span>
        </p>
      ) : null}
    </div>
  );
}
