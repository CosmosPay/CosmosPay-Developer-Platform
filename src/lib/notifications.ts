/* notifications.ts — activity notifications (sign-ins, API-key actions, …).
   System code creates them directly via createNotification(); the public POST
   endpoint is gated to owner/admin accounts (see src/pages/api/notifications). */
import { prisma } from "@/lib/prisma";

export interface NotificationInput {
  userId: string;
  type: string;
  title: string;
  message?: string | null;
  origin?: string | null;
  country?: string | null;
  region?: string | null;
  ipAddress?: string | null;
  metadata?: unknown;
}

export async function createNotification(input: NotificationInput) {
  return prisma.notification.create({
    data: {
      userId: input.userId,
      type: input.type,
      title: input.title,
      message: input.message ?? null,
      origin: input.origin ?? null,
      country: input.country ?? null,
      region: input.region ?? null,
      ipAddress: input.ipAddress ?? null,
      metadata: (input.metadata ?? undefined) as never,
    },
  });
}

export async function listNotifications(userId: string, limit = 50) {
  return prisma.notification.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: limit,
  });
}

export async function markAllNotificationsRead(userId: string) {
  return prisma.notification.updateMany({
    where: { userId, read: false },
    data: { read: true },
  });
}

/* Never let a notification failure break the action that triggered it. */
export function safeNotify(input: NotificationInput): void {
  createNotification(input).catch(() => {});
}
