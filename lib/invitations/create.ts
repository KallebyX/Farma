import { InvitationStatus, type Role } from "@prisma/client";
import { prisma } from "@/lib/db";
import { canInvite, ForbiddenError, type SessionContext } from "@/lib/auth/permissions";
import { generateToken, buildInviteUrl } from "@/lib/invitations/token";
import { dispatchInvitation, type DispatchSummary } from "@/lib/invitations/deliver";
import { inviteRateLimit } from "@/lib/rate-limit";
import type { CreateInvitationInput } from "@/lib/invitations/schema";

export class InvitationConflictError extends Error {
  status = 409;
}

export class RateLimitError extends Error {
  status = 429;
  constructor(public resetAt: number) {
    super("Muitos convites — tente novamente em alguns minutos");
  }
}

export type CreateInvitationResult = {
  invitationId: string;
  inviteUrl: string;
  expiresAt: Date;
  deliveries: DispatchSummary[];
};

const DEFAULT_TTL_DAYS = 7;

export async function createInvitation(
  ctx: SessionContext,
  input: CreateInvitationInput,
): Promise<CreateInvitationResult> {
  if (!canInvite(ctx.role, input.role)) {
    throw new ForbiddenError(`Seu papel (${ctx.role}) não pode convidar para ${input.role}`);
  }

  const limit = await inviteRateLimit.limit(ctx.userId);
  if (!limit.success) {
    throw new RateLimitError(limit.reset);
  }

  // Check for an existing active membership for this email in this pharmacy.
  const existingUser = await prisma.user.findUnique({ where: { email: input.email } });
  if (existingUser) {
    const existingMembership = await prisma.membership.findUnique({
      where: { userId_pharmacyId: { userId: existingUser.id, pharmacyId: ctx.pharmacyId } },
    });
    if (existingMembership && existingMembership.status === "ACTIVE") {
      throw new InvitationConflictError("Esse email já é membro ativo desta farmácia");
    }
  }

  // Check for an existing pending invitation for this email in this pharmacy.
  const existingInvitation = await prisma.invitation.findFirst({
    where: {
      pharmacyId: ctx.pharmacyId,
      email: input.email,
      status: InvitationStatus.PENDING,
    },
  });
  if (existingInvitation) {
    throw new InvitationConflictError("Já existe um convite pendente para este email");
  }

  const ttlDays = Number(process.env.INVITE_TTL_DAYS ?? DEFAULT_TTL_DAYS) || DEFAULT_TTL_DAYS;
  const expiresAt = new Date(Date.now() + ttlDays * 24 * 60 * 60 * 1000);
  const { token, tokenHash } = generateToken();

  const pharmacy = await prisma.pharmacy.findUniqueOrThrow({
    where: { id: ctx.pharmacyId },
    select: { fantasia: true, razaoSocial: true },
  });
  const inviter = await prisma.user.findUniqueOrThrow({
    where: { id: ctx.userId },
    select: { name: true },
  });

  const invitation = await prisma.invitation.create({
    data: {
      pharmacyId: ctx.pharmacyId,
      email: input.email,
      phone: input.phone || null,
      role: input.role as Role,
      crf: input.crf || null,
      tokenHash,
      channels: input.channels,
      invitedById: ctx.userId,
      expiresAt,
    },
  });

  const inviteUrl = buildInviteUrl(token);
  const deliveries = await dispatchInvitation({
    invitationId: invitation.id,
    channels: input.channels,
    email: input.email,
    inviteeName: input.name,
    phone: input.phone,
    pharmacyName: pharmacy.fantasia ?? pharmacy.razaoSocial,
    role: input.role as Role,
    inviterName: inviter.name,
    inviteUrl,
    expiresAt,
  });

  return {
    invitationId: invitation.id,
    inviteUrl,
    expiresAt,
    deliveries,
  };
}

export async function resendInvitation(ctx: SessionContext, invitationId: string) {
  const invitation = await prisma.invitation.findFirst({
    where: { id: invitationId, pharmacyId: ctx.pharmacyId },
  });
  if (!invitation) throw new InvitationConflictError("Convite não encontrado");
  if (invitation.status !== InvitationStatus.PENDING) {
    throw new InvitationConflictError("Apenas convites pendentes podem ser reenviados");
  }
  if (invitation.expiresAt.getTime() < Date.now()) {
    throw new InvitationConflictError("Convite expirado — crie um novo");
  }

  const limit = await inviteRateLimit.limit(`resend:${ctx.userId}`);
  if (!limit.success) throw new RateLimitError(limit.reset);

  // We don't have the plain token (only hash). Resend uses a re-derived link
  // based on the original tokenHash being preserved on the invitation row.
  // For security, we cannot recover the plain token — so resend rotates the
  // token and updates the hash. The old link becomes invalid.
  const { token, tokenHash } = generateToken();
  await prisma.invitation.update({
    where: { id: invitationId },
    data: { tokenHash },
  });

  const pharmacy = await prisma.pharmacy.findUniqueOrThrow({
    where: { id: ctx.pharmacyId },
    select: { fantasia: true, razaoSocial: true },
  });
  const inviter = await prisma.user.findUniqueOrThrow({
    where: { id: ctx.userId },
    select: { name: true },
  });

  const inviteUrl = buildInviteUrl(token);
  const deliveries = await dispatchInvitation({
    invitationId: invitation.id,
    channels: invitation.channels,
    email: invitation.email,
    phone: invitation.phone,
    pharmacyName: pharmacy.fantasia ?? pharmacy.razaoSocial,
    role: invitation.role,
    inviterName: inviter.name,
    inviteUrl,
    expiresAt: invitation.expiresAt,
  });

  return { inviteUrl, deliveries };
}

export async function revokeInvitation(ctx: SessionContext, invitationId: string) {
  const invitation = await prisma.invitation.findFirst({
    where: { id: invitationId, pharmacyId: ctx.pharmacyId },
  });
  if (!invitation) throw new InvitationConflictError("Convite não encontrado");
  if (invitation.status !== InvitationStatus.PENDING) {
    throw new InvitationConflictError("Apenas convites pendentes podem ser revogados");
  }

  await prisma.invitation.update({
    where: { id: invitationId },
    data: {
      status: InvitationStatus.REVOKED,
      revokedAt: new Date(),
    },
  });
}
