import { getPrisma } from "@/lib/db/prisma";

export type BackofficeLineOverview = {
  databaseConnected: true;
  lineConfigured: boolean;
  totalUsers: number;
  followingUsers: number;
  messagesToday: number;
  failedEvents: number;
  recentMessages: Array<{
    id: string;
    text: string;
    displayName: string;
    occurredAt: Date;
  }>;
  recentUsers: Array<{
    userLineId: string;
    displayName: string;
    pictureUrl: string | null;
    isFollowing: boolean;
    lastSeenAt: Date;
    lastMessage: string | null;
  }>;
};

function startOfBangkokDay(now = new Date()) {
  const bangkokDate = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Bangkok",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);

  return new Date(`${bangkokDate}T00:00:00+07:00`);
}

/** Loads the real LINE ingestion status displayed in the local backoffice. */
export async function getBackofficeLineOverview(): Promise<BackofficeLineOverview> {
  const prisma = getPrisma();
  const today = startOfBangkokDay();
  const tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1_000);
  const [totalUsers, followingUsers, messagesToday, failedEvents, messages, users] = await Promise.all([
    prisma.lineUser.count(),
    prisma.lineUser.count({ where: { isFollowing: true } }),
    prisma.lineMessage.count({
      where: { timestamp: { gte: BigInt(today.getTime()), lt: BigInt(tomorrow.getTime()) } },
    }),
    prisma.lineWebhookEvent.count({ where: { status: "FAILED" } }),
    prisma.lineMessage.findMany({
      where: { text: { not: null } },
      orderBy: { timestamp: "desc" },
      take: 5,
      select: {
        lineMessageId: true,
        text: true,
        timestamp: true,
        user: { select: { displayName: true } },
      },
    }),
    prisma.lineUser.findMany({
      orderBy: { lastSeenAt: "desc" },
      take: 8,
      select: {
        userLineId: true,
        displayName: true,
        pictureUrl: true,
        isFollowing: true,
        lastSeenAt: true,
        threads: {
          orderBy: { lastMessageAt: "desc" },
          take: 1,
          select: { lastMessageText: true },
        },
      },
    }),
  ]);

  return {
    databaseConnected: true,
    lineConfigured: Boolean(process.env.LINE_CHANNEL_SECRET && process.env.LINE_CHANNEL_ACCESS_TOKEN),
    totalUsers,
    followingUsers,
    messagesToday,
    failedEvents,
    recentMessages: messages.map((message) => ({
      id: message.lineMessageId,
      text: message.text ?? "",
      displayName: message.user?.displayName ?? "LINE User",
      occurredAt: new Date(Number(message.timestamp)),
    })),
    recentUsers: users.map((user) => ({
      userLineId: user.userLineId,
      displayName: user.displayName,
      pictureUrl: user.pictureUrl,
      isFollowing: user.isFollowing,
      lastSeenAt: user.lastSeenAt,
      lastMessage: user.threads[0]?.lastMessageText ?? null,
    })),
  };
}
