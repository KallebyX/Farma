import { InvitationChannel, type Role } from "@prisma/client";
import { prisma } from "@/lib/db";
import { sendInviteEmail } from "@/lib/invitations/channels/email";
import { sendInviteWhatsApp } from "@/lib/invitations/channels/whatsapp";

type DispatchInput = {
  invitationId: string;
  channels: InvitationChannel[];
  email: string;
  inviteeName?: string;
  phone?: string | null;
  pharmacyName: string;
  role: Role;
  inviterName: string;
  inviteUrl: string;
  expiresAt: Date;
};

export type DispatchSummary = {
  channel: InvitationChannel;
  status: "SENT" | "FAILED" | "SKIPPED";
  error?: string;
  providerId?: string;
};

export async function dispatchInvitation(input: DispatchInput): Promise<DispatchSummary[]> {
  const summaries: DispatchSummary[] = [];

  for (const channel of input.channels) {
    if (channel === InvitationChannel.LINK) {
      // LINK is always available via the modal; no async dispatch needed,
      // but we still record it so the audit log shows it was distributed.
      await prisma.invitationDelivery.create({
        data: {
          invitationId: input.invitationId,
          channel,
          status: "SENT",
          providerId: input.inviteUrl,
        },
      });
      summaries.push({ channel, status: "SENT", providerId: input.inviteUrl });
      continue;
    }

    if (channel === InvitationChannel.EMAIL) {
      const result = await sendInviteEmail({
        to: input.email,
        inviteeName: input.inviteeName,
        pharmacyName: input.pharmacyName,
        role: input.role,
        inviterName: input.inviterName,
        inviteUrl: input.inviteUrl,
        expiresAt: input.expiresAt,
      });
      await prisma.invitationDelivery.create({
        data: {
          invitationId: input.invitationId,
          channel,
          status: result.status,
          providerId: result.providerId,
          error: result.error,
        },
      });
      summaries.push({ channel, ...result });
      continue;
    }

    if (channel === InvitationChannel.WHATSAPP) {
      if (!input.phone) {
        await prisma.invitationDelivery.create({
          data: {
            invitationId: input.invitationId,
            channel,
            status: "SKIPPED",
            error: "Telefone não informado",
          },
        });
        summaries.push({ channel, status: "SKIPPED", error: "Telefone não informado" });
        continue;
      }
      const result = await sendInviteWhatsApp({
        phone: input.phone,
        pharmacyName: input.pharmacyName,
        role: input.role,
        inviterName: input.inviterName,
        inviteUrl: input.inviteUrl,
      });
      await prisma.invitationDelivery.create({
        data: {
          invitationId: input.invitationId,
          channel,
          status: result.status,
          providerId: result.providerId,
          error: result.error,
        },
      });
      summaries.push({ channel, ...result });
      continue;
    }
  }

  return summaries;
}
