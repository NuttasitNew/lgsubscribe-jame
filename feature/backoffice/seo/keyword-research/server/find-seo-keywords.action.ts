"use server";

import { SeoKeywordStatus } from "@prisma/client";
import prisma from "@/lib/seo/prisma";
import { ResponsePattern, type ResponsePatternType } from "@/lib/seo/helper/response-pattern";
import { requireSeoManager } from "./require-seo-manager.helper";
import type { SeoKeywordRow } from "../type/seo-keyword-row.type";
import type { CompareDataset, SeoKeywordEvidence, SerpBrief } from "../type/seo-keyword.type";

const toDateKey = (date: Date) => date.toISOString().slice(0, 10);

/**
 * @description รายการคำค้นทั้งหมด (ข้อเสนอจาก AI + คำที่เล่นอยู่) พร้อมอันดับล่าสุด/เทียบ 7 วัน/ประวัติ 28 วัน
 * @access seo.manage
 * @logic ประวัติอันดับดึงทีเดียวทุกคำ (ช่วง 35 วัน) แล้วจัดกลุ่มในหน่วยความจำ — กัน N+1 query
 */
export const findSeoKeywords = async (): Promise<ResponsePatternType<SeoKeywordRow[]>> => {
  const auth = await requireSeoManager();
  if (!auth.ok) return auth.status === 401 ? ResponsePattern.unauthorized(auth.message) : ResponsePattern.forbidden(auth.message);

  const keywords = await prisma.seoKeyword.findMany({
    where: { status: { not: SeoKeywordStatus.DISMISSED } },
    orderBy: [{ status: "desc" }, { priority: "desc" }, { createdAt: "desc" }],
  });
  const ids = keywords.map((k) => k.seoKeywordId);
  const articleIds = keywords.map((k) => k.seoArticleId).filter((id): id is number => id != null);

  const [ranks, best, articles] = await Promise.all([
    prisma.seoKeywordRankDaily.findMany({
      where: { seoKeywordId: { in: ids }, date: { gte: new Date(Date.now() - 40 * 86400000) } },
      orderBy: { date: "asc" },
    }),
    prisma.seoKeywordRankDaily.groupBy({ by: ["seoKeywordId"], where: { seoKeywordId: { in: ids } }, _min: { position: true } }),
    prisma.seoArticle.findMany({
      where: { seoArticleId: { in: articleIds } },
      select: { seoArticleId: true, title: true, slug: true, status: true, deletedAt: true },
    }),
  ]);

  const rows: SeoKeywordRow[] = keywords.map((keyword) => {
    const history = ranks.filter((rank) => rank.seoKeywordId === keyword.seoKeywordId);
    const latest = history.at(-1) ?? null;
    const weekBefore = latest
      ? [...history].reverse().find((rank) => latest.date.getTime() - rank.date.getTime() >= 6 * 86400000)
      : undefined;
    const article = articles.find((a) => a.seoArticleId === keyword.seoArticleId && !a.deletedAt);
    const brief = keyword.serpBrief as unknown as SerpBrief | CompareDataset | null;

    return {
      seoKeywordId: keyword.seoKeywordId,
      keyword: keyword.keyword,
      intent: keyword.intent,
      persona: keyword.persona,
      articleType: keyword.articleType,
      priority: keyword.priority,
      rationale: keyword.rationale,
      status: keyword.status,
      evidence: (keyword.evidence as unknown as SeoKeywordEvidence | null) ?? null,
      serpAnalyzedAt: keyword.serpAnalyzedAt?.toISOString() ?? null,
      researchSummary: !brief
        ? null
        : brief.kind === "compare"
          ? `เทียบ ${brief.brands.join(" / ")} · ${brief.rows.length} เกณฑ์ · ${brief.sources.length} แหล่งอ้างอิง`
          : `อ่านคู่แข่ง ${brief.topPages.length} หน้า · ช่องโหว่ ${brief.gaps.length} จุด`,
      article: article
        ? { seoArticleId: article.seoArticleId, title: article.title, slug: article.slug, status: article.status }
        : null,
      latestRank: latest
        ? {
            date: toDateKey(latest.date),
            position: latest.position,
            page: latest.page,
            clicks: latest.clicks,
            impressions: latest.impressions,
          }
        : null,
      previousPosition: weekBefore?.position ?? null,
      bestPosition: best.find((b) => b.seoKeywordId === keyword.seoKeywordId)?._min.position ?? null,
      history: history.slice(-28).map((rank) => ({ date: toDateKey(rank.date), position: rank.position })),
    };
  });

  return ResponsePattern.ok("ok", rows);
};
