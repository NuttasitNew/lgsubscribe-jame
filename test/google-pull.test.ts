// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { pullGoogleReports, resolvePullRange } from "@/lib/analytics/google-pull";

const saved = vi.hoisted(() => [] as Array<{ provider: string; day: string; rows: unknown[] }>);
vi.mock("@/lib/analytics/google-sync", async (original) => ({
  ...(await original<typeof import("@/lib/analytics/google-sync")>()),
  saveGoogleSnapshot: async (snapshot: (typeof saved)[number]) => (saved.push(snapshot), true),
}));

beforeEach(() => {
  saved.length = 0;
  vi.stubEnv("GOOGLE_ADS_CUSTOMER_ID", "7588597274");
  vi.stubEnv("GA4_PROPERTY_ID", "553934775");
  vi.stubEnv("GOOGLE_OAUTH_CLIENT_ID", "id");
  vi.stubEnv("GOOGLE_OAUTH_CLIENT_SECRET", "secret");
  vi.stubEnv("GOOGLE_OAUTH_REFRESH_TOKEN", "refresh");
  vi.stubEnv("GOOGLE_ADS_DEVELOPER_TOKEN", "dev");
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("resolvePullRange", () => {
  const now = new Date("2026-10-12T20:00:00Z"); // 03:00 on 13 Oct in Bangkok
  it("defaults to the last 7 completed Bangkok days", () => {
    expect(resolvePullRange(null, null, now)).toEqual({ start: "2026-10-06", end: "2026-10-12" });
  });
  it("accepts a backfill range but never the unfinished day", () => {
    expect(resolvePullRange("2026-10-04", "2026-10-12", now)).toEqual({
      start: "2026-10-04",
      end: "2026-10-12",
    });
    expect(() => resolvePullRange("2026-10-04", "2026-10-13", now)).toThrow();
  });
});

describe("pullGoogleReports", () => {
  it("saves a snapshot per day for both providers and zero-fills empty days", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string, init: { body: string | URLSearchParams }) => {
        const json = (data: unknown) => new Response(JSON.stringify(data));
        if (url.includes("oauth2")) return json({ access_token: "t" });
        if (url.includes("googleAds:search")) {
          const query = JSON.parse(init.body as string).query as string;
          if (query.includes("FROM customer"))
            return json({ results: [{ customer: { timeZone: "Asia/Bangkok", currencyCode: "THB" } }] });
          return json({
            results: [
              {
                segments: { date: "2026-10-04" },
                campaign: { id: "9", name: "A" },
                metrics: {
                  impressions: "253",
                  clicks: "28",
                  costMicros: "455840000",
                  conversions: 0,
                  allConversions: 8,
                },
              },
            ],
          });
        }
        const body = JSON.parse(init.body as string);
        const meta = { timeZone: "Asia/Bangkok", currencyCode: "THB" };
        if (body.dimensions.length === 1)
          return json({
            metadata: meta,
            rowCount: 1,
            rows: [
              {
                dimensionValues: [{ value: "20261004" }],
                metricValues: [{ value: "5" }, { value: "6" }, { value: "7" }],
              },
            ],
          });
        if (body.dimensionFilter)
          return json({
            metadata: meta,
            rowCount: 1,
            rows: [
              {
                dimensionValues: [{ value: "20261004" }, { value: "google / cpc" }],
                metricValues: [{ value: "2" }],
              },
            ],
          });
        return json({
          metadata: meta,
          rowCount: 1,
          rows: [
            {
              dimensionValues: [{ value: "20261004" }, { value: "google / cpc" }],
              metricValues: [{ value: "5" }, { value: "6" }, { value: "7" }],
            },
          ],
        });
      }),
    );
    const results = await pullGoogleReports("2026-10-04", "2026-10-05");
    expect(results).toEqual([
      { provider: "google_ads", days: 2, saved: 2 },
      { provider: "ga4", days: 2, saved: 2 },
    ]);
    const ads = saved.find((s) => s.provider === "google_ads" && s.day === "2026-10-04")!;
    expect(ads.rows).toEqual([
      {
        segment: "9",
        label: "A",
        impressions: 253,
        clicks: 28,
        costMicros: 455840000,
        conversions: 0,
        allConversions: 8,
      },
    ]);
    expect(saved.find((s) => s.provider === "google_ads" && s.day === "2026-10-05")!.rows).toEqual([]);
    const ga = saved.find((s) => s.provider === "ga4" && s.day === "2026-10-04")!.rows as Array<{
      segment: string;
      contactClicks: number;
    }>;
    expect(ga.find((r) => r.segment === "__total__")!.contactClicks).toBe(2);
  });

  it("reports a provider failure without blocking the other", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string) =>
        url.includes("oauth2")
          ? new Response(JSON.stringify({ access_token: "t" }))
          : new Response("{}", { status: url.includes("googleads") ? 403 : 500 }),
      ),
    );
    const results = await pullGoogleReports("2026-10-04", "2026-10-04");
    expect(results.every((r) => "error" in r)).toBe(true);
    expect(saved).toHaveLength(0);
  });
});
