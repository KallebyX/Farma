"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

type Membership = {
  pharmacyId: string;
  pharmacyName: string;
  role: string;
};

const ROLE_LABEL: Record<string, string> = {
  OWNER: "Proprietário",
  PHARMACIST: "Farmacêutico",
  ATTENDANT: "Atendente",
  READONLY: "Leitura",
};

/**
 * Lets a user who belongs to more than one pharmacy switch the active tenant.
 * Renders nothing when the user has a single membership.
 */
export function TenantSwitcher({
  memberships,
  activePharmacyId,
}: {
  memberships: Membership[];
  activePharmacyId: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  if (memberships.length <= 1) return null;

  function onChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const pharmacyId = e.target.value;
    if (pharmacyId === activePharmacyId) return;
    setError(null);
    startTransition(async () => {
      try {
        const res = await fetch("/api/tenant/switch", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ pharmacyId }),
        });
        const json = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string };
        if (!res.ok || !json.ok) {
          setError(json.error ?? "Não foi possível trocar de farmácia");
          return;
        }
        router.refresh();
      } catch {
        setError("Erro de conexão");
      }
    });
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <label className="sr-only" htmlFor="tenant-switcher">
        Farmácia ativa
      </label>
      <select
        id="tenant-switcher"
        value={activePharmacyId}
        onChange={onChange}
        disabled={pending}
        className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-brand-800 disabled:opacity-60"
      >
        {memberships.map((m) => (
          <option key={m.pharmacyId} value={m.pharmacyId}>
            {m.pharmacyName} · {ROLE_LABEL[m.role] ?? m.role}
          </option>
        ))}
      </select>
      {error ? <span className="text-xs text-red-600">{error}</span> : null}
    </div>
  );
}
