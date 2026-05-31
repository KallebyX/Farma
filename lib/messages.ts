import { prisma } from "@/lib/db";
import type { MessageDirection } from "@prisma/client";

/** Patient ↔ pharmacy in-app messaging thread (complements WhatsApp). */

const messageSelect = {
  id: true, direction: true, body: true, authorName: true, createdAt: true,
} as const;

export function listMessages(patientId: string) {
  return prisma.patientMessage.findMany({
    where: { patientId },
    orderBy: { createdAt: "asc" },
    take: 300,
    select: messageSelect,
  });
}

export async function sendMessage(args: {
  patientId: string;
  pharmacyId: string;
  direction: MessageDirection;
  body: string;
  authorName?: string | null;
}) {
  const body = args.body.trim().slice(0, 2000);
  if (body.length === 0) return null;
  return prisma.patientMessage.create({
    data: {
      patientId: args.patientId,
      pharmacyId: args.pharmacyId,
      direction: args.direction,
      body,
      authorName: args.authorName?.slice(0, 80) ?? null,
    },
    select: messageSelect,
  });
}

/** Marks the other side's messages as read. */
export function markRead(patientId: string, side: MessageDirection) {
  return prisma.patientMessage.updateMany({
    where: { patientId, direction: side, readAt: null },
    data: { readAt: new Date() },
  });
}
