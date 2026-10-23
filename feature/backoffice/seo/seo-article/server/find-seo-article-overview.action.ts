"use server";

import { cookies } from "next/headers";
import { verifyByToken } from "@/lib/seo/auth";
import { ResponsePattern, ResponsePatternType } from "@/lib/seo/helper/response-pattern";
import { fileLogger } from "@/lib/seo/logger";
import prisma from "@/lib/seo/prisma";
import { SeoArticleStatus } from "@prisma/client";
import type { SeoSourceTopic } from "../type/seo-article-content.type";

/** จำนวนบทความล่าสุดที่เอาหัวข้อต้นเรื่องมาโชว์ในหน้าภาพรวม */
const RECENT_TOPIC_ARTICLES = 5;

/** หัวข้อต้นเรื่อง 1 รายการ พร้อมบทความที่มันกลายเป็น */
export interface SeoArticleRecentTopic extends SeoSourceTopic {
  seoArticleId: number;
  articleTitle: string;
  articleStatus: SeoArticleStatus;
  sourceDate: string;
}

/** ตัวเลขสรุปหน้าภาพรวม */
export interface SeoArticleOverview {
  counts: Record<SeoArticleStatus, number>; // จำนวนบทความต่อสถานะ (ครบทุกสถานะเสมอ ไม่มีก็เป็น 0)
  total: number; // รวมทุกสถานะ
  recentTopics: SeoArticleRecentTopic[]; // หัวข้อต้นเรื่องของบทความล่าสุด
}

/** อ่าน sourceTopics (Json) ให้เป็น array ที่ใช้ได้ — ข้อมูลเก่าอาจไม่ครบรูป */
const toSourceTopics = (raw: unknown): SeoSourceTopic[] => {
  if (!Array.isArray(raw)) return [];
  return raw.filter((item): item is SeoSourceTopic => typeof item === "object" && item !== null && "topic" in item);
};

/**
 * @description ดึงตัวเลขสรุปหน้าภาพรวมบทความ SEO (จำนวนต่อสถานะ + หัวข้อต้นเรื่องล่าสุด)
 * @page /super-admin/hurry-web/seo-article
 * @access super-admin
 * @logic
 * - นับด้วย `groupBy(status)` ให้ฐานข้อมูลนับให้ — ไม่โหลดทุกแถวมานับในแอป (เดิมหน้านี้ดึงบทความทั้งตาราง
 *   พร้อม contentJson แล้วนับเอง ซึ่งบวมขึ้นเรื่อย ๆ ตามจำนวนบทความ)
 * - หัวข้อล่าสุดดึงแค่ 5 แถวและ select เฉพาะ field ที่ใช้ (ไม่มี contentJson)
 * - groupBy กับ findMany ยิงพร้อมกัน
 * @used-by {@link find-seo-article-overview.query.ts}
 * @related {@link find-seo-articles.action.ts}
 */
export const findSeoArticleOverview = async (): Promise<ResponsePatternType<SeoArticleOverview>> => {
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
    return ResponsePattern.forbidden("[SEO-OVW-01] เฉพาะ super-admin เท่านั้น");
  }

  const log = fileLogger.session("ดึงภาพรวมบทความ SEO", {
    type: "R",
    id: "overview",
    userName: decoded.name || "unknown",
  });

  try {
    const [grouped, recentArticles] = await Promise.all([
      // ตัวเลขสรุปต้องไม่นับบทความที่ถูกลบ ไม่งั้นยอดจะไม่ตรงกับจำนวนการ์ดที่เห็นในหน้ารายการ
      prisma.seoArticle.groupBy({ by: ["status"], where: { deletedAt: null }, _count: { _all: true } }),
      prisma.seoArticle.findMany({
        where: { deletedAt: null },
        orderBy: { createdAt: "desc" },
        take: RECENT_TOPIC_ARTICLES,
        select: { seoArticleId: true, title: true, status: true, sourceDate: true, sourceTopics: true },
      }),
    ]);

    const counts = Object.values(SeoArticleStatus).reduce(
      (acc, status) => ({ ...acc, [status]: 0 }),
      {} as Record<SeoArticleStatus, number>
    );
    let total = 0;
    for (const row of grouped) {
      counts[row.status] = row._count._all;
      total += row._count._all;
    }

    const recentTopics: SeoArticleRecentTopic[] = recentArticles.flatMap((article) =>
      toSourceTopics(article.sourceTopics).map((topic) => ({
        ...topic,
        seoArticleId: article.seoArticleId,
        articleTitle: article.title,
        articleStatus: article.status,
        sourceDate: article.sourceDate,
      }))
    );

    log.end({ result: `${total} เรื่อง, ${recentTopics.length} หัวข้อล่าสุด` });
    return ResponsePattern.ok("ดึงข้อมูลสำเร็จ", { counts, total, recentTopics });
  } catch (error) {
    log.error(error instanceof Error ? error.message : "Unknown");
    return ResponsePattern.error("[SEO-OVW-02] ดึงภาพรวมบทความไม่สำเร็จ");
  } finally {
    log.end();
  }
};
