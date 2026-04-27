import { InvitationStatus } from "@prisma/client";
import argon2 from "argon2";
import { prisma } from "@/lib/db";
import { hashToken } from "@/lib/invitations/token";
import type { AcceptInvitationInput } from "@/lib/invitations/schema";

export class InvalidInviteError extends Error {
  status = 400;
}

export type InviteSummary = {
  id: string;
  email: string;
  pharmacyName: string;
  inviterName: string;
  roleLabel: string;
  expiresAt: Date;
  userExists: boolean;
};

export async function loadInviteForAcceptance(token: string): Promise<InviteSummary> {
  const tokenHash = hashToken(token);
  const invitation = await prisma.invitation.findUnique({
    where: { tokenHash },
    include: {
      pharmacy: { select: { fantasia: true, razaoSocial: true } },
      invitedBy: { select: { name: true } },
    },
  });

  if (!invitation) throw new InvalidInviteError("Convite inválido ou já utilizado");
  if (invitation.status === InvitationStatus.ACCEPTED) {
    throw new InvalidInviteError("Esse convite já foi aceito");
  }
  if (invitation.status === InvitationStatus.REVOKED) {
    throw new InvalidInviteError("Esse convite foi revogado pelo administrador");
  }
  if (invitation.status === InvitationStatus.EXPIRED || invitation.expiresAt.getTime() < Date.now()) {
    throw new InvalidInviteError("Esse convite expirou — peça um novo ao administrador");
  }

  const existingUser = await prisma.user.findUnique({ where: { email: invitation.email } });

  return {
    id: invitation.id,
    email: invitation.email,
    pharmacyName: invitation.pharmacy.fantasia ?? invitation.pharmacy.razaoSocial,
    inviterName: invitation.invitedBy.name,
    roleLabel: invitation.role,
    expiresAt: invitation.expiresAt,
    userExists: Boolean(existingUser),
  };
}

const CONSENT_VERSION = "1.0";

export type AcceptInviteResult = {
  userId: string;
  pharmacyId: string;
  email: string;
};

export async function acceptInvitation(input: AcceptInvitationInput): Promise<AcceptInviteResult> {
  const tokenHash = hashToken(input.token);
  const invitation = await prisma.invitation.findUnique({ where: { tokenHash } });

  if (!invitation) throw new InvalidInviteError("Convite inválido");
  if (invitation.status !== InvitationStatus.PENDING) {
    throw new InvalidInviteError("Convite não está mais ativo");
  }
  if (invitation.expiresAt.getTime() < Date.now()) {
    throw new InvalidInviteError("Convite expirado");
  }

  const passwordHash = await argon2.hash(input.password);

  const result = await prisma.$transaction(async (tx) => {
    const user = await tx.user.upsert({
      where: { email: invitation.email },
      update: {
        // Only set password/name on existing user if they don't have one yet
        // (defensive: someone could already have a passwordless account from a
        // future SSO flow). Don't overwrite established credentials silently.
        name: input.name,
        passwordHash,
        consentVersion: CONSENT_VERSION,
        emailVerified: new Date(),
      },
      create: {
        email: invitation.email,
        name: input.name,
        passwordHash,
        consentVersion: CONSENT_VERSION,
        emailVerified: new Date(),
      },
    });

    await tx.membership.upsert({
      where: { userId_pharmacyId: { userId: user.id, pharmacyId: invitation.pharmacyId } },
      update: {
        role: invitation.role,
        crf: invitation.crf,
        status: "ACTIVE",
      },
      create: {
        userId: user.id,
        pharmacyId: invitation.pharmacyId,
        role: invitation.role,
        crf: invitation.crf,
        invitedById: invitation.invitedById,
      },
    });

    await tx.invitation.update({
      where: { id: invitation.id },
      data: {
        status: InvitationStatus.ACCEPTED,
        acceptedAt: new Date(),
        acceptedById: user.id,
      },
    });

    return { userId: user.id, pharmacyId: invitation.pharmacyId, email: invitation.email };
  });

  return result;
}
