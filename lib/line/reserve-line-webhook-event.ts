import type { webhook } from "@line/bot-sdk";
import { Prisma } from "@prisma/client";
import { getPrisma } from "@/lib/db/prisma";

const STALE_PENDING_EVENT_MS = 5 * 60 * 1000;

function isUniqueConstraintError(error: unknown) {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002";
}

/**
 * Persists the raw event before acknowledging LINE and atomically claims it.
 * Failed events and stale pending events may be reclaimed by LINE redelivery.
 */
export async function reserveLineWebhookEvent(destination: string, event: webhook.Event) {
  const prisma = getPrisma();

  try {
    await prisma.lineWebhookEvent.create({
      data: {
        webhookEventId: event.webhookEventId,
        destination,
        eventType: event.type,
        eventData: event as Prisma.InputJsonValue,
        timestamp: BigInt(event.timestamp),
      },
    });

    return "accepted" as const;
  } catch (error) {
    if (!isUniqueConstraintError(error)) throw error;
  }

  const staleBefore = new Date(Date.now() - STALE_PENDING_EVENT_MS);
  const reclaimed = await prisma.lineWebhookEvent.updateMany({
    where: {
      webhookEventId: event.webhookEventId,
      OR: [{ status: "FAILED" }, { status: "PENDING", updatedAt: { lt: staleBefore } }],
    },
    data: {
      destination,
      eventType: event.type,
      eventData: event as Prisma.InputJsonValue,
      timestamp: BigInt(event.timestamp),
      status: "PENDING",
      errorMessage: null,
      attemptCount: { increment: 1 },
    },
  });

  if (reclaimed.count === 1) return "accepted" as const;

  const existing = await prisma.lineWebhookEvent.findUnique({
    where: { webhookEventId: event.webhookEventId },
    select: { status: true },
  });

  return existing?.status === "PROCESSED" ? ("processed" as const) : ("pending" as const);
}
