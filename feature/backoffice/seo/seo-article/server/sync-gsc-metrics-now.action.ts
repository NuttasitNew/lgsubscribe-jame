"use server";

import { cookies } from "next/headers";
import { verifyByToken } from "@/lib/seo/auth";
import { ResponsePattern, ResponsePatternType } from "@/lib/seo/helper/response-pattern";
import { fileLogger } from "@/lib/seo/logger";
import { isGscConfigured } from "@/lib/gsc/client";
import { syncGscSearchQueries, SyncGscSearchQueriesResult } from "@/lib/gsc/sync-search-queries.helper";

/**
 * @description กด sync ผล Google Search Console ทันที (ไม่ต้องรอ cron 02:30 น.)
 * @page /super-admin/hurry-web/seo-article
 * @access super-admin
 * @logic
 * - ใช้ helper ตัวเดียวกับ cron → ผลลัพธ์เหมือนกันเป๊ะ และ idempotent (กดซ้ำได้ ข้อมูลไม่เบิ้ล)
 * - GSC ปล่อยข้อมูล final ช้า ~3 วัน กดถี่แค่ไหนก็ไม่ได้ข้อมูลของเมื่อวาน
 * - ยังไม่ตั้ง env → ตอบ badRequest บอกตรง ๆ ว่าต้องตั้งอะไร (ไม่ปล่อยให้ error ดิบ)
 * @used-by {@link sync-gsc-metrics-now.mutation.ts}
 */
export const syncGscMetricsNow = async (): Promise<ResponsePatternType<SyncGscSearchQueriesResult>> => {
  const cookieStore = await cookies();
  const authToken = cookieStore.get("lg_backoffice_session")?.value;
  if (!authToken) return ResponsePattern.unauthorized("no auth token");

  let decoded;
  try {
    decoded = await verifyByToken(authToken);
  } catch {
    return ResponsePattern.unauthorized("Token ไม่ถูกต้องหรือหมดอายุ");
  }

  if (decoded.role !== "SUPER_ADMIN") {
    return ResponsePattern.forbidden("[GSC-NOW-01] เฉพาะ super-admin เท่านั้น");
  }

  if (!isGscConfigured()) {
    return ResponsePattern.badRequest(
      "[GSC-NOW-02] ยังไม่ได้เชื่อม Search Console — ต้องตั้ง GSC_CLIENT_EMAIL / GSC_PRIVATE_KEY / GSC_SITE_URL ก่อน"
    );
  }

  const log = fileLogger.session("sync ผล GSC ทันที", {
    type: "C",
    id: "gsc-sync-now",
    userName: decoded.name || "unknown",
  });

  try {
    const result = await syncGscSearchQueries();

    log.end({ result: `${result.startDate}..${result.endDate} rows=${result.rows} (replaced ${result.replaced})` });
    return ResponsePattern.ok(`sync ข้อมูล ${result.startDate} ถึง ${result.endDate} แล้ว ${result.rows} แถว`, result);
  } catch (error) {
    log.error(error instanceof Error ? error.message : "Unknown");
    return ResponsePattern.error("[GSC-NOW-03] sync ผล Google ไม่สำเร็จ");
  } finally {
    log.end();
  }
};
