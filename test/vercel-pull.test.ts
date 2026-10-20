// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { pullVercelTraffic, resolveVercelRange, vercelPeriodBounds } from "@/lib/analytics/vercel-pull";

const writes = vi.hoisted(() => [] as unknown[]);
vi.mock("@/lib/db/prisma", () => ({
  getPrisma: () => ({
    $transaction: async (run: (tx: unknown) => Promise<void>) =>
      run({ $executeRaw: async (...args: unknown[]) => (writes.push(args), 1) }),
  }),
}));

beforeEach(() => {
  writes.length = 0;
  vi.stubEnv("VERCEL_ANALYTICS_TOKEN", "token");
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("resolveVercelRange", () => {
  const now = new Date("2026-10-20T00:30:00Z");
  it("defaults to the month containing yesterday-29 through yesterday UTC", () => {
    expect(resolveVercelRange(null, null, now)).toEqual({ start: "2026-09-01", end: "2026-10-19" });
  });
  it("rejects unfinished days and ranges over 62 days", () => {
    expect(() => resolveVercelRange("2026-10-01", "2026-10-20", now)).toThrow();
    expect(() => resolveVercelRange("2026-08-09", "2026-10-19", now)).toThrow();
  });
});

describe("vercelPeriodBounds", () => {
  it("covers the whole range, each month, the last day and last 7/30 days", () => {
    expect(vercelPeriodBounds("2026-09-01", "2026-10-19")).toEqual([
      { from: "2026-09-01", until: "2026-10-19" },
      { from: "2026-09-01", until: "2026-09-30" },
      { from: "2026-10-01", until: "2026-10-19" },
      { from: "2026-10-19", until: "2026-10-19" },
      { from: "2026-10-13", until: "2026-10-19" },
      { from: "2026-09-20", until: "2026-10-19" },
    ]);
  });
});

describe("pullVercelTraffic", () => {
  it("queries with the token and saves days plus periods", async () => {
    const fetchMock = vi.fn(async (...[url]: [string, RequestInit?]) => {
      const params = new URL(url).searchParams;
      const since = params.get("since")!;
      const until = params.get("until")!;
      const query = { since, until: new Date(Date.parse(until) + 1).toISOString() };
      const data =
        params.get("by") === "day"
          ? [
              { timestamp: "2026-10-18T00:00:00Z", visitors: 10, pageviews: 40 },
              { timestamp: "2026-10-19T00:00:00Z", visitors: 12, pageviews: 50 },
            ]
          : [{ environment: "production", visitors: 20, pageviews: 90 }];
      return new Response(JSON.stringify({ data, query }));
    });
    vi.stubGlobal("fetch", fetchMock);
    await expect(pullVercelTraffic("2026-10-18", "2026-10-19")).resolves.toEqual({ days: 2, periods: 2 });
    expect(fetchMock.mock.calls[0][1]).toMatchObject({ headers: { authorization: "Bearer token" } });
    expect(writes).toHaveLength(4);
  });

  it("writes nothing when the API fails", async () => {
    vi.stubGlobal("fetch", async () => new Response("{}", { status: 403 }));
    await expect(pullVercelTraffic("2026-10-18", "2026-10-19")).rejects.toThrow("HTTP 403");
    expect(writes).toHaveLength(0);
  });
});
