import { Resend } from "resend";
import InviteEmail from "@/emails/invite";
import { roleLabel } from "@/lib/auth/permissions";
import type { Role } from "@prisma/client";

export type EmailDeliveryResult = {
  status: "SENT" | "FAILED" | "SKIPPED";
  providerId?: string;
  error?: string;
};

type EmailParams = {
  to: string;
  inviteeName?: string;
  pharmacyName: string;
  role: Role;
  inviterName: string;
  inviteUrl: string;
  expiresAt: Date;
};

let cachedClient: Resend | null = null;

function getResend(): Resend | null {
  if (!process.env.RESEND_API_KEY) return null;
  if (!cachedClient) cachedClient = new Resend(process.env.RESEND_API_KEY);
  return cachedClient;
}

export async function sendInviteEmail(params: EmailParams): Promise<EmailDeliveryResult> {
  const resend = getResend();
  if (!resend) {
    return {
      status: "SKIPPED",
      error: "RESEND_API_KEY não configurada — email não enviado",
    };
  }

  try {
    const { data, error } = await resend.emails.send({
      from: process.env.EMAIL_FROM ?? "Farma <no-reply@farma.app>",
      to: [params.to],
      subject: `${params.inviterName} convidou você para a ${params.pharmacyName}`,
      react: InviteEmail({
        inviteeName: params.inviteeName,
        pharmacyName: params.pharmacyName,
        roleLabel: roleLabel(params.role),
        inviterName: params.inviterName,
        inviteUrl: params.inviteUrl,
        expiresAt: params.expiresAt,
      }),
    });

    if (error) {
      return { status: "FAILED", error: error.message ?? String(error) };
    }
    return { status: "SENT", providerId: data?.id };
  } catch (err) {
    return {
      status: "FAILED",
      error: err instanceof Error ? err.message : String(err),
    };
  }
}
