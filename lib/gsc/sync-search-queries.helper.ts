import "server-only";
import { gscSearchAnalytics } from "./client";
import prisma from "@/lib/seo/prisma";

/** GSC data นิ่ง (dataState=final) ช้าประมาณ 3 วัน — วันล่าสุดที่เชื่อถือได้ = วันนี้ - 3 */
export const FINAL_DATA_LAG_DAYS = 3;
/** ดึงย้อนหลังกี่วันต่อรอบ (เผื่อ Google heal ค่าเก่า) */
export const DEFAULT_SYNC_DAYS = 3;

/** วันที่ (yyyy-MM-dd เวลาไทย) ย้อนหลัง n วันจากวันนี้ */
export const thaiDateMinusDays = (days: number): string =>
  new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Bangkok" }).format(new Date(Date.now() - days * 86400000));

export interface SyncGscSearchQueriesResult {
  startDate: string;
  endDate: string;
  /** จำนวนแถวที่เขียนลง SeoSearchQueryDaily */
  rows: number;
  /** จำนวนแถวเดิมในช่วงวันเดียวกันที่ถูกลบทิ้งก่อนเขียนใหม่ */
  replaced: number;
}

/**
 * @description ดึงผล Search Analytics ของหน้า /blog/ จาก GSC ลงตาราง SeoSearchQueryDaily
 * @logic
 * - default: ช่วง 3 วันล่าสุดที่ data final แล้ว (วันนี้-5 ถึง วันนี้-3) / ระบุ start-end เองได้สำหรับ backfill
 * - ขอ dimensions [date,page,query] filter page contains "/blog/"
 * - idempotent: deleteMany(ช่วงวัน) + createMany ใน transaction เดียว → รันซ้ำกี่รอบผลเท่าเดิม
 * @param params.startDate yyyy-MM-dd (ไม่ระบุ = วันนี้ - 5)
 * @param params.endDate yyyy-MM-dd (ไม่ระบุ = วันนี้ - 3)
 * @returns ช่วงวันที่ sync + จำนวนแถวที่เขียน/แทนที่
 * @used-by {@link app/api/cron/seo-gsc-sync/route.ts}, {@link sync-gsc-metrics-now.action.ts}
 */
export const syncGscSearchQueries = async (params?: {
  startDate?: string;
  endDate?: string;
}): Promise<SyncGscSearchQueriesResult> => {
  const endDate = params?.endDate || thaiDateMinusDays(FINAL_DATA_LAG_DAYS);
  const startDate = params?.startDate || thaiDateMinusDays(FINAL_DATA_LAG_DAYS + DEFAULT_SYNC_DAYS - 1);

  const rows = await gscSearchAnalytics({
    startDate,
    endDate,
    dimensions: ["date", "page", "query"],
    dimensionFilterGroups: [{ filters: [{ dimension: "page", operator: "contains", expression: "/blog/" }] }],
  });

  const syncedAt = new Date();
  const records = rows.map((r) => ({
    date: new Date(r.keys[0]),
    page: r.keys[1],
    query: r.keys[2],
    clicks: r.clicks,
    impressions: r.impressions,
    position: r.position,
    syncedAt,
  }));

  const [deleted] = await prisma.$transaction([
    prisma.seoSearchQueryDaily.deleteMany({
      where: { date: { gte: new Date(startDate), lte: new Date(endDate) } },
    }),
    prisma.seoSearchQueryDaily.createMany({ data: records }),
  ]);

  return { startDate, endDate, rows: records.length, replaced: deleted.count };
};
