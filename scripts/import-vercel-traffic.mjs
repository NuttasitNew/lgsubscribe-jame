// One-time historical import using the already signed-in Vercel CLI. No Vercel
// access token is uploaded to the app, and no raw visitor/event identifiers move.
import fs from "node:fs";
import { spawnSync } from "node:child_process";
import { parse } from "dotenv";
import { PrismaNeon } from "@prisma/adapter-neon";
import { PrismaClient } from "@prisma/client";
import { parseVercelDays, parseVercelPeriod } from "../lib/analytics/vercel-data.ts";
const environment = process.argv[2];
if (!["development", "production"].includes(environment))
  throw new Error("Use: node scripts/import-vercel-traffic.mjs development|production [start] [end]");
const env = parse(fs.readFileSync(`.env.${environment}.local`));
const project = JSON.parse(fs.readFileSync(".vercel/project.json"));
const start = process.argv[3] || "2026-08-09";
const end = process.argv[4] || new Date().toISOString().slice(0, 10);
const asOf = new Date();
if (
  !/^\d{4}-\d{2}-\d{2}$/.test(start) ||
  !/^\d{4}-\d{2}-\d{2}$/.test(end) ||
  start > end ||
  end > asOf.toISOString().slice(0, 10)
)
  throw new Error("Invalid historical date range");
function query(by, from, until) {
  const params = new URLSearchParams({
    teamId: project.orgId,
    projectId: project.projectId,
    since: `${from}T00:00:00.000Z`,
    until: `${until}T23:59:59.999Z`,
    by,
  });
  const result = spawnSync("vercel", ["api", `/v1/query/web-analytics/visits/aggregate?${params}`, "--raw"], {
    encoding: "utf8",
  });
  if (result.status !== 0) throw new Error("Vercel query failed: " + result.stderr);
  return JSON.parse(result.stdout);
}
const dailyResponse = query("day", start, end);
const days = parseVercelDays(dailyResponse, start, end);
if (!days.length) throw new Error("No daily Vercel records; existing data remains unchanged");
const bounds = new Map();
function add(from, until) {
  if (from >= start && from <= until && until <= end) bounds.set(`${from}:${until}`, { from, until });
}
add(start, end);
let month = start.slice(0, 7);
while (month <= end.slice(0, 7)) {
  const [year, number] = month.split("-").map(Number);
  const first = `${month}-01`;
  const last = new Date(Date.UTC(year, number, 0)).toISOString().slice(0, 10);
  add(first, last < end ? last : end);
  month = new Date(Date.UTC(year, number, 1)).toISOString().slice(0, 7);
}
add(end, end);
for (const back of [6, 29])
  add(new Date(Date.parse(`${end}T00:00:00Z`) - back * 86400000).toISOString().slice(0, 10), end);
const periods = [...bounds.values()].map(({ from, until }) =>
  parseVercelPeriod(query("environment", from, until), from, until),
);
const prisma = new PrismaClient({
  adapter: new PrismaNeon({ connectionString: env.POSTGRES_PRISMA_URL || env.DATABASE_URL }),
});
try {
  await prisma.$transaction(
    async (tx) => {
      for (const row of days)
        await tx.$executeRaw`INSERT INTO "VercelTrafficDay" ("projectId",day,visitors,pageviews,"asOf","updatedAt") VALUES (${project.projectId},${new Date(row.day + "T00:00:00Z")},${row.visitors},${row.pageviews},${asOf},${asOf}) ON CONFLICT ("projectId",day) DO UPDATE SET visitors=EXCLUDED.visitors,pageviews=EXCLUDED.pageviews,"asOf"=EXCLUDED."asOf","updatedAt"=EXCLUDED."updatedAt" WHERE "VercelTrafficDay"."asOf" <= EXCLUDED."asOf"`;
      for (const row of periods)
        await tx.$executeRaw`INSERT INTO "VercelTrafficPeriod" ("projectId",start,"end",visitors,pageviews,"asOf","updatedAt") VALUES (${project.projectId},${new Date(row.start + "T00:00:00Z")},${new Date(row.end + "T00:00:00Z")},${row.visitors},${row.pageviews},${asOf},${asOf}) ON CONFLICT ("projectId",start,"end") DO UPDATE SET visitors=EXCLUDED.visitors,pageviews=EXCLUDED.pageviews,"asOf"=EXCLUDED."asOf","updatedAt"=EXCLUDED."updatedAt" WHERE "VercelTrafficPeriod"."asOf" <= EXCLUDED."asOf"`;
    },
    { timeout: 30000 },
  );
  console.log(
    JSON.stringify({
      environment,
      projectId: project.projectId,
      start,
      end,
      days: days.length,
      periods: periods.length,
      allPeriod: periods.find((row) => row.start === start && row.end === end),
    }),
  );
} finally {
  await prisma.$disconnect();
}
