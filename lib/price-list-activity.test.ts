import { describe, expect, it } from "vitest";
import { finalItems, parseActivity, splitRounds } from "./price-list-activity";

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

describe("price list activity rounds", () => {
  const at = (min: number) => new Date(now + min * 60 * 1000);
  const e = (session: string, min: number, kind: string, detail?: object) => ({
    session,
    kind,
    detail,
    createdAt: at(min),
  });
  it("splits a tab into rounds at ล้างทั้งหมด and at long pauses, newest first", () => {
    const rounds = splitRounds([
      e("a", 0, "customer"),
      e("a", 3, "add"),
      e("a", 4, "reset"),
      e("a", 5, "customer"),
      e("a", 30, "add"),
      e("b", 1, "add"),
    ]);
    expect(rounds.map((r) => r.map((x) => `${x.session}${x.kind}`))).toEqual([
      ["aadd"],
      ["acustomer"],
      ["acustomer", "aadd", "areset"],
      ["badd"],
    ]);
  });
  it("replays the order a round ended with, following contract switches and clears", () => {
    expect(
      finalItems([
        { kind: "add", detail: { model: "OLD", contract: "5 ปี" } },
        { kind: "clear", detail: {} },
        { kind: "add", detail: { model: "TV", contract: "5 ปี" } },
        { kind: "add", detail: { model: "TV", contract: "5 ปี" } },
        { kind: "add", detail: { model: "AIR", contract: "7 ปี" } },
        { kind: "remove", detail: { model: "AIR", contract: "7 ปี" } },
        { kind: "contract", detail: { model: "TV", from: "5 ปี", contract: "7 ปี" } },
      ]),
    ).toEqual([{ model: "TV", contract: "7 ปี", units: 2 }]);
  });
  it("trusts the snapshot in ดูยอดรวม / ล้างทั้งหมด over earlier steps", () => {
    expect(
      finalItems([
        { kind: "add", detail: { model: "TV", contract: "5 ปี" } },
        { kind: "reset", detail: { items: [{ model: "AIR", contract: "7 ปี", units: 3 }] } },
      ]),
    ).toEqual([{ model: "AIR", contract: "7 ปี", units: 3 }]);
    expect(
      finalItems([
        { kind: "add", detail: { model: "TV" } },
        { kind: "reset", detail: { items: [] } },
      ]),
    ).toEqual([]);
  });
});
