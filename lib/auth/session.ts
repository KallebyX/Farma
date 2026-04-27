import { auth } from "@/lib/auth/config";
import { prisma } from "@/lib/db";
import { UnauthorizedError, type SessionContext } from "@/lib/auth/permissions";

/**
 * Returns the active session context: authenticated user + their primary
 * pharmacy membership. Returns null if not authenticated or has no membership.
 */
export async function getSessionContext(): Promise<SessionContext | null> {
  const session = await auth();
  if (!session?.user?.id) return null;

  const membership = await prisma.membership.findFirst({
    where: { userId: session.user.id, status: "ACTIVE" },
    orderBy: { joinedAt: "asc" },
  });
  if (!membership) return null;

  return {
    userId: session.user.id,
    pharmacyId: membership.pharmacyId,
    role: membership.role,
  };
}

export async function requireSession(): Promise<SessionContext> {
  const ctx = await getSessionContext();
  if (!ctx) throw new UnauthorizedError("Sessão inválida");
  return ctx;
}
