"use server";

import { cookies } from "next/headers";
import { verifyByToken } from "@/lib/seo/auth";
import { ResponsePattern, ResponsePatternType } from "@/lib/seo/helper/response-pattern";
import { fileLogger } from "@/lib/seo/logger";
import { normalizeSearchTerm } from "@/lib/seo/helper/normalize-search-term";
import { seoMetricWindow } from "@/lib/seo/helper/seo-metric-window";
import { extractBlogSlug } from "@/lib/seo/helper/extract-blog-slug";
import prisma from "@/lib/seo/prisma";

/** ช่วงวันที่ใช้สรุปผล (GSC data delay ~3 วัน — 28 วันล่าสุดที่มีข้อมูล) */
const METRIC_WINDOW_DAYS = 28;

export interface SeoQueryMetric {
  query: string; // คำค้นจริงที่ user พิมพ์
  clicks: number;
  impressions: number;
  avgPosition: number; // อันดับเฉลี่ยถ่วงน้ำหนักด้วย impressions
  isTarget: boolean; // ตรงกับ targetKeyword ของบทความไหม
}

export interface SeoArticleMetrics {
  targetKeyword: string | null;
  windowDays: number;
  startDate: string;
  endDate: string;
  totalClicks: number;
  totalImpressions: number;
  /** metrics ของ targetKeyword (null = ยังไม่ติดคำนี้เลย) */
  target: SeoQueryMetric | null;
  /** query ทั้งหมดที่บทความนี้ติดจริง เรียง impressions มาก→น้อย (สูงสุด 20) */
  topQueries: SeoQueryMetric[];
}

/**
 * @description ดึงผล GSC ของบทความหนึ่ง (28 วันล่าสุด) — target keyword ติดอันดับเท่าไหร่ + ติด query อะไรจริงบ้าง
 * @page /super-admin/hurry-web/seo-article
 * @access super-admin
 * @logic
 * - match หน้าใน SeoSearchQueryDaily ด้วย page contains "/blog/<slug>" (รองรับ locale prefix)
 * - รวมต่อ query: clicks/impressions sum, position เฉลี่ยถ่วงน้ำหนัก impressions
 * - isTarget = query ตรง targetKeyword (ถ้าไม่มี targetKeyword ใช้ keywords[0] เดิม)
 * @used-by {@link find-seo-article-metrics.query.ts}
 */
export const findSeoArticleMetrics = async (params: {
  seoArticleId: number;
}): Promise<ResponsePatternType<SeoArticleMetrics>> => {
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
    return ResponsePattern.forbidden("[SEO-MET-01] เฉพาะ super-admin เท่านั้น");
  }

  const log = fileLogger.session("ดึงผล GSC บทความ SEO", {
    type: "R",
    id: `SEO:${params.seoArticleId}`,
    userName: decoded.name || "unknown",
  });

  try {
    const article = await prisma.seoArticle.findUnique({
      where: { seoArticleId: params.seoArticleId },
      select: { slug: true, targetKeyword: true, keywords: true },
    });
    if (!article) {
      log.error("ไม่พบบทความ");
      return ResponsePattern.notFound("[SEO-MET-02] ไม่พบบทความ");
    }

    const targetKeyword = article.targetKeyword || article.keywords[0] || null;
    const latest = await prisma.seoSearchQueryDaily.aggregate({ _max: { date: true } });
    const window = seoMetricWindow(latest._max.date);

    const rows = await prisma.seoSearchQueryDaily.findMany({
      where: { page: { contains: `/blog/${article.slug}` }, date: { gte: window.start, lte: window.end } },
      select: { page: true, query: true, clicks: true, impressions: true, position: true },
    });

    // รวมต่อ query — position เฉลี่ยถ่วงน้ำหนักด้วย impressions
    const byQuery = new Map<string, { clicks: number; impressions: number; positionWeight: number }>();
    for (const r of rows) {
      if (extractBlogSlug(r.page) !== article.slug) continue;
      const query = normalizeSearchTerm(r.query);
      const agg = byQuery.get(query) ?? { clicks: 0, impressions: 0, positionWeight: 0 };
      agg.clicks += r.clicks;
      agg.impressions += r.impressions;
      agg.positionWeight += r.position * r.impressions;
      byQuery.set(query, agg);
    }

    const allQueries: SeoQueryMetric[] = [...byQuery.entries()]
      .map(([query, agg]) => ({
        query,
        clicks: agg.clicks,
        impressions: agg.impressions,
        avgPosition: Math.round((agg.positionWeight / Math.max(agg.impressions, 1)) * 10) / 10,
        isTarget: targetKeyword != null && query === normalizeSearchTerm(targetKeyword),
      }))
      .sort((a, b) => b.impressions - a.impressions);

    const metrics: SeoArticleMetrics = {
      targetKeyword,
      windowDays: METRIC_WINDOW_DAYS,
      startDate: window.startDate,
      endDate: window.endDate,
      totalClicks: allQueries.reduce((s, q) => s + q.clicks, 0),
      totalImpressions: allQueries.reduce((s, q) => s + q.impressions, 0),
      target: allQueries.find((q) => q.isTarget) ?? null,
      topQueries: allQueries.slice(0, 20),
    };

    log.end({ result: `${allQueries.length} queries` });
    return ResponsePattern.ok("ดึงข้อมูลสำเร็จ", metrics);
  } catch (error) {
    log.error(error instanceof Error ? error.message : "Unknown");
    return ResponsePattern.error("[SEO-MET-03] ดึงผล GSC ไม่สำเร็จ");
  } finally {
    log.end();
  }
};
