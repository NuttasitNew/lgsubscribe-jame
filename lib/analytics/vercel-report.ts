import { getPrisma } from "@/lib/db/prisma";
import { summarizeVercelDays } from "./vercel-data";
import type { dateRange } from "./date-range";
export const vercelProjectId = "prj_VnrpiWwk4vLDkhSjlz25TzQd1g76";
export async function getVercelTrafficReport(range: ReturnType<typeof dateRange>) {
  const prisma = getPrisma();
  const [days, periods] = await Promise.all([
    prisma.vercelTrafficDay.findMany({
      where: {
        projectId: vercelProjectId,
        day: { gte: new Date(`${range.start}T00:00:00Z`), lte: new Date(`${range.end}T00:00:00Z`) },
      },
      orderBy: { day: "asc" },
    }),
    prisma.vercelTrafficPeriod.findMany({
      where: {
        projectId: vercelProjectId,
        start: new Date(`${range.start}T00:00:00Z`),
        end: { lte: new Date(`${range.end}T00:00:00Z`) },
      },
    }),
  ]);
  const summary = summarizeVercelDays(
    days.map((row) => ({
      day: row.day.toISOString().slice(0, 10),
      visitors: row.visitors,
      pageviews: row.pageviews,
    })),
    range.start,
    range.end,
    periods.map((row) => ({
      start: row.start.toISOString().slice(0, 10),
      end: row.end.toISOString().slice(0, 10),
      visitors: row.visitors,
      pageviews: row.pageviews,
    })),
  );
  return {
    ...summary,
    asOf: days.reduce<Date | null>((latest, row) => (!latest || row.asOf > latest ? row.asOf : latest), null),
  };
}
