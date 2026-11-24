/** Step-by-step log of what staff do on the price page (kept per browser tab "session"). */
export const activityKinds = [
  "customer", // chose new / existing customer
  "model", // opened a product
  "add", // added one unit
  "remove", // removed one unit
  "contract", // switched a cart card to another contract
  "cart", // opened the order total
  "schedule", // opened one unit's schedule
  "promo", // switched item promo / combo
  "clear", // emptied the order (detail keeps what was in it)
] as const;
export type ActivityKind = (typeof activityKinds)[number];
export type ActivityEvent = { kind: ActivityKind; detail?: Record<string, unknown>; at: number };

const maxEvents = 40;
const maxDetail = 2000;
const maxAge = 30 * 60 * 1000;

/** Validated events from a client batch; anything malformed is dropped, times clamped to the last 30 min. */
export function parseActivity(
  body: unknown,
  now = Date.now(),
): { session: string; events: ActivityEvent[] } | null {
  if (!body || typeof body !== "object") return null;
  const { session, events } = body as { session?: unknown; events?: unknown };
  if (typeof session !== "string" || !/^[a-zA-Z0-9-]{8,40}$/.test(session) || !Array.isArray(events))
    return null;
  const parsed: ActivityEvent[] = [];
  for (const raw of events.slice(0, maxEvents)) {
    if (!raw || typeof raw !== "object") continue;
    const { kind, detail, at } = raw as { kind?: unknown; detail?: unknown; at?: unknown };
    if (!activityKinds.includes(kind as ActivityKind)) continue;
    if (detail !== undefined && (typeof detail !== "object" || detail === null || Array.isArray(detail)))
      continue;
    if (detail !== undefined && JSON.stringify(detail).length > maxDetail) continue;
    const time =
      typeof at === "number" && Number.isFinite(at) ? Math.min(now, Math.max(now - maxAge, at)) : now;
    parsed.push({
      kind: kind as ActivityKind,
      detail: detail as Record<string, unknown> | undefined,
      at: time,
    });
  }
  return { session, events: parsed };
}
