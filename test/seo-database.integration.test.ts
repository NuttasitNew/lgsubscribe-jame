// @vitest-environment node
import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { parse } from "dotenv";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { PrismaClient } from "@prisma/client";
import { PrismaNeon } from "@prisma/adapter-neon";

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/feature/backoffice/auth/session", () => ({ requireBackofficeAccess: vi.fn(async () => {}) }));
const state = { ok: false, message: "" };
const enabled = process.env.RUN_SEO_DATABASE_INTEGRATION === "true";
const keyword = `integration-${randomUUID()}`;
let db: PrismaClient;
const env = enabled ? parse(readFileSync(".env.development.local")) : {};
vi.mock("@/lib/db/prisma", () => ({ getPrisma: () => db }));
const { saveKeyword, importCsv } = await import("@/feature/backoffice/seo/actions");

describe.skipIf(!enabled)("SEO persistence in isolated development database", () => {
  beforeAll(() => {
    if (env.DATABASE_ENV !== "development" || new URL(env.DATABASE_URL).hostname.includes("ep-delicate-haze"))
      throw new Error("Refusing integration test outside development");
    db = new PrismaClient({ adapter: new PrismaNeon({ connectionString: env.DATABASE_URL }) });
  });
  afterAll(async () => {
    if (db) {
      await db.seoKeyword.deleteMany({ where: { keyword } });
      await db.seoSyncRun.deleteMany({
        where: { periodStart: new Date("2020-01-01"), periodEnd: new Date("2020-01-28"), source: "GSC_CSV" },
      });
      await db.$disconnect();
    }
    vi.unstubAllGlobals();
  });
  it("persists a keyword, idempotently imports CSV, and refuses history identity changes", async () => {
    const form = new FormData();
    for (const [key, value] of Object.entries({
      keyword,
      targetPath: "/products/",
      cluster: "integration",
      country: "tha",
      device: "MOBILE",
    }))
      form.set(key, value);
    expect(await saveKeyword(state, form)).toMatchObject({ ok: true });
    expect(await saveKeyword(state, form)).toMatchObject({ ok: false });
    const saved = await db.seoKeyword.findFirstOrThrow({ where: { keyword } });
    const csv = new FormData();
    for (const [key, value] of Object.entries({
      start: "2020-01-01",
      end: "2020-01-28",
      country: "tha",
      device: "MOBILE",
      confirmed: "on",
    }))
      csv.set(key, value);
    csv.set(
      "file",
      new File([`Top queries,Clicks,Impressions,CTR,Position\n${keyword},2,40,5%,18.5`], "Queries.csv", {
        type: "text/csv",
      }),
    );
    expect(await importCsv(state, csv)).toMatchObject({ ok: true });
    expect(await importCsv(state, csv)).toMatchObject({ ok: true });
    expect(await db.seoMeasurement.count({ where: { keywordId: saved.id } })).toBe(1);
    expect(await db.seoMeasurement.findFirst({ where: { keywordId: saved.id } })).toMatchObject({
      clicks: 2,
      impressions: 40,
      position: 18.5,
      source: "GSC_CSV",
    });
    form.set("id", saved.id);
    form.set("device", "DESKTOP");
    expect(await saveKeyword(state, form)).toMatchObject({ ok: false });
    expect((await db.seoKeyword.findUniqueOrThrow({ where: { id: saved.id } })).device).toBe("MOBILE");
  }, 30000);
});
