import { getPrisma } from "@/lib/db/prisma";
import { dailyRows, dateRange } from "@/lib/analytics/date-range";

export async function getTrafficReport(range: ReturnType<typeof dateRange>) {
  const prisma = getPrisma();
  const [daily, totals, pages, first, sources, devices, campaigns] = await Promise.all([
    prisma.$queryRaw<Array<{ day: string; visitors: number; views: number; contactClicks: number }>>`
      SELECT to_char("occurredAt" + interval '7 hours', 'YYYY-MM-DD') AS day,
        count(DISTINCT "visitorHash") FILTER (WHERE "eventType"='page_view')::int AS visitors,
        count(*) FILTER (WHERE "eventType"='page_view')::int AS views,
        count(*) FILTER (WHERE "eventType"='contact_click')::int AS "contactClicks"
      FROM "WebPageView" WHERE "occurredAt" >= ${range.from} AND "occurredAt" < ${range.until}
      GROUP BY day ORDER BY day`,
    prisma.$queryRaw<Array<{ visitors: number; views: number; sessions: number; contactClicks: number }>>`
      SELECT count(DISTINCT "visitorHash") FILTER (WHERE "eventType"='page_view')::int AS visitors,
        count(*) FILTER (WHERE "eventType"='page_view')::int AS views,
        count(DISTINCT "sessionHash") FILTER (WHERE "eventType"='page_view')::int AS sessions,
        count(*) FILTER (WHERE "eventType"='contact_click')::int AS "contactClicks"
      FROM "WebPageView" WHERE "occurredAt" >= ${range.from} AND "occurredAt" < ${range.until}`,
    prisma.webPageView.groupBy({
      by: ["path"],
      where: { eventType: "page_view", occurredAt: { gte: range.from, lt: range.until } },
      _count: { _all: true },
      orderBy: { _count: { path: "desc" } },
      take: 10,
    }),
    prisma.webPageView.findFirst({
      where: { eventType: "page_view" },
      orderBy: { occurredAt: "asc" },
      select: { occurredAt: true },
    }),
    prisma.$queryRaw<
      Array<{
        source: string;
        medium: string;
        attributionMethod: string;
        visitors: number;
        views: number;
        contactClicks: number;
      }>
    >`
      SELECT source, medium, "attributionMethod", count(DISTINCT "visitorHash") FILTER (WHERE "eventType"='page_view')::int AS visitors,
        count(*) FILTER (WHERE "eventType"='page_view')::int AS views, count(*) FILTER (WHERE "eventType"='contact_click')::int AS "contactClicks"
      FROM "WebPageView" WHERE "occurredAt" >= ${range.from} AND "occurredAt" < ${range.until}
      GROUP BY source, medium, "attributionMethod" ORDER BY views DESC LIMIT 30`,
    prisma.webPageView.groupBy({
      by: ["device"],
      where: { eventType: "page_view", occurredAt: { gte: range.from, lt: range.until } },
      _count: { _all: true },
      orderBy: { _count: { device: "desc" } },
    }),
    prisma.$queryRaw<Array<{ campaign: string; views: number; contactClicks: number }>>`
      SELECT campaign, count(*) FILTER (WHERE "eventType"='page_view')::int AS views, count(*) FILTER (WHERE "eventType"='contact_click')::int AS "contactClicks"
      FROM "WebPageView" WHERE campaign IS NOT NULL AND "occurredAt" >= ${range.from} AND "occurredAt" < ${range.until}
      GROUP BY campaign ORDER BY views DESC LIMIT 30`,
  ]);
  const contactCounts = new Map(daily.map((row) => [row.day, row.contactClicks]));
  return {
    rows: dailyRows(range.start, range.days, daily).map((row) => ({
      ...row,
      contactClicks: contactCounts.get(row.day) ?? 0,
    })),
    totals: totals[0],
    pages,
    sources,
    devices,
    campaigns,
    firstTrackedAt: first?.occurredAt ?? null,
  };
}
