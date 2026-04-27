import { buildInviteUrl } from "@/lib/invitations/token";

export function buildShareableLink(token: string): string {
  return buildInviteUrl(token);
}
