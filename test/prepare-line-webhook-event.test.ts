import { describe, expect, it, vi } from "vitest";
import { prepareLineWebhookEvent } from "@/lib/line/prepare-line-webhook-event";

const baseEvent = {
  timestamp: 1_728_000_000_000,
  mode: "active",
  deliveryContext: { isRedelivery: false },
  source: { type: "user", userId: "U123" },
} as const;

describe("LINE webhook event preparation", () => {
  it("hydrates a followed LINE user from the Messaging API profile", async () => {
    const getProfile = vi.fn().mockResolvedValue({
      userId: "U123",
      displayName: "คุณเจมส์",
      pictureUrl: "https://example.com/profile.jpg",
      statusMessage: "สนใจ LG Subscribe",
      language: "th",
    });

    const prepared = await prepareLineWebhookEvent(
      { ...baseEvent, type: "follow", webhookEventId: "event-follow" } as never,
      getProfile,
    );

    expect(prepared.lineUser).toMatchObject({
      userLineId: "U123",
      displayName: "คุณเจมส์",
      isFollowing: true,
    });
    expect(prepared.activity).toMatchObject({ userLineId: "U123", eventType: "follow" });
  });

  it("preserves the complete LINE message while exposing searchable fields", async () => {
    const message = {
      id: "message-1",
      type: "text",
      quoteToken: "quote-token",
      text: "สนใจเครื่องซักผ้า รุ่นไหนดีครับ",
      mention: { mentionees: [{ type: "user", userId: "U999", index: 0, length: 4 }] },
    } as const;
    const getProfile = vi.fn().mockResolvedValue({ userId: "U123", displayName: "ลูกค้าใหม่" });

    const prepared = await prepareLineWebhookEvent(
      {
        ...baseEvent,
        type: "message",
        webhookEventId: "event-message",
        replyToken: "reply-token",
        message,
      } as never,
      getProfile,
    );

    expect(prepared.message).toMatchObject({
      lineMessageId: "message-1",
      webhookEventId: "event-message",
      messageType: "text",
      text: "สนใจเครื่องซักผ้า รุ่นไหนดีครับ",
      messageData: message,
    });
    expect(prepared.thread).toMatchObject({
      threadKey: "user:U123",
      lastMessageText: "สนใจเครื่องซักผ้า รุ่นไหนดีครับ",
    });
  });

  it("marks an unfollowed user without requiring a profile request", async () => {
    const getProfile = vi.fn();

    const prepared = await prepareLineWebhookEvent(
      { ...baseEvent, type: "unfollow", webhookEventId: "event-unfollow" } as never,
      getProfile,
    );

    expect(prepared.lineUser).toMatchObject({ userLineId: "U123", isFollowing: false });
    expect(getProfile).not.toHaveBeenCalled();
  });

  it("identifies the original message that an unsend event must redact", async () => {
    const prepared = await prepareLineWebhookEvent(
      {
        ...baseEvent,
        type: "unsend",
        webhookEventId: "event-unsend",
        unsend: { messageId: "message-secret" },
      } as never,
      vi.fn().mockResolvedValue({ userId: "U123", displayName: "ลูกค้า" }),
    );

    expect(prepared.unsentMessageId).toBe("message-secret");
    expect(prepared.message).toBeNull();
  });

  it("normalizes an edited message without counting it as a new message", async () => {
    const message = { id: "message-1", type: "text", text: "ข้อความหลังแก้ไข" } as const;
    const prepared = await prepareLineWebhookEvent(
      {
        ...baseEvent,
        type: "messageEdited",
        webhookEventId: "event-edited",
        message,
      } as never,
      vi.fn().mockResolvedValue({ userId: "U123", displayName: "ลูกค้า" }),
    );

    expect(prepared.editedMessage).toMatchObject({
      lineMessageId: "message-1",
      text: "ข้อความหลังแก้ไข",
      messageData: message,
    });
    expect(prepared.activity?.messageIncrement).toBe(0);
  });
});
