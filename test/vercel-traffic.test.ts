import { describe, expect, it } from "vitest";
import { parseVercelDays, parseVercelPeriod, summarizeVercelDays } from "@/lib/analytics/vercel-data";
const query = { since: "2026-10-01T00:00:00.000Z", until: "2026-10-03T00:00:00.000Z" };
const daily = [
  { timestamp: "2026-10-01T00:00:00.000Z", visitors: 10, pageviews: 30 },
  { timestamp: "2026-10-02T00:00:00.000Z", visitors: 12, pageviews: 35 },
];
describe("Vercel historical aggregate integrity", () => {
  it("preserves UTC day buckets and valid zero traffic", () => {
    const rows = parseVercelDays(
      { query, data: [...daily, { timestamp: "2026-10-03T00:00:00.000Z", visitors: 0, pageviews: 0 }] },
      "2026-10-01",
      "2026-10-02",
    );
    expect(rows).toEqual([
      { day: "2026-10-01", visitors: 10, pageviews: 30 },
      { day: "2026-10-02", visitors: 12, pageviews: 35 },
    ]);
  });
  it("rejects errors, partial date bounds, duplicate days and invalid counts before import", () => {
    expect(() => parseVercelDays({ error: "unavailable" }, "2026-10-01", "2026-10-02")).toThrow();
    expect(() =>
      parseVercelDays(
        { query: { ...query, until: "2026-10-02T01:00:00Z" }, data: daily },
        "2026-10-01",
        "2026-10-02",
      ),
    ).toThrow();
    expect(() =>
      parseVercelDays({ query, data: [daily[0], daily[0]] }, "2026-10-01", "2026-10-02"),
    ).toThrow();
    expect(() =>
      parseVercelDays({ query, data: [{ ...daily[0], visitors: -1 }] }, "2026-10-01", "2026-10-02"),
    ).toThrow();
    expect(() =>
      parseVercelDays({ query: { ...query, since: "invalid" }, data: daily }, "2026-10-01", "2026-10-02"),
    ).toThrow();
  });
  it("accepts period-level uniques only from a full production aggregate", () => {
    const response = { query, data: [{ environment: "production", visitors: 15, pageviews: 65 }] };
    expect(parseVercelPeriod(response, "2026-10-01", "2026-10-02").visitors).toBe(15);
    expect(() =>
      parseVercelPeriod(
        { ...response, data: [{ environment: "preview", visitors: 15, pageviews: 65 }] },
        "2026-10-01",
        "2026-10-02",
      ),
    ).toThrow();
    expect(() =>
      parseVercelPeriod(
        { ...response, query: { ...query, until: "2026-10-02T01:00:00Z" } },
        "2026-10-01",
        "2026-10-02",
      ),
    ).toThrow();
  });
  it("never sums daily distinct users into a period total or treats missing days as zero", () => {
    const rows = parseVercelDays({ query, data: daily }, "2026-10-01", "2026-10-02");
    expect(summarizeVercelDays(rows, "2026-10-01", "2026-10-02", [])).toMatchObject({
      visitors: null,
      pageviews: 65,
    });
    expect(
      summarizeVercelDays(rows, "2026-10-01", "2026-10-31", [
        { start: "2026-10-01", end: "2026-10-02", visitors: 15, pageviews: 65 },
      ]),
    ).toMatchObject({ visitors: 15, pageviews: 65, last: "2026-10-02" });
    expect(summarizeVercelDays(rows, "2026-09-01", "2026-09-30", [])).toMatchObject({
      visitors: null,
      pageviews: 0,
      rows: [],
    });
  });
});
