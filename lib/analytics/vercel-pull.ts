import { getPrisma } from "@/lib/db/prisma";
import { parseVercelDays, parseVercelPeriod, type VercelDay, type VercelPeriod } from "./vercel-data";
import { vercelProjectId } from "./vercel-report";
import { shiftDay } from "./google-pull";

export const vercelTeamId = "team_QkTMmFFrcwvi0nGZTZ4dF6bG";
const MAX_QUERY_DAYS = 62; // Vercel rejects longer ranges at day granularity.

export function missingVercelPullEnv() {
  return ["VERCEL_ANALYTICS_TOKEN"].filter((name) => !process.env[name]?.trim());
}

/**
 * Vercel days are UTC. Default window starts on the 1st of the month containing
 * (yesterday - 29 days), so both the current and previous month periods refresh.
 */
export function resolveVercelRange(from?: string | null, to?: string | null, now = new Date()) {
  const yesterday = shiftDay(now.toISOString().slice(0, 10), -1);
  const end = to || yesterday;
  const start = from || `${shiftDay(end, -29).slice(0, 7)}-01`;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(start) || !/^\d{4}-\d{2}-\d{2}$/.test(end) || start > end)
    throw new Error("Invalid range");
  if (end > yesterday) throw new Error("ดึงได้เฉพาะวันที่จบแล้ว (ถึงเมื่อวานเวลา UTC)");
  if (Date.parse(end) - Date.parse(start) >= MAX_QUERY_DAYS * 86400000)
    throw new Error(`ดึงได้ครั้งละไม่เกิน ${MAX_QUERY_DAYS} วัน`);
  return { start, end };
}

/** Same period set as scripts/import-vercel-traffic.mjs: whole range, each month, last day, last 7/30. */
export function vercelPeriodBounds(start: string, end: string) {
  const bounds = new Map<string, { from: string; until: string }>();
  const add = (from: string, until: string) => {
    if (from >= start && from <= until && until <= end) bounds.set(`${from}:${until}`, { from, until });
  };
  add(start, end);
  for (let month = start.slice(0, 7); month <= end.slice(0, 7);) {
    const [year, number] = month.split("-").map(Number);
    const last = new Date(Date.UTC(year, number, 0)).toISOString().slice(0, 10);
    add(`${month}-01`, last < end ? last : end);
    month = new Date(Date.UTC(year, number, 1)).toISOString().slice(0, 7);
  }
  add(end, end);
  for (const back of [6, 29]) add(shiftDay(end, -back), end);
  return [...bounds.values()];
}

async function query(by: "day" | "environment", from: string, until: string) {
  const params = new URLSearchParams({
    teamId: vercelTeamId,
    projectId: vercelProjectId,
    since: `${from}T00:00:00.000Z`,
    until: `${until}T23:59:59.999Z`,
    by,
  });
  const response = await fetch(`https://api.vercel.com/v1/query/web-analytics/visits/aggregate?${params}`, {
    headers: { authorization: `Bearer ${process.env.VERCEL_ANALYTICS_TOKEN?.trim()}` },
    cache: "no-store",
  });
  if (!response.ok) throw new Error(`Vercel API HTTP ${response.status}`);
  return (await response.json()) as unknown;
}

async function save(days: VercelDay[], periods: VercelPeriod[], asOf: Date) {
  await getPrisma().$transaction(
    async (tx) => {
      for (const row of days)
        await tx.$executeRaw`INSERT INTO "VercelTrafficDay" ("projectId",day,visitors,pageviews,"asOf","updatedAt") VALUES (${vercelProjectId},${new Date(row.day + "T00:00:00Z")},${row.visitors},${row.pageviews},${asOf},${asOf}) ON CONFLICT ("projectId",day) DO UPDATE SET visitors=EXCLUDED.visitors,pageviews=EXCLUDED.pageviews,"asOf"=EXCLUDED."asOf","updatedAt"=EXCLUDED."updatedAt" WHERE "VercelTrafficDay"."asOf" <= EXCLUDED."asOf"`;
      for (const row of periods)
        await tx.$executeRaw`INSERT INTO "VercelTrafficPeriod" ("projectId",start,"end",visitors,pageviews,"asOf","updatedAt") VALUES (${vercelProjectId},${new Date(row.start + "T00:00:00Z")},${new Date(row.end + "T00:00:00Z")},${row.visitors},${row.pageviews},${asOf},${asOf}) ON CONFLICT ("projectId",start,"end") DO UPDATE SET visitors=EXCLUDED.visitors,pageviews=EXCLUDED.pageviews,"asOf"=EXCLUDED."asOf","updatedAt"=EXCLUDED."updatedAt" WHERE "VercelTrafficPeriod"."asOf" <= EXCLUDED."asOf"`;
    },
    { timeout: 30000 },
  );
}

export async function pullVercelTraffic(start: string, end: string) {
  const asOf = new Date();
  // Fetch and validate everything before writing so a failed query never leaves partial data.
  const days = parseVercelDays(await query("day", start, end), start, end);
  if (!days.length) throw new Error("No daily Vercel records; existing data remains unchanged");
  const periods: VercelPeriod[] = [];
  for (const { from, until } of vercelPeriodBounds(start, end))
    periods.push(parseVercelPeriod(await query("environment", from, until), from, until));
  await save(days, periods, asOf);
  return { days: days.length, periods: periods.length };
}
