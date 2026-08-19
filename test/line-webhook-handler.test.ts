import { createHmac } from "node:crypto";
import { describe, expect, it, vi } from "vitest";
import { createLineWebhookHandler } from "@/lib/line/create-line-webhook-handler";

const channelSecret = "test-channel-secret";

function sign(body: string) {
  return createHmac("sha256", channelSecret).update(body).digest("base64");
}

function createRequest(body: string, signature = sign(body)) {
  return new Request("https://example.com/api/line/webhook", {
    method: "POST",
    headers: { "x-line-signature": signature },
    body,
  });
}

describe("LINE webhook request boundary", () => {
  it("rejects a request whose LINE signature is invalid", async () => {
    const reserveEvent = vi.fn();
    const handler = createLineWebhookHandler({
      channelSecret,
      reserveEvent,
      processEvent: vi.fn(),
    });

    const response = await handler(createRequest('{"events":[]}', "invalid-signature"));

    expect(response.status).toBe(401);
    expect(reserveEvent).not.toHaveBeenCalled();
  });

  it("accepts LINE endpoint verification requests with no events", async () => {
    const handler = createLineWebhookHandler({
      channelSecret,
      reserveEvent: vi.fn(),
      processEvent: vi.fn(),
    });
    const body = JSON.stringify({ destination: "Udestination", events: [] });

    const response = await handler(createRequest(body));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ status: "ok", accepted: 0 });
  });

  it("processes only events that were newly reserved", async () => {
    const firstEvent = {
      type: "follow",
      timestamp: 1_728_000_000_000,
      webhookEventId: "event-new",
      deliveryContext: { isRedelivery: false },
      mode: "active",
      source: { type: "user", userId: "Unew" },
    };
    const duplicateEvent = { ...firstEvent, webhookEventId: "event-duplicate" };
    const reserveEvent = vi.fn().mockResolvedValueOnce("accepted").mockResolvedValueOnce("processed");
    const processEvent = vi.fn().mockResolvedValue(undefined);
    const handler = createLineWebhookHandler({
      channelSecret,
      reserveEvent,
      processEvent,
    });
    const body = JSON.stringify({ destination: "Udestination", events: [firstEvent, duplicateEvent] });

    const response = await handler(createRequest(body));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ status: "ok", accepted: 1 });
    expect(reserveEvent).toHaveBeenCalledTimes(2);
    expect(processEvent).toHaveBeenCalledTimes(1);
    expect(processEvent).toHaveBeenCalledWith(firstEvent);
  });

  it("processes accepted events in callback order even when one fails", async () => {
    const firstEvent = {
      type: "follow",
      timestamp: 1_728_000_000_000,
      webhookEventId: "event-first",
      deliveryContext: { isRedelivery: false },
      mode: "active",
      source: { type: "user", userId: "Ufirst" },
    };
    const secondEvent = { ...firstEvent, webhookEventId: "event-second" };
    const calls: string[] = [];
    const handler = createLineWebhookHandler({
      channelSecret,
      reserveEvent: vi.fn().mockResolvedValue("accepted"),
      processEvent: vi.fn(async (event) => {
        calls.push(event.webhookEventId);
        if (event.webhookEventId === "event-first") throw new Error("first event failed");
      }),
    });
    const body = JSON.stringify({ destination: "Udestination", events: [firstEvent, secondEvent] });

    const response = await handler(createRequest(body));

    expect(response.status).toBe(500);
    expect(calls).toEqual(["event-first", "event-second"]);
  });

  it("asks LINE to retry while a duplicate event is still pending", async () => {
    const pendingEvent = {
      type: "follow",
      timestamp: 1_728_000_000_000,
      webhookEventId: "event-pending",
      deliveryContext: { isRedelivery: true },
      mode: "active",
      source: { type: "user", userId: "Upending" },
    };
    const processEvent = vi.fn();
    const handler = createLineWebhookHandler({
      channelSecret,
      reserveEvent: vi.fn().mockResolvedValue("pending"),
      processEvent,
    });
    const body = JSON.stringify({ destination: "Udestination", events: [pendingEvent] });

    const response = await handler(createRequest(body));

    expect(response.status).toBe(503);
    expect(processEvent).not.toHaveBeenCalled();
  });

  it("rejects malformed JSON without attempting persistence", async () => {
    const reserveEvent = vi.fn();
    const body = "not-json";
    const handler = createLineWebhookHandler({
      channelSecret,
      reserveEvent,
      processEvent: vi.fn(),
    });

    const response = await handler(createRequest(body));

    expect(response.status).toBe(400);
    expect(reserveEvent).not.toHaveBeenCalled();
  });
});
