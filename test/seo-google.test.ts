// @vitest-environment node
import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchKeywordMetrics } from "@/feature/backoffice/seo/google";
import { GET } from "@/app/api/cron/seo/route";
afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});
const keyword = { keyword: "LG Subscribe (ราคา)", country: "tha", device: "MOBILE" };
describe("Google measurement semantics", () => {
  it("preserves no-data as null rather than rank zero", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json({})));
    expect(await fetchKeywordMetrics("token", keyword, "2026-08-01", "2026-08-28")).toEqual({
      status: "NO_DATA",
      clicks: null,
      impressions: null,
      position: null,
      observedPage: null,
    });
  });
  it("uses property aggregate metrics, exact escaped regex and separate observed-page lookup", async () => {
    const fetch = vi
      .fn()
      .mockResolvedValueOnce(Response.json({ rows: [{ clicks: 5, impressions: 100, position: 12.4 }] }))
      .mockResolvedValueOnce(
        Response.json({
          rows: [
            {
              keys: ["https://www.lgthailand-subscribe.com/products/"],
              clicks: 3,
              impressions: 90,
              position: 14,
            },
          ],
        }),
      );
    vi.stubGlobal("fetch", fetch);
    const result = await fetchKeywordMetrics("token", keyword, "2026-08-01", "2026-08-28");
    expect(result).toMatchObject({ clicks: 5, impressions: 100, position: 12.4, status: "MEASURED" });
    const request = JSON.parse(fetch.mock.calls[0][1].body);
    expect(request).toMatchObject({ aggregationType: "byProperty", dataState: "final", dimensions: [] });
    expect(request.dimensionFilterGroups[0].filters[0]).toEqual({
      dimension: "query",
      operator: "includingRegex",
      expression: "(?i)^lg subscribe \\(ราคา\\)$",
    });
  });
  it("surfaces denied access rather than saving absent data", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("private diagnostic", { status: 403 })));
    await expect(fetchKeywordMetrics("token", keyword, "2026-08-01", "2026-08-28")).rejects.toThrow(
      "ไม่มีสิทธิ์",
    );
  });
  it("rejects unauthenticated cron calls before accessing data", async () => {
    vi.stubEnv("CRON_SECRET", "a".repeat(32));
    const response = await GET(new Request("http://localhost/api/cron/seo/"));
    expect(response.status).toBe(401);
  });
});
