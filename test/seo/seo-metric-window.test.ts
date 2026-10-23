/** @logic Inclusive windows across months/leap days and empty-data fallback. @related helper/seo-metric-window.ts */
import { describe, expect, it } from "vitest";
import { seoMetricWindow } from "@/lib/seo/helper/seo-metric-window";
describe("seoMetricWindow", () => {
  it("ends at latest imported date, not today", () => {
    const w = seoMetricWindow(new Date("2026-09-24"), new Date("2026-09-27T11:00:00Z"));
    expect([w.startDate, w.endDate]).toEqual(["2026-08-28", "2026-09-24"]);
    expect(w.start.getUTCHours()).toBe(0);
  });
  it("includes leap day", () => {
    const w = seoMetricWindow(new Date("2024-03-01"));
    expect(w.startDate).toBe("2024-02-03");
  });
  it("uses final-data lag without rows", () => {
    expect(seoMetricWindow(null, new Date("2026-01-02T18:00:00Z")).endDate).toBe("2025-12-30");
  });
});
