import { Resend } from "resend";
import InviteEmail from "@/emails/invite";
import { roleLabel } from "@/lib/auth/permissions";
import { getIntegrationConfig } from "@/lib/integration-config";
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

export async function sendInviteEmail(params: EmailParams): Promise<EmailDeliveryResult> {
  // Config from the DB (IntegrationConfig, set via MCP) OVER env — lets e-mail be
  // activated without Vercel env vars (same pattern as WhatsApp/storage).
  const cfg = await getIntegrationConfig();
  const apiKey = cfg.resendApiKey ?? process.env.RESEND_API_KEY;
  const from = cfg.emailFrom ?? process.env.EMAIL_FROM ?? "Farma <no-reply@farma.app>";
  if (!apiKey) {
    return {
      status: "SKIPPED",
      error: "Resend não configurado (defina resendApiKey em Integrações ou RESEND_API_KEY)",
    };
  }
  const resend = new Resend(apiKey);

  try {
    const { data, error } = await resend.emails.send({
      from,
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
