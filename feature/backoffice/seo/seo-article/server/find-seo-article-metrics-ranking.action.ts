"use server";

import { cookies } from "next/headers";
import { verifyByToken } from "@/lib/seo/auth";
import { ResponsePattern, ResponsePatternType } from "@/lib/seo/helper/response-pattern";
import { fileLogger } from "@/lib/seo/logger";
import { seoMetricWindow } from "@/lib/seo/helper/seo-metric-window";
import { extractBlogSlug } from "@/lib/seo/helper/extract-blog-slug";
import prisma from "@/lib/seo/prisma";
import { SeoArticleStatus } from "@prisma/client";

/** ช่วงวันที่ใช้สรุปผล (GSC data delay ~3 วัน — 28 วันล่าสุดที่มีข้อมูล) — ต้องตรงกับ findSeoArticleMetrics */
const METRIC_WINDOW_DAYS = 28;

/** ค่าเริ่มต้น + เพดานต่อหน้า — กันหน้าเดียวลากทั้งตาราง */
const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 100;

/** 1 แถว = 1 บทความบนเว็บ พร้อมผลรวมจาก GSC ในหน้าต่างเวลา */
export interface SeoArticleMetricRow {
  /** null = หน้าที่มีผลใน GSC แต่ไม่มีใน SeoArticle (บทความเก่าที่เขียนในเว็บตรง ๆ) — กางรายละเอียดรายคำไม่ได้ */
  seoArticleId: number | null;
  title: string;
  slug: string;
  targetKeyword: string | null;
  publishedAt: Date | null;
  clicks: number;
  impressions: number;
  /** อันดับเฉลี่ยถ่วงน้ำหนักด้วย impressions (null = ยังไม่มี impressions เลย) */
  avgPosition: number | null;
  /** clicks / impressions * 100 (0 เมื่อยังไม่มี impressions) */
  ctr: number;
}

export interface SeoArticleMetricsRankingResult {
  items: SeoArticleMetricRow[];
  total: number; // จำนวนแถวทั้งหมด (บทความเผยแพร่ + หน้าเก่าที่มีผล GSC) — ไม่ใช่เฉพาะหน้านี้
  page: number;
  pageSize: number;
  pageCount: number;
  windowDays: number;
  startDate: string;
  endDate: string;
  /** ผลรวมทุกบทความ (ทุกหน้า) — ใช้โชว์หัวตาราง */
  totalClicks: number;
  totalImpressions: number;
  /** จำนวนบทความที่มี impressions > 0 — บอกได้ว่าอีกกี่เรื่องยังเงียบสนิท */
  articlesWithData: number;
}

/** ผลรวมต่อ page URL จาก SeoSearchQueryDaily */
interface PageAggregateRow {
  page: string;
  clicks: number;
  impressions: number;
  positionWeight: number; // Σ(position × impressions) — หารด้วย impressions ได้อันดับเฉลี่ยถ่วงน้ำหนัก
}

interface FindSeoArticleMetricsRankingParams {
  page?: number; // เริ่มที่ 1 (ไม่ส่ง = 1)
  pageSize?: number; // ไม่ส่ง = 20, สูงสุด 100
}

/**
 * @description ตารางผล GSC ของบทความที่เผยแพร่ **ทุกเรื่อง** (28 วันล่าสุด) เรียงคลิกมาก→น้อย แล้วตามด้วย impressions
 * @page /super-admin/hurry-web/seo-article
 * @access super-admin
 * @logic
 * - ยิง 2 query เท่านั้น (บทความทั้งหมด + GROUP BY page ครั้งเดียว) — ห้ามยิง metrics ต่อบทความเป็นลูป (N+1)
 * - จับคู่บทความกับ GSC ด้วย slug ที่ตัดจาก URL (`/blog/<slug>`) ไม่ใช่ `contains` — กัน slug ที่เป็นคำนำหน้ากินยอดกัน
 * - avgPosition = Σ(position × impressions) / Σ(impressions) (ถ่วงน้ำหนัก เหมือน findSeoArticleMetrics)
 * - เรียง clicks DESC → impressions DESC → publishedAt DESC แล้วค่อยตัดหน้าในหน่วยความจำ
 *   (เรียงใน SQL ไม่ได้ เพราะยอดอยู่คนละตารางและจับคู่กันด้วย slug ที่ต้องแกะจาก URL)
 * - บทความที่ยังไม่มีข้อมูลก็ต้องอยู่ในตาราง (คลิก 0) — หายไปเมื่อไหร่จะดูเหมือนไม่มีบทความนั้น
 * - slug ที่มีผลใน GSC แต่ไม่มีแถวใน SeoArticle (บทความเก่าที่เขียนในเว็บตรง ๆ) ก็ใส่ในตารางด้วย seoArticleId = null
 * @used-by {@link find-seo-article-metrics-ranking.query.ts}
 * @related {@link find-seo-article-metrics.action.ts} (รายละเอียดรายคำของบทความเดียว)
 */
export const findSeoArticleMetricsRanking = async (
  params: FindSeoArticleMetricsRankingParams
): Promise<ResponsePatternType<SeoArticleMetricsRankingResult>> => {
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
    return ResponsePattern.forbidden("[SEO-MET-RANK-01] เฉพาะ super-admin เท่านั้น");
  }

  const log = fileLogger.session("ดึงตารางผล GSC ทุกบทความ", {
    type: "R",
    id: "seo-metrics-ranking",
    userName: decoded.name || "unknown",
  });

  try {
    const page = Math.max(1, Math.floor(params.page ?? 1));
    const pageSize = Math.min(MAX_PAGE_SIZE, Math.max(1, Math.floor(params.pageSize ?? DEFAULT_PAGE_SIZE)));
    const latest = await prisma.seoSearchQueryDaily.aggregate({ _max: { date: true } });
    const window = seoMetricWindow(latest._max.date);

    const [articles, pageRows] = await Promise.all([
      prisma.seoArticle.findMany({
        where: { status: SeoArticleStatus.PUBLISHED, deletedAt: null },
        select: {
          seoArticleId: true,
          title: true,
          slug: true,
          targetKeyword: true,
          keywords: true,
          publishedAt: true,
        },
      }),
      prisma.$queryRaw<PageAggregateRow[]>`
        SELECT
          "page"                                                     AS "page",
          SUM("clicks")::int                                         AS "clicks",
          SUM("impressions")::int                                    AS "impressions",
          SUM("position" * "impressions")::float8       AS "positionWeight"
        FROM "SeoSearchQueryDaily"
        WHERE "date" >= ${window.start} AND "date" <= ${window.end} AND "page" LIKE '%/blog/%'
        GROUP BY "page"
      `,
    ]);

    // รวมยอดต่อ slug — หนึ่งบทความอาจมีหลาย URL (locale prefix / trailing slash) ต้องบวกเข้าด้วยกัน
    const bySlug = new Map<string, { clicks: number; impressions: number; positionWeight: number }>();
    for (const row of pageRows) {
      const slug = extractBlogSlug(row.page);
      if (!slug) continue;
      const agg = bySlug.get(slug) ?? { clicks: 0, impressions: 0, positionWeight: 0 };
      agg.clicks += row.clicks;
      agg.impressions += row.impressions;
      agg.positionWeight += row.positionWeight;
      bySlug.set(slug, agg);
    }

    const allRows: SeoArticleMetricRow[] = articles.map((article) => {
      const agg = bySlug.get(article.slug);
      const clicks = agg?.clicks ?? 0;
      const impressions = agg?.impressions ?? 0;
      return {
        seoArticleId: article.seoArticleId,
        title: article.title,
        slug: article.slug,
        targetKeyword: article.targetKeyword || article.keywords[0] || null,
        publishedAt: article.publishedAt,
        clicks,
        impressions,
        avgPosition: impressions > 0 ? Math.round((agg!.positionWeight / impressions) * 10) / 10 : null,
        ctr: impressions > 0 ? Math.round((clicks / impressions) * 1000) / 10 : 0,
      };
    });

    // หน้าที่มีผลใน GSC แต่ไม่มีแถวใน SeoArticle = บทความเก่าที่เขียนในเว็บตรง ๆ ก่อนมีระบบนี้
    // ตัดทิ้งไม่ได้ — ปัจจุบันเป็นตัวที่ยอดสูงสุด ถ้าไม่โชว์ ตารางจะดูเหมือนทั้งเว็บแทบไม่มีคลิก
    const knownSlugs = new Set(articles.map((article) => article.slug));
    for (const [slug, agg] of bySlug) {
      if (knownSlugs.has(slug)) continue;
      allRows.push({
        seoArticleId: null,
        title: slug,
        slug,
        targetKeyword: null,
        publishedAt: null,
        clicks: agg.clicks,
        impressions: agg.impressions,
        avgPosition: agg.impressions > 0 ? Math.round((agg.positionWeight / agg.impressions) * 10) / 10 : null,
        ctr: agg.impressions > 0 ? Math.round((agg.clicks / agg.impressions) * 1000) / 10 : 0,
      });
    }

    allRows.sort(
      (a, b) =>
        b.clicks - a.clicks ||
        b.impressions - a.impressions ||
        (b.publishedAt?.getTime() ?? 0) - (a.publishedAt?.getTime() ?? 0)
    );

    const total = allRows.length;
    const pageCount = Math.max(1, Math.ceil(total / pageSize));
    const safePage = Math.min(page, pageCount);

    const result: SeoArticleMetricsRankingResult = {
      items: allRows.slice((safePage - 1) * pageSize, safePage * pageSize),
      total,
      page: safePage,
      pageSize,
      pageCount,
      windowDays: METRIC_WINDOW_DAYS,
      startDate: window.startDate,
      endDate: window.endDate,
      totalClicks: allRows.reduce((sum, row) => sum + row.clicks, 0),
      totalImpressions: allRows.reduce((sum, row) => sum + row.impressions, 0),
      articlesWithData: allRows.filter((row) => row.impressions > 0).length,
    };

    log.end({ result: `${total} บทความ / ${result.totalClicks} clicks` });
    return ResponsePattern.ok("ดึงข้อมูลสำเร็จ", result);
  } catch (error) {
    log.error(error instanceof Error ? error.message : "Unknown");
    return ResponsePattern.error("[SEO-MET-RANK-02] ดึงตารางผล GSC ไม่สำเร็จ");
  } finally {
    log.end();
  }
};
