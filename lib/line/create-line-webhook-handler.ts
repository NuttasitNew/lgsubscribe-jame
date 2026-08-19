import { validateSignature, type webhook } from "@line/bot-sdk";

export type ReserveLineWebhookEvent = (
  destination: string,
  event: webhook.Event,
) => Promise<"accepted" | "processed" | "pending">;

export type ProcessLineWebhookEvent = (event: webhook.Event) => Promise<void>;

export type LineWebhookHandlerDependencies = {
  channelSecret: string;
  reserveEvent: ReserveLineWebhookEvent;
  processEvent: ProcessLineWebhookEvent;
};

async function processAcceptedEvents(events: webhook.Event[], processEvent: ProcessLineWebhookEvent) {
  let failed = 0;

  for (const event of events) {
    try {
      await processEvent(event);
    } catch (error) {
      failed += 1;
      console.error("LINE webhook event processing failed", {
        webhookEventId: event.webhookEventId,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  return failed;
}

/**
 * Creates the public LINE webhook request boundary.
 *
 * The raw body is authenticated before JSON parsing. Each event is persisted
 * before the endpoint responds, while heavier profile/message processing runs
 * in the request's background lifetime.
 */
export function createLineWebhookHandler({
  channelSecret,
  reserveEvent,
  processEvent,
}: LineWebhookHandlerDependencies) {
  return async function handleLineWebhookRequest(request: Request) {
    if (!channelSecret) {
      return Response.json({ error: "LINE webhook is not configured" }, { status: 500 });
    }

    const rawBody = await request.text();
    const signature = request.headers.get("x-line-signature");

    if (!signature || !validateSignature(rawBody, channelSecret, signature)) {
      return Response.json({ error: "Invalid LINE signature" }, { status: 401 });
    }

    let callback: webhook.CallbackRequest;

    try {
      callback = JSON.parse(rawBody) as webhook.CallbackRequest;
    } catch {
      return Response.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    if (typeof callback.destination !== "string" || !Array.isArray(callback.events)) {
      return Response.json({ error: "Invalid LINE webhook payload" }, { status: 400 });
    }

    const reservations = await Promise.all(
      callback.events.map(async (event) => ({
        event,
        state: await reserveEvent(callback.destination, event),
      })),
    );
    const acceptedEvents = reservations.filter(({ state }) => state === "accepted").map(({ event }) => event);
    const unresolvedEvents = reservations.filter(({ state }) => state === "pending").length;

    if (acceptedEvents.length > 0) {
      // Process before acknowledging LINE. Returning a non-2xx response on any
      // failure lets LINE redeliver the callback; already processed events are
      // skipped by the durable reservation record.
      const failed = await processAcceptedEvents(acceptedEvents, processEvent);

      if (failed > 0) {
        return Response.json({ error: "LINE event processing failed", failed }, { status: 500 });
      }
    }

    if (unresolvedEvents > 0) {
      return Response.json(
        { error: "LINE events are still processing", pending: unresolvedEvents },
        { status: 503 },
      );
    }

    return Response.json({ status: "ok", accepted: acceptedEvents.length });
  };
}
