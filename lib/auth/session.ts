import { cookies } from "next/headers";
import { auth } from "@/lib/auth/config";
import { prisma } from "@/lib/db";
import { UnauthorizedError, type SessionContext } from "@/lib/auth/permissions";
import { Role } from "@prisma/client";

/** Cookie that stores the user's currently-active pharmacy (tenant). */
export const ACTIVE_TENANT_COOKIE = "farma_tenant";

export type MembershipSummary = {
  pharmacyId: string;
  role: Role;
  pharmacyName: string;
};

/**
 * All active pharmacy memberships for a user, ordered by join date. This is the
 * set of tenants the user is allowed to act within.
 */
export async function listMemberships(userId: string): Promise<MembershipSummary[]> {
  const memberships = await prisma.membership.findMany({
    where: { userId, status: "ACTIVE" },
    orderBy: { joinedAt: "asc" },
    include: { pharmacy: { select: { fantasia: true, razaoSocial: true } } },
  });
  return memberships.map((m) => ({
    pharmacyId: m.pharmacyId,
    role: m.role,
    pharmacyName: m.pharmacy.fantasia ?? m.pharmacy.razaoSocial,
  }));
}

/**
 * Returns the active session context: authenticated user + the membership for
 * their *active* pharmacy. The active pharmacy is resolved from the
 * `farma_tenant` cookie when it points to a pharmacy the user still belongs to;
 * otherwise it falls back to the first (oldest) active membership.
 *
 * Returns null if not authenticated or the user has no active membership.
 */
export async function getSessionContext(): Promise<SessionContext | null> {
  const session = await auth();
  if (!session?.user?.id) return null;

  const memberships = await prisma.membership.findMany({
    where: { userId: session.user.id, status: "ACTIVE" },
    orderBy: { joinedAt: "asc" },
  });
  if (memberships.length === 0) return null;

  const cookieStore = await cookies();
  const preferred = cookieStore.get(ACTIVE_TENANT_COOKIE)?.value;
  const active =
    (preferred && memberships.find((m) => m.pharmacyId === preferred)) || memberships[0];

  return {
    userId: session.user.id,
    pharmacyId: active.pharmacyId,
    role: active.role,
  };
}

export async function requireSession(): Promise<SessionContext> {
  const ctx = await getSessionContext();
  if (!ctx) throw new UnauthorizedError("Sessão inválida");
  return ctx;
}
