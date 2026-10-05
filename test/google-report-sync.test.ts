// @vitest-environment node
import { createHmac } from "node:crypto";
import { runInNewContext } from "node:vm";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  buildGoogleReportScript,
  buildGa4ReportScript,
  ga4Manifest,
} from "@/lib/analytics/google-ads-script";
import { parseGoogleSnapshot, validSyncSignature } from "@/lib/analytics/google-sync";

const config = {
  secret: "s".repeat(64),
  customerId: "7588597274",
  propertyId: "553934775",
  endpoint: "https://site.test/api/analytics/google-sync/",
};
beforeEach(() => {
  vi.stubEnv("GOOGLE_REPORT_SYNC_SECRET", config.secret);
  vi.stubEnv("GOOGLE_ADS_CUSTOMER_ID", config.customerId);
  vi.stubEnv("GA4_PROPERTY_ID", config.propertyId);
});
afterEach(() => vi.unstubAllEnvs());
function snapshot() {
  return {
    provider: "ga4",
    externalId: config.propertyId,
    day: "2026-10-04",
    timeZone: "Asia/Bangkok",
    currency: "THB",
    asOf: new Date().toISOString(),
    rows: [
      { segment: "__total__", label: "Daily total", visitors: 10, sessions: 20, views: 30, contactClicks: 3 },
    ],
  };
}

describe("Google snapshot boundary", () => {
  it("requests read-only Analytics access and external reporting transport", () => {
    expect(ga4Manifest.oauthScopes).toEqual([
      "https://www.googleapis.com/auth/analytics.readonly",
      "https://www.googleapis.com/auth/script.external_request",
    ]);
    expect(ga4Manifest.dependencies.enabledAdvancedServices[0]).toEqual({
      userSymbol: "AnalyticsData",
      version: "v1beta",
      serviceId: "analyticsdata",
    });
  });
  it("requires a signed recent body and detects tampering", () => {
    const timestamp = String(Date.now()),
      body = JSON.stringify(snapshot());
    const signature = createHmac("sha256", config.secret).update(`${timestamp}.${body}`).digest("hex");
    expect(validSyncSignature(body, timestamp, signature)).toBe(true);
    expect(validSyncSignature(body + "x", timestamp, signature)).toBe(false);
    expect(validSyncSignature(body, timestamp, signature, Number(timestamp) + 300001)).toBe(false);
    expect(validSyncSignature(body, timestamp, null)).toBe(false);
  });
  it("rejects wrong accounts, impossible dates, wrong timezones and malformed metrics", () => {
    expect(parseGoogleSnapshot(snapshot()).rows[0].visitors).toBe(10);
    for (const patch of [
      { externalId: "123456789" },
      { day: "2026-02-30" },
      { timeZone: "America/New_York" },
      { currency: "USD" },
      { rows: [] },
      { rows: [{ ...snapshot().rows[0], sessions: -1 }] },
      { rows: [snapshot().rows[0], snapshot().rows[0]] },
    ])
      expect(() => parseGoogleSnapshot({ ...snapshot(), ...patch })).toThrow();
  });
});

describe("Google Ads report exporter", () => {
  function sandbox(options: { wrongAccount?: boolean; failAnalytics?: boolean } = {}) {
    const uploads: Array<{ payload: string; headers: Record<string, string> }> = [];
    const requests: unknown[] = [];
    let used = false;
    const context = {
      AdsApp: {
        currentAccount: () => ({
          getCustomerId: () => (options.wrongAccount ? "111-111-1111" : "758-859-7274"),
          getTimeZone: () => "Asia/Bangkok",
          getCurrencyCode: () => "THB",
        }),
        search: (query: string) => {
          requests.push(query);
          return {
            hasNext: () => !used,
            next: () => {
              used = true;
              return {
                segments: { date: "2026-10-04" },
                campaign: { id: "123", name: "Campaign 1" },
                metrics: {
                  impressions: 100,
                  clicks: 10,
                  costMicros: 1500000,
                  conversions: 0,
                  allConversions: 2,
                },
              };
            },
          };
        },
      },
      AnalyticsData: {
        Properties: {
          runReport: (request: { dimensions: Array<{ name: string }>; dimensionFilter?: unknown }) => {
            if (options.failAnalytics) throw new Error("No Analytics permission");
            requests.push(request);
            const dimensions =
              request.dimensions.length === 1
                ? [{ value: "20261004" }]
                : [{ value: "20261004" }, { value: "google / cpc" }];
            const metrics = request.dimensionFilter
              ? [{ value: "3" }]
              : [{ value: "10" }, { value: "20" }, { value: "30" }];
            return {
              metadata: { timeZone: "Asia/Bangkok", currencyCode: "THB" },
              rowCount: 1,
              rows: [{ dimensionValues: dimensions, metricValues: metrics }],
            };
          },
        },
      },
      Utilities: {
        formatDate: () => "2026-10-05",
        Charset: { UTF_8: "UTF-8" },
        computeHmacSha256Signature: (value: string, secret: string) =>
          Array.from(createHmac("sha256", secret).update(value).digest()),
      },
      UrlFetchApp: {
        fetch: (_url: string, options: { payload: string; headers: Record<string, string> }) => {
          uploads.push(options);
          return { getResponseCode: () => 200 };
        },
      },
      Logger: { log: () => {} },
    };
    return { context, uploads, requests };
  }
  it("exports separate Ads and GA4 daily snapshots, signs payloads and preserves contact counts", () => {
    const test = sandbox();
    runInNewContext(buildGoogleReportScript(config) + "\nmain();", test.context);
    runInNewContext(buildGa4ReportScript(config) + "\nmain();", { ...test.context });
    expect(test.uploads).toHaveLength(70);
    for (const upload of test.uploads) {
      expect(
        validSyncSignature(
          upload.payload,
          upload.headers["x-sync-timestamp"],
          upload.headers["x-sync-signature"],
        ),
      ).toBe(true);
      expect(() => parseGoogleSnapshot(JSON.parse(upload.payload))).not.toThrow();
    }
    const values = test.uploads.map((item) => JSON.parse(item.payload));
    expect(
      values.find((item) => item.provider === "google_ads" && item.day === "2026-10-04").rows[0],
    ).toMatchObject({ costMicros: 1500000, conversions: 0, allConversions: 2 });
    expect(values.find((item) => item.provider === "ga4" && item.day === "2026-10-04").rows[0]).toMatchObject(
      { visitors: 10, contactClicks: 3 },
    );
    expect(test.requests[0]).toContain("FROM campaign");
  });
  it("does not upload false zeros on permission failure or export the wrong account", () => {
    for (const options of [{ wrongAccount: true }, { failAnalytics: true }]) {
      const test = sandbox(options);
      expect(() =>
        runInNewContext(
          (options.wrongAccount ? buildGoogleReportScript(config) : buildGa4ReportScript(config)) +
            "\nmain();",
          test.context,
        ),
      ).toThrow();
      expect(test.uploads).toHaveLength(0);
    }
  });
  it("exports only the explicitly selected historical window for both sources", () => {
    for (const build of [buildGoogleReportScript, buildGa4ReportScript]) {
      const test = sandbox();
      runInNewContext(
        build({ ...config, historyRange: { start: "2026-10-04", end: "2026-10-04" } }) + "\nmain();",
        test.context,
      );
      expect(test.uploads).toHaveLength(1);
      expect(JSON.parse(test.uploads[0].payload).day).toBe("2026-10-04");
    }
  });
});
