import { createLineWebhookHandler } from "@/lib/line/create-line-webhook-handler";
import { processLineWebhookEvent } from "@/lib/line/process-line-webhook-event";
import { reserveLineWebhookEvent } from "@/lib/line/reserve-line-webhook-event";

export const runtime = "nodejs";
export const maxDuration = 300;

/** Receives authenticated events from the LINE Messaging API. */
export async function POST(request: Request) {
  const handler = createLineWebhookHandler({
    channelSecret: process.env.LINE_CHANNEL_SECRET ?? "",
    reserveEvent: reserveLineWebhookEvent,
    processEvent: processLineWebhookEvent,
  });

  return handler(request);
}
