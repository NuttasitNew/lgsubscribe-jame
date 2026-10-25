import "server-only";
import { SeoKeywordStatus } from "@prisma/client";
import prisma from "@/lib/seo/prisma";
import { gscSearchAnalytics } from "./client";
import { FINAL_DATA_LAG_DAYS, thaiDateMinusDays } from "./sync-search-queries.helper";

/** คำที่เพิ่งเริ่มติดตาม ดึงย้อนหลังให้เห็นจุดตั้งต้น */
const BACKFILL_DAYS = 28;
/** รอบปกติดึงซ้ำ 7 วัน เผื่อ Google ปรับค่าย้อนหลัง */
const DEFAULT_DAYS = 7;

export interface SyncKeywordRanksResult {
  keywords: number;
  rows: number;
  errors: string[];
}

/**
 * @description ดึงอันดับ Google ของคำค้นที่ "เลือกเล่น" (SeoKeyword.status = TRACKING) จาก Search Console ทั้งเว็บ
 * @logic
 * - ต่างจาก sync หลักที่ดึงเฉพาะหน้า /blog/ — อันดับของคำค้นต้องดูทั้งเว็บ เพราะหน้าสินค้า/หน้าแรกอาจติดแทนบทความ
 * - 1 คำ = 1 request (filter query equals คำนั้น, dimensions date+page) — คำที่เล่นมีหลักสิบ ไม่ชนโควตา GSC
 * - ต่อวัน เลือกหน้าที่อันดับดีที่สุด (position ต่ำสุด) เป็น "อันดับของเว็บเรา" และรวม clicks/impressions ทุกหน้า
 * - วันไหนไม่มีแถว = เว็บเราไม่โผล่ในผลค้นหาคำนั้นเลย (ไม่บันทึก — หน้าจอแสดงว่า "ยังไม่ติด")
 * - คำที่ยังไม่มีประวัติเลย ดึงย้อนหลัง {@link BACKFILL_DAYS} วัน
 * - คำหนึ่งพังไม่ล้มทั้งรอบ — เก็บ error ไว้รายงาน
 * @used-by app/api/cron/seo-gsc-sync/route.ts, feature/backoffice/seo/keyword-research/server/sync-keyword-ranks-now.action.ts
 */
export const syncKeywordRanks = async (params?: { seoKeywordIds?: number[] }): Promise<SyncKeywordRanksResult> => {
  const keywords = await prisma.seoKeyword.findMany({
    where: {
      status: SeoKeywordStatus.TRACKING,
      ...(params?.seoKeywordIds?.length ? { seoKeywordId: { in: params.seoKeywordIds } } : {}),
    },
    select: { seoKeywordId: true, keyword: true, _count: { select: { ranks: true } } },
  });

  const endDate = thaiDateMinusDays(FINAL_DATA_LAG_DAYS);
  const syncedAt = new Date();
  let rows = 0;
  const errors: string[] = [];

  for (const keyword of keywords) {
    const days = keyword._count.ranks === 0 ? BACKFILL_DAYS : DEFAULT_DAYS;
    const startDate = thaiDateMinusDays(FINAL_DATA_LAG_DAYS + days - 1);
    try {
      const result = await gscSearchAnalytics({
        startDate,
        endDate,
        dimensions: ["date", "page"],
        dimensionFilterGroups: [{ filters: [{ dimension: "query", operator: "equals", expression: keyword.keyword }] }],
      });

      const byDate = new Map<string, { position: number; page: string; clicks: number; impressions: number }>();
      for (const row of result) {
        const [date, page] = row.keys;
        const current = byDate.get(date);
        if (!current) {
          byDate.set(date, { position: row.position, page, clicks: row.clicks, impressions: row.impressions });
          continue;
        }
        current.clicks += row.clicks;
        current.impressions += row.impressions;
        if (row.position < current.position) {
          current.position = row.position;
          current.page = page;
        }
      }

      for (const [date, value] of byDate) {
        await prisma.seoKeywordRankDaily.upsert({
          where: { seoKeywordId_date: { seoKeywordId: keyword.seoKeywordId, date: new Date(date) } },
          create: { seoKeywordId: keyword.seoKeywordId, date: new Date(date), ...value, syncedAt },
          update: { ...value, syncedAt },
        });
        rows++;
      }
    } catch (error) {
      errors.push(`${keyword.keyword}: ${error instanceof Error ? error.message : "unknown"}`);
    }
  }

  return { keywords: keywords.length, rows, errors };
};
