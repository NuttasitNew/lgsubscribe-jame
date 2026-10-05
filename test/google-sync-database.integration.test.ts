// @vitest-environment node
import { readFileSync } from "node:fs";
import { parse } from "dotenv";
import { describe, expect, it } from "vitest";
import { getPrisma } from "@/lib/db/prisma";
import { parseGoogleSnapshot, saveGoogleSnapshot } from "@/lib/analytics/google-sync";

describe.skipIf(process.env.RUN_WEB_ANALYTICS_INTEGRATION !== "true")(
  "Google snapshot development persistence",
  () => {
    it("upserts complete days without duplicate counts and rejects older snapshots", async () => {
      const env = parse(readFileSync(".env.development.local"));
      if (env.DATABASE_ENV !== "development") throw new Error("Only development databases are allowed");
      Object.assign(process.env, env);
      const prisma = getPrisma(),
        day = new Date("2042-08-11T00:00:00Z");
      const where = { provider: "ga4", externalId: env.GA4_PROPERTY_ID, day };
      if (await prisma.googleDailySnapshot.count({ where })) throw new Error("Test day already exists");
      const value = {
        provider: "ga4",
        externalId: env.GA4_PROPERTY_ID,
        day: "2042-08-11",
        currency: "THB",
        timeZone: "Asia/Bangkok",
        asOf: new Date().toISOString(),
        rows: [
          {
            segment: "__total__",
            label: "Daily total",
            visitors: 4,
            sessions: 5,
            views: 6,
            contactClicks: 2,
          },
        ],
      };
      try {
        const snapshot = parseGoogleSnapshot(value);
        expect(await saveGoogleSnapshot(snapshot)).toBe(true);
        expect(await saveGoogleSnapshot(snapshot)).toBe(true);
        expect(await prisma.googleDailySnapshot.count({ where })).toBe(1);
        expect(
          await saveGoogleSnapshot({
            ...snapshot,
            asOf: new Date(Date.parse(snapshot.asOf) - 1000).toISOString(),
            rows: [],
          }),
        ).toBe(false);
        const saved = await prisma.googleDailySnapshot.findFirstOrThrow({ where });
        expect(saved.rows).toEqual(snapshot.rows);
      } finally {
        await prisma.googleDailySnapshot.deleteMany({ where });
        await prisma.$disconnect();
      }
    }, 30000);
  },
);
