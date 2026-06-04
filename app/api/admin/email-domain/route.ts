import { NextResponse } from "next/server";
import { getSessionContext } from "@/lib/auth/session";
import { isAtLeast } from "@/lib/auth/permissions";
import { Role } from "@prisma/client";
import { findConfiguredDomain, createConfiguredDomain, verifyConfiguredDomain, configuredEmailDomain, type DomainInfo } from "@/lib/email-domain";

export const dynamic = "force-dynamic";

async function ownerOnly() {
  const ctx = await getSessionContext();
  if (!ctx || !isAtLeast(ctx.role, Role.OWNER)) return null;
  return ctx;
}

function payload(domain: string | null, info: DomainInfo | null) {
  return {
    ok: true,
    domain,
    status: info?.status ?? "not_created",
    records: info?.records ?? [],
  };
}

/** GET /api/admin/email-domain - current sending-domain status + DNS records. */
export async function GET() {
  if (!(await ownerOnly())) return NextResponse.json({ ok: false, error: "Apenas OWNER" }, { status: 403 });
  const domain = await configuredEmailDomain();
  if (!domain) return NextResponse.json({ ok: false, error: "Defina o emailFrom (Farma <x@dominio>) antes" }, { status: 400 });
  const info = await findConfiguredDomain();
  return NextResponse.json(payload(domain, info));
}

/** POST /api/admin/email-domain - create the sending domain in Resend; returns DNS records. */
export async function POST() {
  if (!(await ownerOnly())) return NextResponse.json({ ok: false, error: "Apenas OWNER" }, { status: 403 });
  const r = await createConfiguredDomain();
  if (!r.ok) return NextResponse.json({ ok: false, error: r.error }, { status: r.status });
  return NextResponse.json(payload(r.name ?? null, r.data as DomainInfo));
}

/** PATCH /api/admin/email-domain - trigger Resend verification; returns fresh status. */
export async function PATCH() {
  if (!(await ownerOnly())) return NextResponse.json({ ok: false, error: "Apenas OWNER" }, { status: 403 });
  const domain = await configuredEmailDomain();
  const r = await verifyConfiguredDomain();
  if (!r.ok) return NextResponse.json({ ok: false, error: r.error }, { status: r.status });
  return NextResponse.json(payload(domain, r.data as DomainInfo));
}
