// @vitest-environment node

import { randomUUID } from "node:crypto";
import { config as loadEnv } from "dotenv";
import { describe, expect, it } from "vitest";
import type { webhook } from "@line/bot-sdk";
import { getPrisma } from "@/lib/db/prisma";
import { processLineWebhookEvent } from "@/lib/line/process-line-webhook-event";
import { reserveLineWebhookEvent } from "@/lib/line/reserve-line-webhook-event";

loadEnv({ path: ".env.local", quiet: true });

const runDatabaseIntegration = process.env.RUN_DATABASE_INTEGRATION === "true";

describe.skipIf(!runDatabaseIntegration)("LINE webhook Neon persistence", () => {
  it("persists a user, raw event, message, thread and daily activity exactly once", async () => {
    const suffix = randomUUID().replaceAll("-", "");
    const userLineId = `Utest${suffix}`;
    const webhookEventId = `event-${suffix}`;
    const lineMessageId = `message-${suffix}`;
    const timestamp = Date.now();
    const event = {
      type: "message",
      mode: "active",
      timestamp,
      webhookEventId,
      deliveryContext: { isRedelivery: false },
      source: { type: "user", userId: userLineId },
      replyToken: "integration-reply-token",
      message: {
        id: lineMessageId,
        type: "text",
        quoteToken: "integration-quote-token",
        text: "ทดสอบบันทึก LINE webhook",
      },
    } as webhook.Event;
    const prisma = getPrisma();

    try {
      await expect(reserveLineWebhookEvent("Udestination", event)).resolves.toBe("accepted");
      await expect(reserveLineWebhookEvent("Udestination", event)).resolves.toBe("pending");
      await processLineWebhookEvent(event);

      const [user, webhookEvent, message, thread, activity] = await Promise.all([
        prisma.lineUser.findUnique({ where: { userLineId } }),
        prisma.lineWebhookEvent.findUnique({ where: { webhookEventId } }),
        prisma.lineMessage.findUnique({ where: { lineMessageId } }),
        prisma.lineChatThread.findUnique({ where: { threadKey: `user:${userLineId}` } }),
        prisma.lineDailyActivity.findFirst({ where: { userLineId } }),
      ]);

      expect(user).toMatchObject({ userLineId, displayName: "LINE User", isFollowing: false });
      expect(webhookEvent).toMatchObject({ webhookEventId, status: "PROCESSED", attemptCount: 1 });
      expect(message).toMatchObject({
        lineMessageId,
        text: "ทดสอบบันทึก LINE webhook",
        messageType: "text",
      });
      expect(thread).toMatchObject({ unreadCount: 1, totalMessages: 1 });
      expect(activity).toMatchObject({ userLineId, messageCount: 1 });
    } finally {
      await prisma.$transaction([
        prisma.lineDailyActivity.deleteMany({ where: { userLineId } }),
        prisma.lineChatThread.deleteMany({ where: { lineUserId: userLineId } }),
        prisma.lineWebhookEvent.deleteMany({ where: { webhookEventId } }),
        prisma.lineUser.deleteMany({ where: { userLineId } }),
      ]);
    }
  }, 20_000);

  it("keeps projections ordered and redacts messages after edits and unsend", async () => {
    const suffix = randomUUID().replaceAll("-", "");
    const userLineId = `Uorder${suffix}`;
    const olderTimestamp = Date.now() - 2_000;
    const newerTimestamp = Date.now() - 1_000;
    const olderEventId = `event-old-${suffix}`;
    const newerEventId = `event-new-${suffix}`;
    const editEventId = `event-edit-${suffix}`;
    const staleEditEventId = `event-stale-edit-${suffix}`;
    const unsendEventId = `event-unsend-${suffix}`;
    const followEventId = `event-follow-${suffix}`;
    const unfollowEventId = `event-unfollow-${suffix}`;
    const olderMessageId = `message-old-${suffix}`;
    const newerMessageId = `message-new-${suffix}`;
    const eventIds = [
      olderEventId,
      newerEventId,
      editEventId,
      staleEditEventId,
      unsendEventId,
      followEventId,
      unfollowEventId,
    ];
    const makeMessageEvent = (
      webhookEventId: string,
      lineMessageId: string,
      timestamp: number,
      text: string,
    ) =>
      ({
        type: "message",
        mode: "active",
        timestamp,
        webhookEventId,
        deliveryContext: { isRedelivery: false },
        source: { type: "user", userId: userLineId },
        replyToken: "integration-reply-token",
        message: { id: lineMessageId, type: "text", quoteToken: "quote-token", text },
      }) as webhook.Event;
    const olderEvent = makeMessageEvent(olderEventId, olderMessageId, olderTimestamp, "ข้อความเก่า");
    const newerEvent = makeMessageEvent(newerEventId, newerMessageId, newerTimestamp, "ข้อความใหม่");
    const prisma = getPrisma();

    try {
      // Deliberately process the newer callback first to model LINE redelivery order.
      for (const event of [newerEvent, olderEvent]) {
        await reserveLineWebhookEvent("Udestination", event);
        await processLineWebhookEvent(event);
      }

      const [orderedUser, orderedThread, orderedActivity] = await Promise.all([
        prisma.lineUser.findUnique({ where: { userLineId } }),
        prisma.lineChatThread.findUnique({ where: { threadKey: `user:${userLineId}` } }),
        prisma.lineDailyActivity.findFirst({ where: { userLineId } }),
      ]);
      expect(orderedUser?.lastSeenAt.getTime()).toBe(newerTimestamp);
      expect(orderedThread).toMatchObject({
        lastMessageId: newerMessageId,
        lastMessageText: "ข้อความใหม่",
        totalMessages: 2,
      });
      expect(orderedActivity?.firstEventAt.getTime()).toBe(olderTimestamp);
      expect(orderedActivity?.lastEventAt.getTime()).toBe(newerTimestamp);
      expect(orderedActivity?.messageCount).toBe(2);

      const olderFollowEvent = {
        type: "follow",
        mode: "active",
        timestamp: newerTimestamp + 200,
        webhookEventId: followEventId,
        deliveryContext: { isRedelivery: true },
        source: { type: "user", userId: userLineId },
      } as webhook.Event;
      const newerUnfollowEvent = {
        ...olderFollowEvent,
        type: "unfollow",
        timestamp: newerTimestamp + 400,
        webhookEventId: unfollowEventId,
        deliveryContext: { isRedelivery: false },
      } as webhook.Event;
      for (const event of [newerUnfollowEvent, olderFollowEvent]) {
        await reserveLineWebhookEvent("Udestination", event);
        await processLineWebhookEvent(event);
      }
      await expect(prisma.lineUser.findUnique({ where: { userLineId } })).resolves.toMatchObject({
        isFollowing: false,
        followStateChangedAt: new Date(newerTimestamp + 400),
      });

      const editedEvent = {
        ...newerEvent,
        type: "messageEdited",
        timestamp: newerTimestamp + 800,
        webhookEventId: editEventId,
        message: { id: newerMessageId, type: "text", text: "ข้อความใหม่หลังแก้ไข" },
      } as webhook.Event;
      const staleEditEvent = {
        ...editedEvent,
        timestamp: newerTimestamp + 400,
        webhookEventId: staleEditEventId,
        message: { id: newerMessageId, type: "text", text: "ข้อความแก้ไขที่มาช้า" },
      } as webhook.Event;
      for (const event of [editedEvent, staleEditEvent]) {
        await reserveLineWebhookEvent("Udestination", event);
        await processLineWebhookEvent(event);
      }
      await expect(
        prisma.lineMessage.findUnique({ where: { lineMessageId: newerMessageId } }),
      ).resolves.toMatchObject({
        text: "ข้อความใหม่หลังแก้ไข",
      });

      const unsendEvent = {
        ...newerEvent,
        type: "unsend",
        timestamp: newerTimestamp + 1_000,
        webhookEventId: unsendEventId,
        unsend: { messageId: newerMessageId },
      } as webhook.Event;
      await reserveLineWebhookEvent("Udestination", unsendEvent);
      await processLineWebhookEvent(unsendEvent);

      const [removedMessage, redactedEvent, fallbackThread] = await Promise.all([
        prisma.lineMessage.findUnique({ where: { lineMessageId: newerMessageId } }),
        prisma.lineWebhookEvent.findUnique({ where: { webhookEventId: newerEventId } }),
        prisma.lineChatThread.findUnique({ where: { threadKey: `user:${userLineId}` } }),
      ]);
      expect(removedMessage).toBeNull();
      expect(redactedEvent?.eventData).toMatchObject({
        type: "redacted",
        messageId: newerMessageId,
        redactedByUnsendEventId: unsendEventId,
      });
      expect(fallbackThread).toMatchObject({
        lastMessageId: olderMessageId,
        lastMessageText: "ข้อความเก่า",
      });
    } finally {
      await prisma.$transaction([
        prisma.lineDailyActivity.deleteMany({ where: { userLineId } }),
        prisma.lineChatThread.deleteMany({ where: { lineUserId: userLineId } }),
        prisma.lineWebhookEvent.deleteMany({ where: { webhookEventId: { in: eventIds } } }),
        prisma.linePendingMessageEdit.deleteMany({ where: { lineMessageId: newerMessageId } }),
        prisma.lineUnsentMessage.deleteMany({ where: { lineMessageId: newerMessageId } }),
        prisma.lineUser.deleteMany({ where: { userLineId } }),
      ]);
    }
  }, 20_000);

  it("keeps an unsent message redacted when the unsend arrives first", async () => {
    const suffix = randomUUID().replaceAll("-", "");
    const userLineId = `Uunsend${suffix}`;
    const lineMessageId = `message-unsent-first-${suffix}`;
    const unsendWebhookEventId = `event-unsent-first-${suffix}`;
    const messageWebhookEventId = `event-message-late-${suffix}`;
    const editWebhookEventId = `event-edit-before-unsend-${suffix}`;
    const timestamp = Date.now();
    const unsendEvent = {
      type: "unsend",
      mode: "active",
      timestamp: timestamp + 1_000,
      webhookEventId: unsendWebhookEventId,
      deliveryContext: { isRedelivery: false },
      source: { type: "user", userId: userLineId },
      unsend: { messageId: lineMessageId },
    } as webhook.Event;
    const lateMessageEvent = {
      type: "message",
      mode: "active",
      timestamp,
      webhookEventId: messageWebhookEventId,
      deliveryContext: { isRedelivery: true },
      source: { type: "user", userId: userLineId },
      replyToken: "late-reply-token",
      message: { id: lineMessageId, type: "text", quoteToken: "late-quote", text: "ข้อมูลที่ถอนแล้ว" },
    } as webhook.Event;
    const earlyEditEvent = {
      ...lateMessageEvent,
      type: "messageEdited",
      timestamp: timestamp + 500,
      webhookEventId: editWebhookEventId,
      message: { id: lineMessageId, type: "text", text: "ข้อมูลที่แก้ไขแล้วถอน" },
    } as webhook.Event;
    const prisma = getPrisma();

    try {
      for (const event of [earlyEditEvent, unsendEvent, lateMessageEvent]) {
        await reserveLineWebhookEvent("Udestination", event);
        await processLineWebhookEvent(event);
      }

      const [message, rawEvent, rawEditEvent, thread, tombstone, pendingEdit] = await Promise.all([
        prisma.lineMessage.findUnique({ where: { lineMessageId } }),
        prisma.lineWebhookEvent.findUnique({ where: { webhookEventId: messageWebhookEventId } }),
        prisma.lineWebhookEvent.findUnique({ where: { webhookEventId: editWebhookEventId } }),
        prisma.lineChatThread.findUnique({ where: { threadKey: `user:${userLineId}` } }),
        prisma.lineUnsentMessage.findUnique({ where: { lineMessageId } }),
        prisma.linePendingMessageEdit.findUnique({ where: { lineMessageId } }),
      ]);
      expect(message).toBeNull();
      expect(thread).toBeNull();
      expect(rawEvent?.eventData).toMatchObject({
        type: "redacted",
        messageId: lineMessageId,
        redactedByUnsendEventId: unsendWebhookEventId,
      });
      expect(rawEditEvent?.eventData).toMatchObject({
        type: "redacted",
        messageId: lineMessageId,
        redactedByUnsendEventId: unsendWebhookEventId,
      });
      expect(tombstone).toMatchObject({ lineMessageId, unsendWebhookEventId });
      expect(pendingEdit).toBeNull();
    } finally {
      await prisma.$transaction([
        prisma.lineDailyActivity.deleteMany({ where: { userLineId } }),
        prisma.lineChatThread.deleteMany({ where: { lineUserId: userLineId } }),
        prisma.lineWebhookEvent.deleteMany({
          where: {
            webhookEventId: { in: [editWebhookEventId, unsendWebhookEventId, messageWebhookEventId] },
          },
        }),
        prisma.linePendingMessageEdit.deleteMany({ where: { lineMessageId } }),
        prisma.lineUnsentMessage.deleteMany({ where: { lineMessageId } }),
        prisma.lineUser.deleteMany({ where: { userLineId } }),
      ]);
    }
  }, 20_000);

  it("serializes concurrent original and unsend processing for one message", async () => {
    const suffix = randomUUID().replaceAll("-", "");
    const userLineId = `Uconcurrent${suffix}`;
    const lineMessageId = `message-concurrent-${suffix}`;
    const messageWebhookEventId = `event-concurrent-message-${suffix}`;
    const unsendWebhookEventId = `event-concurrent-unsend-${suffix}`;
    const timestamp = Date.now();
    const messageEvent = {
      type: "message",
      mode: "active",
      timestamp,
      webhookEventId: messageWebhookEventId,
      deliveryContext: { isRedelivery: false },
      source: { type: "user", userId: userLineId },
      replyToken: "concurrent-reply-token",
      message: {
        id: lineMessageId,
        type: "text",
        quoteToken: "concurrent-quote-token",
        text: "ข้อความที่ถูกถอนพร้อมกัน",
      },
    } as webhook.Event;
    const unsendEvent = {
      type: "unsend",
      mode: "active",
      timestamp: timestamp + 1_000,
      webhookEventId: unsendWebhookEventId,
      deliveryContext: { isRedelivery: false },
      source: { type: "user", userId: userLineId },
      unsend: { messageId: lineMessageId },
    } as webhook.Event;
    const prisma = getPrisma();

    try {
      await Promise.all([
        reserveLineWebhookEvent("Udestination", messageEvent),
        reserveLineWebhookEvent("Udestination", unsendEvent),
      ]);
      await Promise.all([processLineWebhookEvent(messageEvent), processLineWebhookEvent(unsendEvent)]);

      const [message, rawEvent, tombstone] = await Promise.all([
        prisma.lineMessage.findUnique({ where: { lineMessageId } }),
        prisma.lineWebhookEvent.findUnique({ where: { webhookEventId: messageWebhookEventId } }),
        prisma.lineUnsentMessage.findUnique({ where: { lineMessageId } }),
      ]);
      expect(message).toBeNull();
      expect(rawEvent?.eventData).toMatchObject({
        type: "redacted",
        messageId: lineMessageId,
        redactedByUnsendEventId: unsendWebhookEventId,
      });
      expect(tombstone).toMatchObject({ lineMessageId, unsendWebhookEventId });
    } finally {
      await prisma.$transaction([
        prisma.lineDailyActivity.deleteMany({ where: { userLineId } }),
        prisma.lineChatThread.deleteMany({ where: { lineUserId: userLineId } }),
        prisma.lineWebhookEvent.deleteMany({
          where: { webhookEventId: { in: [messageWebhookEventId, unsendWebhookEventId] } },
        }),
        prisma.linePendingMessageEdit.deleteMany({ where: { lineMessageId } }),
        prisma.lineUnsentMessage.deleteMany({ where: { lineMessageId } }),
        prisma.lineUser.deleteMany({ where: { userLineId } }),
      ]);
    }
  }, 20_000);

  it("applies only the latest edit when edits arrive before the original message", async () => {
    const suffix = randomUUID().replaceAll("-", "");
    const userLineId = `Uedit${suffix}`;
    const lineMessageId = `message-edit-first-${suffix}`;
    const messageWebhookEventId = `event-original-late-${suffix}`;
    const newestEditEventId = `event-newest-edit-${suffix}`;
    const staleEditEventId = `event-stale-edit-first-${suffix}`;
    const timestamp = Date.now();
    const originalEvent = {
      type: "message",
      mode: "active",
      timestamp,
      webhookEventId: messageWebhookEventId,
      deliveryContext: { isRedelivery: true },
      source: { type: "user", userId: userLineId },
      replyToken: "late-original-reply",
      message: { id: lineMessageId, type: "text", quoteToken: "late-original-quote", text: "ต้นฉบับ" },
    } as webhook.Event;
    const newestEditEvent = {
      ...originalEvent,
      type: "messageEdited",
      timestamp: timestamp + 2_000,
      webhookEventId: newestEditEventId,
      message: { id: lineMessageId, type: "text", text: "ฉบับแก้ไขล่าสุด" },
    } as webhook.Event;
    const staleEditEvent = {
      ...newestEditEvent,
      timestamp: timestamp + 1_000,
      webhookEventId: staleEditEventId,
      message: { id: lineMessageId, type: "text", text: "ฉบับแก้ไขเก่า" },
    } as webhook.Event;
    const prisma = getPrisma();

    try {
      for (const event of [newestEditEvent, staleEditEvent, originalEvent]) {
        await reserveLineWebhookEvent("Udestination", event);
        await processLineWebhookEvent(event);
      }

      const [message, thread, pendingEdit] = await Promise.all([
        prisma.lineMessage.findUnique({ where: { lineMessageId } }),
        prisma.lineChatThread.findUnique({ where: { threadKey: `user:${userLineId}` } }),
        prisma.linePendingMessageEdit.findUnique({ where: { lineMessageId } }),
      ]);
      expect(message).toMatchObject({ text: "ฉบับแก้ไขล่าสุด", contentUpdatedAt: BigInt(timestamp + 2_000) });
      expect(thread).toMatchObject({ lastMessageId: lineMessageId, lastMessageText: "ฉบับแก้ไขล่าสุด" });
      expect(pendingEdit).toBeNull();
    } finally {
      await prisma.$transaction([
        prisma.lineDailyActivity.deleteMany({ where: { userLineId } }),
        prisma.lineChatThread.deleteMany({ where: { lineUserId: userLineId } }),
        prisma.lineWebhookEvent.deleteMany({
          where: {
            webhookEventId: { in: [messageWebhookEventId, newestEditEventId, staleEditEventId] },
          },
        }),
        prisma.linePendingMessageEdit.deleteMany({ where: { lineMessageId } }),
        prisma.lineUser.deleteMany({ where: { userLineId } }),
      ]);
    }
  }, 20_000);
});
