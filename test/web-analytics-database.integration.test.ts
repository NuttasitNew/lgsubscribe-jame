// @vitest-environment node
import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { parse } from "dotenv";
import { describe, expect, it } from "vitest";
import { getPrisma } from "@/lib/db/prisma";
import { dateRange } from "@/lib/analytics/date-range";
import { getTrafficReport } from "@/lib/analytics/report";

const enabled = process.env.RUN_WEB_ANALYTICS_INTEGRATION === "true";
describe.skipIf(!enabled)("development database traffic reporting", () => {
  it("deduplicates events, uses Bangkok boundaries and counts visitors once across multiple days", async () => {
    const env = parse(readFileSync(".env.development.local"));
    if (env.DATABASE_ENV !== "development") throw new Error("Only a development database is allowed");
    Object.assign(process.env, env);
    const prisma = getPrisma();
    const ids = Array.from({ length: 4 }, () => randomUUID());
    const visitor = randomUUID().replaceAll("-", "");
    const events = [
      {
        eventId: ids[0],
        visitorHash: visitor,
        path: "/test-traffic/",
        occurredAt: new Date("2040-01-01T16:59:59Z"),
      },
      {
        eventId: ids[1],
        visitorHash: visitor,
        path: "/test-traffic/",
        occurredAt: new Date("2040-01-01T17:00:00Z"),
      },
      {
        eventId: ids[2],
        visitorHash: visitor + "b",
        path: "/test-traffic/",
        occurredAt: new Date("2040-01-02T16:59:59Z"),
      },
      {
        eventId: ids[3],
        visitorHash: visitor,
        path: "/test-traffic/",
        occurredAt: new Date("2040-01-02T17:00:00Z"),
      },
    ];
    try {
      await prisma.webPageView.createMany({ data: events });
      expect((await prisma.webPageView.createMany({ data: [events[0]], skipDuplicates: true })).count).toBe(
        0,
      );
      const report = await getTrafficReport(dateRange("2040-01-01", "2040-01-02"));
      expect(report.totals).toMatchObject({ visitors: 2, views: 3, contactClicks: 0 });
      expect(report.rows).toEqual([
        { day: "2040-01-01", visitors: 1, views: 1, contactClicks: 0 },
        { day: "2040-01-02", visitors: 2, views: 2, contactClicks: 0 },
      ]);
      expect(report.pages[0].path).toBe("/test-traffic/");
    } finally {
      await prisma.webPageView.deleteMany({ where: { eventId: { in: ids } } });
      await prisma.$disconnect();
    }
  }, 30000);
});
