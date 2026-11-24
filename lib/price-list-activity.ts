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
  "reset", // "ล้างทั้งหมด": ends this customer's round (detail keeps customer + order)
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

/** Steps further apart than this belong to a new customer round. */
export const roundGap = 10 * 60 * 1000;

type Logged = { session: string; kind: string; detail: unknown; createdAt: Date };

/**
 * Split one browser tab's steps into customer rounds: a "reset" closes the round, and a pause
 * longer than roundGap starts a new one (staff pick quickly; a long gap is usually a new customer).
 */
export function splitRounds<T extends Logged>(events: T[], gap = roundGap): T[][] {
  const rounds: T[][] = [];
  for (const list of Map.groupBy(events, (e) => e.session).values()) {
    let current: T[] = [];
    for (const e of list.toSorted((a, b) => a.createdAt.getTime() - b.createdAt.getTime())) {
      const last = current.at(-1);
      if (last && (last.kind === "reset" || e.createdAt.getTime() - last.createdAt.getTime() > gap)) {
        rounds.push(current);
        current = [];
      }
      current.push(e);
    }
    if (current.length) rounds.push(current);
  }
  return rounds.sort((a, b) => b.at(-1)!.createdAt.getTime() - a.at(-1)!.createdAt.getTime());
}

/**
 * What was in the order at the end of a round (before any "ล้างทั้งหมด"), replayed from its steps.
 * "cart" and "reset" carry a full snapshot, which wins (a page refresh empties the order unlogged).
 */
export function finalItems(events: Pick<Logged, "kind" | "detail">[]) {
  const units = new Map<string, { model: string; contract: string; units: number }>();
  const key = (model: unknown, contract: unknown) => `${model}|${contract}`;
  const bump = (model: unknown, contract: unknown, by: number) => {
    if (typeof model !== "string") return;
    const k = key(model, contract);
    const next = (units.get(k)?.units ?? 0) + by;
    if (next > 0) units.set(k, { model, contract: String(contract ?? "-"), units: next });
    else units.delete(k);
  };
  for (const { kind, detail } of events) {
    const d = (detail && typeof detail === "object" ? detail : {}) as Record<string, unknown>;
    if (kind === "add") bump(d.model, d.contract, 1);
    else if (kind === "remove") bump(d.model, d.contract, -1);
    else if (kind === "clear") units.clear();
    else if ((kind === "cart" || kind === "reset") && Array.isArray(d.items)) {
      units.clear();
      for (const i of d.items as Record<string, unknown>[])
        bump(i?.model, i?.contract, Number(i?.units) || 0);
    } else if (kind === "contract") {
      const moved = units.get(key(d.model, d.from))?.units ?? 0;
      bump(d.model, d.from, -moved);
      bump(d.model, d.contract, moved);
    }
  }
  return [...units.values()];
}
