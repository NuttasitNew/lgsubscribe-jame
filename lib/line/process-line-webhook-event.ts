import { messagingApi, type webhook } from "@line/bot-sdk";
import { Prisma } from "@prisma/client";
import { getPrisma } from "@/lib/db/prisma";
import {
  prepareLineWebhookEvent,
  type LineProfile,
  type LineProfileFetcher,
} from "@/lib/line/prepare-line-webhook-event";

function errorMessage(error: unknown) {
  if (error instanceof Error) return error.message.slice(0, 4_000);
  return String(error).slice(0, 4_000);
}

async function fetchLineProfileFromApi(event: webhook.Event, userLineId: string): Promise<LineProfile> {
  const channelAccessToken = process.env.LINE_CHANNEL_ACCESS_TOKEN;

  if (!channelAccessToken) {
    return { userId: userLineId, displayName: "LINE User" };
  }

  const client = new messagingApi.MessagingApiClient({ channelAccessToken });
  const source = event.source;
  const profile =
    source?.type === "group"
      ? await client.getGroupMemberProfile(source.groupId, userLineId)
      : source?.type === "room"
        ? await client.getRoomMemberProfile(source.roomId, userLineId)
        : await client.getProfile(userLineId);
  return { ...profile, syncedFromLine: true };
}

function createProfileFetcher(event: webhook.Event): LineProfileFetcher {
  return async (userLineId) => {
    const prisma = getPrisma();

    if (event.type !== "follow") {
      const existing = await prisma.lineUser.findUnique({ where: { userLineId } });

      if (existing?.profileSyncedAt) {
        return {
          userId: existing.userLineId,
          displayName: existing.displayName,
          pictureUrl: existing.pictureUrl ?? undefined,
          statusMessage: existing.statusMessage ?? undefined,
          language: existing.language ?? undefined,
        };
      }
    }

    return fetchLineProfileFromApi(event, userLineId);
  };
}

function messageSourceWhere(message: {
  sourceUserId: string | null;
  sourceGroupId: string | null;
  sourceRoomId: string | null;
}) {
  if (message.sourceGroupId) return { sourceGroupId: message.sourceGroupId };
  if (message.sourceRoomId) return { sourceRoomId: message.sourceRoomId };
  return { sourceUserId: message.sourceUserId };
}

function messageThreadKey(message: {
  sourceUserId: string | null;
  sourceGroupId: string | null;
  sourceRoomId: string | null;
}) {
  if (message.sourceGroupId) return `group:${message.sourceGroupId}`;
  if (message.sourceRoomId) return `room:${message.sourceRoomId}`;
  if (message.sourceUserId) return `user:${message.sourceUserId}`;
  return null;
}

/** Processes one previously reserved LINE event in a single database transaction. */
export async function processLineWebhookEvent(event: webhook.Event) {
  const prisma = getPrisma();

  try {
    const prepared = await prepareLineWebhookEvent(event, createProfileFetcher(event));

    await prisma.$transaction(async (tx) => {
      const mutableMessageId =
        prepared.message?.lineMessageId ?? prepared.editedMessage?.lineMessageId ?? prepared.unsentMessageId;

      if (mutableMessageId) {
        // Different webhook requests can run concurrently. Serialize mutations
        // for the same LINE message so original/edit/unsend cannot pass each
        // other's existence checks in separate transactions.
        await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${mutableMessageId}, 0))`;
      }

      let shouldProjectMessage = prepared.message !== null;
      let projectedThread = prepared.thread;

      if (prepared.lineUser) {
        const user = prepared.lineUser;

        await tx.lineUser.upsert({
          where: { userLineId: user.userLineId },
          create: {
            userLineId: user.userLineId,
            displayName: user.displayName,
            pictureUrl: user.pictureUrl,
            statusMessage: user.statusMessage,
            language: user.language,
            isFollowing: user.isFollowing ?? false,
            followStateChangedAt: user.isFollowing === undefined ? null : user.lastSeenAt,
            followedAt: user.followedAt,
            unfollowedAt: user.unfollowedAt,
            profileSyncedAt: user.profileSyncedAt ?? null,
            lastSeenAt: user.lastSeenAt,
          },
          update: {},
        });

        if (user.profileSyncedAt) {
          await tx.lineUser.updateMany({
            where: {
              userLineId: user.userLineId,
              OR: [{ profileSyncedAt: null }, { profileSyncedAt: { lte: user.profileSyncedAt } }],
            },
            data: {
              displayName: user.displayName,
              pictureUrl: user.pictureUrl,
              statusMessage: user.statusMessage,
              language: user.language,
              profileSyncedAt: user.profileSyncedAt,
            },
          });
        }

        await tx.lineUser.updateMany({
          where: { userLineId: user.userLineId, lastSeenAt: { lte: user.lastSeenAt } },
          data: { lastSeenAt: user.lastSeenAt },
        });

        if (user.isFollowing !== undefined) {
          await tx.lineUser.updateMany({
            where: {
              userLineId: user.userLineId,
              OR: [{ followStateChangedAt: null }, { followStateChangedAt: { lte: user.lastSeenAt } }],
            },
            data: {
              isFollowing: user.isFollowing,
              followStateChangedAt: user.lastSeenAt,
              ...(user.isFollowing
                ? { followedAt: user.followedAt, unfollowedAt: null }
                : { unfollowedAt: user.unfollowedAt }),
            },
          });
        }
      }

      if (prepared.message) {
        const message = prepared.message;
        const unsent = await tx.lineUnsentMessage.findUnique({
          where: { lineMessageId: message.lineMessageId },
        });

        if (unsent) {
          shouldProjectMessage = false;
          await tx.lineWebhookEvent.update({
            where: { webhookEventId: message.webhookEventId },
            data: {
              eventData: {
                type: "redacted",
                messageId: message.lineMessageId,
                redactedByUnsendEventId: unsent.unsendWebhookEventId,
              },
            },
          });
        } else {
          const pendingEdit = await tx.linePendingMessageEdit.findUnique({
            where: { lineMessageId: message.lineMessageId },
          });
          const originalTimestamp = BigInt(message.occurredAt.getTime());
          const shouldApplyPendingEdit = pendingEdit && pendingEdit.editedAt > originalTimestamp;
          await tx.lineMessage.upsert({
            where: { lineMessageId: message.lineMessageId },
            create: {
              lineMessageId: message.lineMessageId,
              webhookEventId: message.webhookEventId,
              messageType: message.messageType,
              sourceType: message.sourceType,
              sourceUserId: message.sourceUserId,
              sourceGroupId: message.sourceGroupId,
              sourceRoomId: message.sourceRoomId,
              replyToken: message.replyToken,
              text: shouldApplyPendingEdit ? pendingEdit.text : message.text,
              messageData: (shouldApplyPendingEdit
                ? pendingEdit.messageData
                : message.messageData) as Prisma.InputJsonValue,
              timestamp: originalTimestamp,
              contentUpdatedAt: shouldApplyPendingEdit ? pendingEdit.editedAt : originalTimestamp,
              isRedelivery: message.isRedelivery,
            },
            update: {
              isRedelivery: { set: message.isRedelivery },
            },
          });
          if (pendingEdit) {
            await tx.linePendingMessageEdit.delete({ where: { lineMessageId: message.lineMessageId } });
          }
          if (shouldApplyPendingEdit && projectedThread) {
            projectedThread = {
              ...projectedThread,
              lastMessageText: pendingEdit.text ?? "[ข้อความ]",
            };
          }
        }
      }

      if (prepared.editedMessage) {
        const edited = prepared.editedMessage;
        const editedAt = BigInt(edited.editedAt.getTime());
        const unsent = await tx.lineUnsentMessage.findUnique({
          where: { lineMessageId: edited.lineMessageId },
        });

        if (unsent) {
          await tx.lineWebhookEvent.update({
            where: { webhookEventId: prepared.webhookEventId },
            data: {
              eventData: {
                type: "redacted",
                messageId: edited.lineMessageId,
                redactedByUnsendEventId: unsent.unsendWebhookEventId,
              },
            },
          });
        } else {
          const existingMessage = await tx.lineMessage.findUnique({
            where: { lineMessageId: edited.lineMessageId },
            select: { lineMessageId: true },
          });

          if (existingMessage) {
            const updated = await tx.lineMessage.updateMany({
              where: {
                lineMessageId: edited.lineMessageId,
                OR: [{ contentUpdatedAt: null }, { contentUpdatedAt: { lt: editedAt } }],
              },
              data: {
                text: edited.text,
                messageData: edited.messageData as Prisma.InputJsonValue,
                contentUpdatedAt: editedAt,
              },
            });

            if (updated.count === 1) {
              await tx.lineChatThread.updateMany({
                where: { lastMessageId: edited.lineMessageId },
                data: { lastMessageText: edited.text ?? "[ข้อความ]" },
              });
            }
          } else {
            await tx.linePendingMessageEdit.upsert({
              where: { lineMessageId: edited.lineMessageId },
              create: {
                lineMessageId: edited.lineMessageId,
                webhookEventId: prepared.webhookEventId,
                text: edited.text,
                messageData: edited.messageData as Prisma.InputJsonValue,
                editedAt,
              },
              update: {},
            });
            await tx.linePendingMessageEdit.updateMany({
              where: { lineMessageId: edited.lineMessageId, editedAt: { lt: editedAt } },
              data: {
                webhookEventId: prepared.webhookEventId,
                text: edited.text,
                messageData: edited.messageData as Prisma.InputJsonValue,
                editedAt,
              },
            });
          }
        }
      }

      if (prepared.unsentMessageId) {
        await tx.lineUnsentMessage.upsert({
          where: { lineMessageId: prepared.unsentMessageId },
          create: {
            lineMessageId: prepared.unsentMessageId,
            unsendWebhookEventId: prepared.webhookEventId,
            unsentAt: prepared.occurredAt,
          },
          update: {},
        });
        const unsent = await tx.lineMessage.findUnique({
          where: { lineMessageId: prepared.unsentMessageId },
        });

        if (unsent) {
          await tx.lineMessage.delete({ where: { lineMessageId: unsent.lineMessageId } });
          await tx.lineWebhookEvent.update({
            where: { webhookEventId: unsent.webhookEventId },
            data: {
              eventData: {
                type: "redacted",
                messageId: unsent.lineMessageId,
                redactedByUnsendEventId: prepared.webhookEventId,
              },
            },
          });

          const threadKey = messageThreadKey(unsent);
          if (threadKey) {
            const latest = await tx.lineMessage.findFirst({
              where: messageSourceWhere(unsent),
              orderBy: { timestamp: "desc" },
            });
            await tx.lineChatThread.updateMany({
              where: { threadKey, lastMessageId: unsent.lineMessageId },
              data: {
                lastMessageId: latest?.lineMessageId ?? null,
                lastMessageText: latest?.text ?? null,
                lastMessageAt: latest ? new Date(Number(latest.timestamp)) : null,
              },
            });
          }
        }
        await tx.lineWebhookEvent.updateMany({
          where: {
            eventType: "messageEdited",
            eventData: { path: ["message", "id"], equals: prepared.unsentMessageId },
          },
          data: {
            eventData: {
              type: "redacted",
              messageId: prepared.unsentMessageId,
              redactedByUnsendEventId: prepared.webhookEventId,
            },
          },
        });
        await tx.linePendingMessageEdit.deleteMany({
          where: { lineMessageId: prepared.unsentMessageId },
        });
      }

      if (projectedThread && shouldProjectMessage) {
        const thread = projectedThread;
        await tx.lineChatThread.upsert({
          where: { threadKey: thread.threadKey },
          create: {
            threadKey: thread.threadKey,
            sourceType: thread.sourceType,
            lineUserId: thread.sourceUserId,
            groupId: thread.sourceGroupId,
            roomId: thread.sourceRoomId,
            lastMessageId: thread.lastMessageId,
            lastMessageText: thread.lastMessageText,
            lastMessageAt: thread.lastMessageAt,
            unreadCount: 1,
            totalMessages: 1,
          },
          update: {
            unreadCount: { increment: 1 },
            totalMessages: { increment: 1 },
          },
        });
        await tx.lineChatThread.updateMany({
          where: {
            threadKey: thread.threadKey,
            OR: [{ lastMessageAt: null }, { lastMessageAt: { lte: thread.lastMessageAt } }],
          },
          data: {
            lastMessageId: thread.lastMessageId,
            lastMessageText: thread.lastMessageText,
            lastMessageAt: thread.lastMessageAt,
          },
        });
      }

      if (prepared.activity) {
        const activity = prepared.activity;
        await tx.lineDailyActivity.upsert({
          where: {
            activityDate_userLineId: {
              activityDate: activity.activityDate,
              userLineId: activity.userLineId,
            },
          },
          create: {
            activityDate: activity.activityDate,
            userLineId: activity.userLineId,
            firstEventType: activity.eventType,
            lastEventType: activity.eventType,
            firstEventAt: activity.occurredAt,
            lastEventAt: activity.occurredAt,
            messageCount: activity.messageIncrement,
          },
          update: {
            messageCount: { increment: activity.messageIncrement },
          },
        });
        await tx.lineDailyActivity.updateMany({
          where: {
            activityDate: activity.activityDate,
            userLineId: activity.userLineId,
            firstEventAt: { gt: activity.occurredAt },
          },
          data: { firstEventType: activity.eventType, firstEventAt: activity.occurredAt },
        });
        await tx.lineDailyActivity.updateMany({
          where: {
            activityDate: activity.activityDate,
            userLineId: activity.userLineId,
            lastEventAt: { lt: activity.occurredAt },
          },
          data: { lastEventType: activity.eventType, lastEventAt: activity.occurredAt },
        });
      }

      await tx.lineWebhookEvent.update({
        where: { webhookEventId: prepared.webhookEventId },
        data: {
          status: "PROCESSED",
          processedAt: new Date(),
          errorMessage: null,
        },
      });
    });
  } catch (error) {
    await prisma.lineWebhookEvent.updateMany({
      where: { webhookEventId: event.webhookEventId },
      data: { status: "FAILED", errorMessage: errorMessage(error) },
    });
    throw error;
  }
}
