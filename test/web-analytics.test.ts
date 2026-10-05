import { afterEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { bangkokToday, dailyRows, dateRange, monthRange } from "@/lib/analytics/date-range";

const createMany = vi.hoisted(() => vi.fn().mockResolvedValue({ count: 1 }));
vi.mock("@/lib/db/prisma", () => ({ getPrisma: () => ({ webPageView: { createMany } }) }));
import { POST, DELETE } from "@/app/api/analytics/pageview/route";

const eventId = "019fb287-1234-4aaa-8aaa-123456789abc";
function request(data: unknown, options: { origin?: string; cookie?: string; userAgent?: string } = {}) {
  return new NextRequest("https://site.test/api/analytics/pageview/", {
    method: "POST",
    headers: {
      origin: options.origin ?? "https://site.test",
      "content-type": "application/json",
      ...(options.cookie ? { cookie: options.cookie } : {}),
      "user-agent": options.userAgent ?? "Browser",
    },
    body: JSON.stringify(data && typeof data === "object" ? { consent: "all", ...data } : data),
  });
}
afterEach(() => {
  vi.unstubAllEnvs();
  vi.clearAllMocks();
});

describe("Bangkok traffic reporting dates", () => {
  it("includes the entire end day with exclusive next midnight in UTC", () => {
    const range = dateRange("2026-10-01", "2026-10-31");
    expect(range.from.toISOString()).toBe("2026-09-30T17:00:00.000Z");
    expect(range.until.toISOString()).toBe("2026-10-31T17:00:00.000Z");
    expect(range.days).toBe(31);
    expect(bangkokToday(new Date("2026-10-04T17:01:00Z"))).toBe("2026-10-05");
  });
  it("validates leap years, reversed dates and range limits", () => {
    expect(monthRange("2024-02").end).toBe("2024-02-29");
    expect(monthRange("2026-02").end).toBe("2026-02-28");
    for (const [start, end] of [
      ["2026-02-30", "2026-03-01"],
      ["2026-10-02", "2026-10-01"],
      ["2025-01-01", "2026-10-01"],
      ["", "2026-10-01"],
    ])
      expect(() => dateRange(start, end)).toThrow();
    expect(() => monthRange("2026-13")).toThrow();
  });
  it("fills missing days without losing measured rows", () => {
    expect(dailyRows("2026-10-01", 3, [{ day: "2026-10-02", visitors: 2, views: 3 }])).toEqual([
      { day: "2026-10-01", visitors: 0, views: 0 },
      { day: "2026-10-02", visitors: 2, views: 3 },
      { day: "2026-10-03", visitors: 0, views: 0 },
    ]);
  });
});

describe("pageview ingestion", () => {
  function enable() {
    vi.stubEnv("WEB_ANALYTICS_ENABLED", "true");
    vi.stubEnv("WEB_ANALYTICS_SECRET", "a".repeat(64));
  }
  it("rejects collection without consent and removes tracking cookies on withdrawal", async () => {
    enable();
    expect((await POST(request({ eventId, path: "/", consent: "necessary" }))).status).toBe(400);
    expect(createMany).not.toHaveBeenCalled();
    const response = await DELETE(request({}));
    expect(response.headers.get("set-cookie")).toContain("lg_web_visitor=;");
    expect(response.headers.get("set-cookie")).toContain("lg_web_session=;");
    expect(response.headers.get("set-cookie")).toContain("Max-Age=0");
  });
  it("records source and contact events without persisting raw advertising IDs under analytics-only consent", async () => {
    enable();
    const attribution = {
      source: "google",
      medium: "cpc",
      attributionMethod: "click_id",
      clickId: "sample-ad-click",
      campaign: "october",
      referrerHost: "google.com",
    };
    const response = await POST(
      request({
        eventId,
        path: "/contact/",
        consent: "analytics",
        eventType: "contact_click",
        contactMethod: "line",
        attribution,
      }),
    );
    expect(response.status).toBe(204);
    expect(createMany.mock.calls[0][0].data).toMatchObject({
      source: "google",
      medium: "cpc",
      channel: "google_ads",
      eventType: "contact_click",
      contactMethod: "line",
      clickIdHash: null,
    });
    expect(createMany.mock.calls[0][0].data).not.toHaveProperty("clickId");
  });
  it("rejects cross-origin requests before touching the database", async () => {
    enable();
    expect((await POST(request({ eventId, path: "/" }, { origin: "https://other.test" }))).status).toBe(403);
    expect(createMany).not.toHaveBeenCalled();
  });
  it("excludes queries, private paths, malformed data and bots", async () => {
    enable();
    for (const path of ["/products/?phone=123", "/backoffice/", "/api/test", "//evil.test", "/x#private"])
      expect((await POST(request({ eventId, path }))).status).toBe(400);
    expect((await POST(request(null))).status).toBe(400);
    expect((await POST(request({ eventId, path: "/" }, { userAgent: "Googlebot" }))).status).toBe(204);
    expect(createMany).not.toHaveBeenCalled();
  });
  it("issues an anonymous HttpOnly cookie, keeps the hash stable and deduplicates retries", async () => {
    enable();
    const response = await POST(request({ eventId, path: "/products/" }));
    expect(response.status).toBe(204);
    expect(response.headers.get("set-cookie")).toContain("HttpOnly");
    const cookie = response.headers.get("set-cookie")!.split(";")[0];
    const first = createMany.mock.calls[0][0];
    expect(first.skipDuplicates).toBe(true);
    expect(first.data.visitorHash).toMatch(/^[a-f0-9]{64}$/);
    expect(first.data).not.toHaveProperty("ip");
    await POST(request({ eventId, path: "/products/" }, { cookie }));
    expect(createMany.mock.calls[1][0].data.visitorHash).toBe(first.data.visitorHash);
  });
  it("fails closed if collection is disabled or no analytics secret is configured", async () => {
    expect((await POST(request({ eventId, path: "/" }))).status).toBe(204);
    vi.stubEnv("WEB_ANALYTICS_ENABLED", "true");
    vi.stubEnv("WEB_ANALYTICS_SECRET", "");
    expect((await POST(request({ eventId, path: "/" }))).status).toBe(503);
    expect(createMany).not.toHaveBeenCalled();
  });
});
