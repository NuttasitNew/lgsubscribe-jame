import type { webhook } from "@line/bot-sdk";

export type LineProfile = {
  userId: string;
  displayName: string;
  pictureUrl?: string;
  statusMessage?: string;
  language?: string;
  syncedFromLine?: boolean;
};

export type LineProfileFetcher = (userLineId: string) => Promise<LineProfile>;

type SourceFields = {
  sourceType: string;
  sourceUserId: string | null;
  sourceGroupId: string | null;
  sourceRoomId: string | null;
};

export type PreparedLineWebhookEvent = {
  webhookEventId: string;
  eventType: string;
  occurredAt: Date;
  lineUser: null | {
    userLineId: string;
    displayName: string;
    pictureUrl: string | null;
    statusMessage: string | null;
    language: string | null;
    profileSyncedAt?: Date;
    isFollowing?: boolean;
    followedAt?: Date;
    unfollowedAt?: Date;
    lastSeenAt: Date;
  };
  activity: null | {
    activityDate: Date;
    userLineId: string;
    eventType: string;
    occurredAt: Date;
    messageIncrement: number;
  };
  unsentMessageId: string | null;
  editedMessage: null | {
    lineMessageId: string;
    text: string | null;
    messageData: Record<string, unknown>;
    editedAt: Date;
  };
  message:
    | null
    | (SourceFields & {
        lineMessageId: string;
        webhookEventId: string;
        replyToken: string | null;
        messageType: string;
        text: string | null;
        messageData: Record<string, unknown>;
        occurredAt: Date;
        isRedelivery: boolean;
      });
  thread:
    | null
    | (SourceFields & {
        threadKey: string;
        lastMessageId: string;
        lastMessageText: string;
        lastMessageAt: Date;
      });
};

function readSource(event: webhook.Event): SourceFields {
  const source = event.source;

  return {
    sourceType: source?.type ?? "unknown",
    sourceUserId: source && "userId" in source ? (source.userId ?? null) : null,
    sourceGroupId: source && "groupId" in source ? (source.groupId ?? null) : null,
    sourceRoomId: source && "roomId" in source ? (source.roomId ?? null) : null,
  };
}

function buildThreadKey(source: SourceFields) {
  if (source.sourceGroupId) return `group:${source.sourceGroupId}`;
  if (source.sourceRoomId) return `room:${source.sourceRoomId}`;
  if (source.sourceUserId) return `user:${source.sourceUserId}`;
  return null;
}

function describeMessage(message: Record<string, unknown>) {
  if (message.type === "text" && typeof message.text === "string") return message.text;
  if (message.type === "image") return "[รูปภาพ]";
  if (message.type === "video") return "[วิดีโอ]";
  if (message.type === "audio") return "[เสียง]";
  if (message.type === "file") return "[ไฟล์]";
  if (message.type === "location") return "[ตำแหน่ง]";
  if (message.type === "sticker") return "[สติกเกอร์]";
  return "[ข้อความ]";
}

function startOfUtcDay(date: Date) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

async function prepareLineUser(
  event: webhook.Event,
  sourceUserId: string | null,
  occurredAt: Date,
  getProfile: LineProfileFetcher,
): Promise<PreparedLineWebhookEvent["lineUser"]> {
  if (!sourceUserId) return null;

  if (event.type === "unfollow") {
    return {
      userLineId: sourceUserId,
      displayName: "LINE User",
      pictureUrl: null,
      statusMessage: null,
      language: null,
      isFollowing: false,
      unfollowedAt: occurredAt,
      lastSeenAt: occurredAt,
    };
  }

  let profile: LineProfile;

  try {
    profile = await getProfile(sourceUserId);
  } catch {
    profile = { userId: sourceUserId, displayName: "LINE User" };
  }

  return {
    userLineId: sourceUserId,
    displayName: profile.displayName || "LINE User",
    pictureUrl: profile.pictureUrl || null,
    statusMessage: profile.statusMessage || null,
    language: profile.language || null,
    ...(profile.syncedFromLine ? { profileSyncedAt: new Date() } : {}),
    ...(event.type === "follow" ? { isFollowing: true, followedAt: occurredAt } : {}),
    lastSeenAt: occurredAt,
  };
}

/**
 * Converts a LINE SDK webhook event into the normalized records stored by the
 * application while retaining the complete message payload for future use.
 */
export async function prepareLineWebhookEvent(
  event: webhook.Event,
  getProfile: LineProfileFetcher,
): Promise<PreparedLineWebhookEvent> {
  const occurredAt = new Date(event.timestamp);
  const source = readSource(event);
  const lineUser = await prepareLineUser(event, source.sourceUserId, occurredAt, getProfile);
  const activity = source.sourceUserId
    ? {
        activityDate: startOfUtcDay(occurredAt),
        userLineId: source.sourceUserId,
        eventType: event.type,
        occurredAt,
        messageIncrement: event.type === "message" ? 1 : 0,
      }
    : null;

  if (event.type === "unsend") {
    return {
      webhookEventId: event.webhookEventId,
      eventType: event.type,
      occurredAt,
      lineUser,
      activity,
      unsentMessageId: event.unsend.messageId,
      editedMessage: null,
      message: null,
      thread: null,
    };
  }

  if (event.type === "messageEdited") {
    const messageData = event.message as unknown as Record<string, unknown>;
    return {
      webhookEventId: event.webhookEventId,
      eventType: event.type,
      occurredAt,
      lineUser,
      activity,
      unsentMessageId: null,
      editedMessage: {
        lineMessageId: event.message.id,
        text: event.message.type === "text" ? event.message.text : null,
        messageData,
        editedAt: occurredAt,
      },
      message: null,
      thread: null,
    };
  }

  if (event.type !== "message") {
    return {
      webhookEventId: event.webhookEventId,
      eventType: event.type,
      occurredAt,
      lineUser,
      activity,
      unsentMessageId: null,
      editedMessage: null,
      message: null,
      thread: null,
    };
  }

  const messageData = event.message as unknown as Record<string, unknown>;
  const threadKey = buildThreadKey(source);
  const lastMessageText = describeMessage(messageData);

  return {
    webhookEventId: event.webhookEventId,
    eventType: event.type,
    occurredAt,
    lineUser,
    activity,
    unsentMessageId: null,
    editedMessage: null,
    message: {
      ...source,
      lineMessageId: event.message.id,
      webhookEventId: event.webhookEventId,
      replyToken: event.replyToken ?? null,
      messageType: event.message.type,
      text: event.message.type === "text" ? event.message.text : null,
      messageData,
      occurredAt,
      isRedelivery: event.deliveryContext.isRedelivery,
    },
    thread: threadKey
      ? {
          ...source,
          threadKey,
          lastMessageId: event.message.id,
          lastMessageText,
          lastMessageAt: occurredAt,
        }
      : null,
  };
}
