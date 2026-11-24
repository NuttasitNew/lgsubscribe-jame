import { describe, expect, it } from "vitest";
import { parseActivity } from "./price-list-activity";

const now = 1_800_000_000_000;

describe("price list activity batches", () => {
  it("keeps valid events and clamps their time", () => {
    const batch = parseActivity(
      {
        session: "abcd1234-ef",
        events: [
          { kind: "customer", detail: { customer: "new" }, at: now - 1000 },
          { kind: "add", detail: { model: "X" }, at: now + 99999 },
          { kind: "clear", at: now - 99 * 60 * 1000 },
        ],
      },
      now,
    );
    expect(batch?.events.map((e) => [e.kind, e.at])).toEqual([
      ["customer", now - 1000],
      ["add", now],
      ["clear", now - 30 * 60 * 1000],
    ]);
  });
  it("drops unknown kinds, bad details and oversized batches", () => {
    const events = [
      { kind: "hack" },
      { kind: "add", detail: ["x"] },
      { kind: "add", detail: { big: "x".repeat(3000) } },
      ...Array.from({ length: 60 }, () => ({ kind: "model" })),
    ];
    expect(parseActivity({ session: "abcd1234", events }, now)?.events).toHaveLength(37);
    expect(parseActivity({ session: "bad id!", events: [] }, now)).toBeNull();
    expect(parseActivity(null, now)).toBeNull();
  });
});
