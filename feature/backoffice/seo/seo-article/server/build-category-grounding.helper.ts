import "server-only";
import { seoMetricWindow } from "@/lib/seo/helper/seo-metric-window";
import { aggregateSeoSearchDemand } from "@/lib/seo/helper/aggregate-seo-search-demand";
import prisma from "@/lib/seo/prisma";
import { normalizeSearchTerm } from "@/lib/seo/helper/normalize-search-term";
import { classifyServiceDemand } from "../helper/classify-service-demand.helper";
import {
  catalogProductLabel,
  findCatalogCategory,
  getServiceSubcategoryDefinitions,
  matchesServiceSubcategory,
} from "../helper/service-subcategory.helper";
import type { SeoCategoryGrounding } from "../type/category-grounding.type";

/** จำนวนรายการบริการสูงสุดที่ส่งเข้า prompt — หมวดเฟอร์นิเจอร์มี ~300 รายการ ส่งทั้งหมดจะทำ prompt บวม */
const MAX_SERVICE_NAMES = 60;
/** อายุสูงสุดของข้อมูล Keyword Planner ที่ใช้เสนอหัวข้อ */
const KEYWORD_FRESHNESS_DAYS = 60;
/** ช่วงอันดับที่นับเป็น "ใกล้ขึ้นหน้าแรก" — ต่ำกว่า 8 คือติดหน้าแรกอยู่แล้ว เกิน 30 คือไกลเกินกว่าจะดันไหว */
const NEAR_MISS_MIN_POSITION = 8;
const NEAR_MISS_MAX_POSITION = 30;
/** จำนวนคำ near-miss สูงสุดที่ส่งเข้า prompt */
const MAX_NEAR_MISS = 15;
/** ยอดแสดงผลขั้นต่ำที่ถือว่า "มีคนค้นจริง" — ต่ำกว่านี้เป็นหางยาวที่เขียนบทความทั้งเรื่องไม่คุ้ม */
const MIN_SEARCH_IMPRESSIONS = 30;
/** จำนวนคำใน "ความต้องการจากการค้นหา" สูงสุดที่ส่งเข้า prompt */
const MAX_SEARCH_DEMAND = 60;


/**
 * @description ประกอบ "แฟ้มข้อมูลจริง" ของหมวดสินค้า LG หนึ่งหมวดให้ AI ใช้คิดหัวข้อ/เขียนบทความ
 * @logic
 * - รุ่น/ราคาเช่ารายเดือน/จุดเด่น/วิธีเลือก มาจากแคตตาล็อก (lib/product-knowledge.ts, lib/catalog-products.ts)
 * - คำค้นจริงมาจาก Search Console (SeoSearchQueryDaily) + Keyword Planner (SeoKeywordIdea)
 * - ไม่มีข้อมูลออเดอร์/เขต/คำค้นโฆษณาใน lg-jame — ช่องเหล่านั้นเป็น array ว่าง
 */
export const buildCategoryGrounding = async (
  categoryCode: string,
  subcategoryNames?: string[]
): Promise<SeoCategoryGrounding | null> => {
  const category = findCatalogCategory(categoryCode);
  if (!category) return null;

  const latest = await prisma.seoSearchQueryDaily.aggregate({ _max: { date: true } });
  const gscWindow = seoMetricWindow(latest._max.date);

  const normalizedSubcategoryNames = [...new Set((subcategoryNames ?? []).map((name) => name.trim()).filter(Boolean))];
  const allSubcategoryDefinitions = getServiceSubcategoryDefinitions(categoryCode);
  const selectedDefinitions = normalizedSubcategoryNames
    .map((name) => allSubcategoryDefinitions.find((definition) => definition.subcategoryName === name))
    .filter((definition): definition is NonNullable<typeof definition> => definition != null);
  if (selectedDefinitions.length !== normalizedSubcategoryNames.length) return null;

  const products =
    selectedDefinitions.length > 0
      ? category.products.filter((product) =>
          selectedDefinitions.some((definition) => matchesServiceSubcategory(catalogProductLabel(product), definition))
        )
      : category.products;

  const [gscRows, articles, plannerIdeas] = await Promise.all([
    prisma.seoSearchQueryDaily.findMany({
      where: { date: { gte: gscWindow.start, lte: gscWindow.end } },
      select: { query: true, impressions: true, position: true },
    }),
    // ทุกสถานะรวม REJECTED — หัวข้อที่เคยปัดตกก็ไม่ควรถูกเสนอซ้ำ
    prisma.seoArticle.findMany({ select: { title: true, targetKeyword: true, keywords: true, deletedAt: true } }),
    prisma.seoKeywordIdea.findMany({
      where: {
        categoryCodes: { has: categoryCode },
        syncedAt: { gte: new Date(Date.now() - KEYWORD_FRESHNESS_DAYS * 86400000) },
      },
      select: { keyword: true, avgMonthlySearches: true, competition: true, syncedAt: true },
      orderBy: { avgMonthlySearches: "desc" },
      take: MAX_SEARCH_DEMAND,
    }),
  ]);

  // --- ช่วงราคาเช่ารายเดือน (null = ไม่มีราคาเริ่มต้นที่ยืนยันได้ ห้ามให้ AI พูดถึงราคา) ---
  const prices = products.map((product) => product.monthlyPrice).filter((price): price is number => price != null);
  const priceRange = prices.length > 0 ? { min: Math.min(...prices), max: Math.max(...prices) } : null;

  const takenKeywords = new Set(
    articles
      .filter((a) => a.deletedAt == null)
      .map((a) => normalizeSearchTerm(a.targetKeyword || a.keywords[0] || ""))
      .filter(Boolean) as string[]
  );

  // lg-jame ยังไม่มีตารางคำค้นจาก Google Ads — ใช้เฉพาะสัญญาณออร์แกนิกจาก Search Console
  const demandRows = aggregateSeoSearchDemand([], gscRows, takenKeywords);
  const nearMissQueries = demandRows
    .filter(
      (row) =>
        row.organicPosition != null &&
        row.organicPosition >= NEAR_MISS_MIN_POSITION &&
        row.organicPosition <= NEAR_MISS_MAX_POSITION
    )
    .map((row) => ({ query: row.keyword, impressions: row.impressions, position: row.organicPosition! }))
    .sort((a, b) => b.impressions - a.impressions)
    .slice(0, MAX_NEAR_MISS);

  // ไม่มียอดขายต่อรุ่น — ทุกรุ่นเป็น UNTAPPED แล้วเรียงตามราคา (รุ่นแพงขึ้นก่อน)
  const serviceDemand = classifyServiceDemand(
    products.map((product) => ({
      serviceName: catalogProductLabel(product),
      orderCount: 0,
      servicePrice: product.monthlyPrice,
    }))
  );

  const searchDemand = demandRows
    .filter((row) => row.impressions >= MIN_SEARCH_IMPRESSIONS)
    .sort((a, b) => b.impressions - a.impressions)
    .slice(0, MAX_SEARCH_DEMAND);

  return {
    categoryCode: category.categoryCode,
    categoryName: category.categoryName,
    ...(normalizedSubcategoryNames.length > 0 ? { subcategoryNames: normalizedSubcategoryNames } : {}),
    serviceNames: products.map(catalogProductLabel).slice(0, MAX_SERVICE_NAMES),
    productGuide: {
      summary: category.guide.summary,
      highlights: category.guide.highlights,
      selectionCriteria: category.guide.selectionCriteria,
      installation: category.guide.installation,
      care: category.guide.care,
    },
    priceRange,
    topOrderedServices: [],
    serviceDemand,
    searchDemand,
    plannerIdeas: plannerIdeas.map((idea) => ({
      ...idea,
      keyword: normalizeSearchTerm(idea.keyword),
      syncedAt: idea.syncedAt.toISOString(),
    })),
    adKeywords: [],
    nearMissQueries,
    topDistricts: [],
    existingTitles: articles.map((a) => a.title),
    existingKeywords: [...takenKeywords],
  };
};
