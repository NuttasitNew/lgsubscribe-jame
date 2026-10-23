import prisma from "@/lib/seo/prisma";
import { Prisma } from "@prisma/client";
import {
  listCatalogCategories,
  type CatalogCategory,
} from "@/feature/backoffice/seo/seo-article/helper/service-subcategory.helper";
import { enums, services } from "google-ads-api";
import { normalizeSearchTerm } from "@/lib/seo/helper/normalize-search-term";
import { getGoogleAdsCustomer, getGoogleAdsCustomerId } from "./client";
import { describeGoogleAdsError } from "./describe-google-ads-error";

/** ผลรอบ sync คลังคำค้นจาก Keyword Planner */
export interface SyncKeywordIdeasResult {
  status: "SUCCESS" | "PARTIAL" | "FAILED";
  categories: number; // จำนวนหมวดที่ยิงสำเร็จ
  keywords: number; // จำนวนคำที่ upsert ลงตาราง
  failedCategories: { categoryCode: string; message: string }[];
}

/** ภาษาไทย — languageConstants ของ Google Ads (ไทย = 1044) */
const LANGUAGE_THAI = "languageConstants/1044";
/** ประเทศไทย — geoTargetConstants (ไทย = 2764) */
const GEO_THAILAND = "geoTargetConstants/2764";
/** จำนวน seed สูงสุดต่อ 1 request — Google จำกัดที่ 20 คำ */
const MAX_SEEDS = 20;
/** ยอดค้นหาขั้นต่ำที่เก็บลงตาราง — ต่ำกว่านี้เป็นหางยาวที่เอาไปตัดสินใจอะไรไม่ได้ */
const MIN_AVG_SEARCHES = 10;
/** จำนวนคำสูงสุดที่เก็บต่อหมวด — Google คืนมาได้หลักหมื่น ซึ่งเกินความจำเป็น */
const MAX_IDEAS_PER_CATEGORY = 500;

/** micros → บาท (Google เก็บเงินเป็นหน่วยล้านส่วน) */
const microsToBaht = (v: unknown): number | null => {
  if (v === null || v === undefined || v === "") return null;
  const n = Number(v);
  if (!Number.isFinite(n)) return null;
  return Math.round((n / 1_000_000) * 100) / 100;
};

const toInt = (v: unknown): number => {
  const n = Number(v ?? 0);
  return Number.isFinite(n) ? Math.trunc(n) : 0;
};

/**
 * enum จาก google-ads-api → ชื่อที่อ่านได้
 * library คืนได้ทั้งตัวเลข (โหมด gRPC) และชื่อ enum เป็น string (โหมด REST) แล้วแต่ endpoint
 * — ต้องรับทั้งสองแบบ ไม่งั้นโหมดหนึ่งจะได้ "UNSPECIFIED" ทั้งตารางโดยไม่มี error ให้เห็น
 */
const enumName = (enumObj: Record<number, string>, v: unknown): string => {
  if (v === null || v === undefined) return "UNSPECIFIED";
  if (typeof v === "string" && !/^\d+$/.test(v)) return v;
  return enumObj[Number(v)] ?? "UNSPECIFIED";
};

/** 1 เดือนของยอดค้นหาย้อนหลัง — เก็บลง monthlyVolumes (Json) */
interface MonthlyVolume {
  year: number;
  month: string; // ชื่อเดือนภาษาอังกฤษจาก enum ของ Google เช่น "JANUARY"
  searches: number;
}

/** 1 คำค้นที่ผ่านการแปลง/คัดกรองแล้ว พร้อมเขียนลง SeoKeywordIdea */
export interface MappedKeywordIdea {
  keyword: string;
  avgMonthlySearches: number;
  competition: string;
  competitionIndex: number | null;
  lowTopOfPageBidBaht: number | null;
  highTopOfPageBidBaht: number | null;
  monthlyVolumes: MonthlyVolume[];
}

/** รูปร่างเท่าที่เราใช้จาก response ของ Keyword Planner (protobuf จริงมี field เยอะกว่านี้มาก) */
interface RawKeywordIdea {
  text?: string | null;
  keyword_idea_metrics?: {
    avg_monthly_searches?: number | string | null;
    competition?: number | string | null;
    competition_index?: number | string | null;
    low_top_of_page_bid_micros?: number | string | null;
    high_top_of_page_bid_micros?: number | string | null;
    monthly_search_volumes?:
      | { year?: number | string | null; month?: number | string | null; monthly_searches?: number | string | null }[]
      | null;
  } | null;
}

/**
 * @description แปลงผลดิบจาก Keyword Planner → แถวที่พร้อมเขียนลงฐาน พร้อมคัดกรองและจำกัดจำนวน (pure)
 * @logic
 * - normalize คำก่อนเสมอ: Google คืนคำไทยแบบมีช่องว่างคั่น ถ้าไม่ยุบจะจับคู่กับ
 *   GoogleAdsSearchTermDaily / SeoSearchQueryDaily ไม่ติดเลย = เทียบอันดับจริงไม่ได้
 * - ตัดคำที่ยอด < MIN_AVG_SEARCHES ทิ้ง — Google ปัดยอดต่ำเป็น 0 ซึ่งแยกไม่ออกระหว่าง
 *   "ไม่มีคนค้น" กับ "มีคนค้นแต่ Google ไม่บอก" เก็บไว้จะกลายเป็นหลักฐานปลอมให้ AI อ้าง
 * - เรียงยอดมาก→น้อยก่อนตัดที่ MAX_IDEAS_PER_CATEGORY เสมอ — ถ้าตัดก่อนเรียงจะได้คำหางยาว
 *   ตามลำดับที่ Google ส่งมา แล้วคำที่ค้นเยอะที่สุดหลุดหายทั้งที่เป็นตัวที่ต้องการที่สุด
 * - คำซ้ำหลัง normalize เก็บตัวที่ยอดสูงกว่า (Google คืน "ซัก โซฟา" กับ "ซักโซฟา" แยกกันได้)
 * @param results ผลดิบจาก generateKeywordIdeas
 * @returns คำที่ผ่านเกณฑ์ เรียงยอดมาก→น้อย
 * @used-by {@link syncKeywordIdeas}
 */
export const mapKeywordIdeas = (results: RawKeywordIdea[]): MappedKeywordIdea[] => {
  const byKeyword = new Map<string, MappedKeywordIdea>();

  for (const idea of results) {
    const metrics = idea.keyword_idea_metrics;
    const keyword = normalizeSearchTerm(idea.text ?? "");
    if (!keyword) continue;

    const avgMonthlySearches = toInt(metrics?.avg_monthly_searches);
    if (avgMonthlySearches < MIN_AVG_SEARCHES) continue;

    const existing = byKeyword.get(keyword);
    if (existing && existing.avgMonthlySearches >= avgMonthlySearches) continue;

    byKeyword.set(keyword, {
      keyword,
      avgMonthlySearches,
      competition: enumName(enums.KeywordPlanCompetitionLevel, metrics?.competition),
      competitionIndex: metrics?.competition_index != null ? toInt(metrics.competition_index) : null,
      lowTopOfPageBidBaht: microsToBaht(metrics?.low_top_of_page_bid_micros),
      highTopOfPageBidBaht: microsToBaht(metrics?.high_top_of_page_bid_micros),
      monthlyVolumes: (metrics?.monthly_search_volumes ?? []).map<MonthlyVolume>((m) => ({
        year: toInt(m.year),
        month: enumName(enums.MonthOfYear, m.month),
        searches: toInt(m.monthly_searches),
      })),
    });
  }

  return [...byKeyword.values()]
    .sort((a, b) => b.avgMonthlySearches - a.avgMonthlySearches)
    .slice(0, MAX_IDEAS_PER_CATEGORY);
};

/**
 * @description ประกอบ seed keyword ของหมวดสินค้า LG จากชื่อหมวด + รุ่นในแคตตาล็อก
 * @logic ชื่อหมวด (เช่น "เครื่องกรองน้ำ") + "เช่า <หมวด>" + "<หมวด> LG" + รหัสรุ่น — ตัดซ้ำหลัง normalize
 */
const buildCategorySeeds = (category: CatalogCategory): string[] => {
  const seeds: string[] = [];
  const seen = new Set<string>();
  const push = (raw: string) => {
    const keyword = normalizeSearchTerm(raw);
    if (!keyword || seen.has(keyword) || seeds.length >= MAX_SEEDS) return;
    seen.add(keyword);
    seeds.push(keyword);
  };
  push(category.categoryName);
  push(`เช่า${category.categoryName}`);
  push(`${category.categoryName} LG`);
  push(`ผ่อน${category.categoryName}`);
  for (const product of category.products) push(`LG ${product.model}`);
  return seeds;
};

export const syncKeywordIdeas = async (options?: { categoryCodes?: string[] }): Promise<SyncKeywordIdeasResult> => {
  const categories = listCatalogCategories().filter(
    (category) => !options?.categoryCodes?.length || options.categoryCodes.includes(category.categoryCode)
  );

  if (categories.length === 0) {
    throw new Error("[GADS-KWI-01] ไม่พบหมวดบริการในฐานข้อมูล — sync คำค้นไม่ได้");
  }

  const customer = getGoogleAdsCustomer();
  const customerId = getGoogleAdsCustomerId();
  const syncedAt = new Date();

  let keywords = 0;
  let okCategories = 0;
  const failedCategories: { categoryCode: string; message: string }[] = [];

  for (const category of categories) {
    try {
      const seeds = buildCategorySeeds(category);
      if (seeds.length === 0) {
        failedCategories.push({ categoryCode: category.categoryCode, message: "ไม่มี seed keyword (หมวดว่าง)" });
        continue;
      }

      // cast: type ของ request เป็น protobuf message ที่บังคับครบทุก field (page_token/toJSON ฯลฯ)
      // ทั้งที่ API รับเฉพาะ field ที่ส่งไปจริง — ตามแนวเดียวกับ mutate.ts
      const response = await customer.keywordPlanIdeas.generateKeywordIdeas({
        customer_id: customerId,
        language: LANGUAGE_THAI,
        geo_target_constants: [GEO_THAILAND],
        keyword_plan_network: enums.KeywordPlanNetwork.GOOGLE_SEARCH,
        include_adult_keywords: false,
        keyword_seed: { keywords: seeds },
      } as unknown as services.GenerateKeywordIdeasRequest);

      const ideas = mapKeywordIdeas(response.results ?? []);

      for (const idea of ideas) {
        // Prisma Json รับ InputJsonValue ซึ่ง interface ที่ประกาศเองเข้าไม่ได้ (ไม่มี index signature)
        const monthlyVolumes = idea.monthlyVolumes as unknown as Prisma.InputJsonValue;

        const existing = await prisma.seoKeywordIdea.findUnique({
          where: { keyword: idea.keyword },
          select: { categoryCodes: true },
        });
        const categoryCodes = existing?.categoryCodes.includes(category.categoryCode)
          ? existing.categoryCodes
          : [...(existing?.categoryCodes ?? []), category.categoryCode];

        await prisma.seoKeywordIdea.upsert({
          where: { keyword: idea.keyword },
          create: {
            keyword: idea.keyword,
            avgMonthlySearches: idea.avgMonthlySearches,
            competition: idea.competition,
            competitionIndex: idea.competitionIndex,
            lowTopOfPageBidBaht: idea.lowTopOfPageBidBaht,
            highTopOfPageBidBaht: idea.highTopOfPageBidBaht,
            monthlyVolumes,
            categoryCodes,
            syncedAt,
          },
          update: {
            avgMonthlySearches: idea.avgMonthlySearches,
            competition: idea.competition,
            competitionIndex: idea.competitionIndex,
            lowTopOfPageBidBaht: idea.lowTopOfPageBidBaht,
            highTopOfPageBidBaht: idea.highTopOfPageBidBaht,
            monthlyVolumes,
            categoryCodes,
            syncedAt,
          },
        });
        keywords++;
      }

      okCategories++;
      console.log(`[GADS-KWI] ${category.categoryCode} seeds=${seeds.length} ideas=${ideas.length}`);
    } catch (error) {
      const message = describeGoogleAdsError(error);
      console.error(`[GADS-KWI-02] หมวด ${category.categoryCode} sync ไม่สำเร็จ:`, message);
      failedCategories.push({ categoryCode: category.categoryCode, message });
      // Account-wide planning access cannot improve by retrying every category; avoid quota noise.
      if (/DEVELOPER_TOKEN_NOT_APPROVED|not allowed for use with explorer access/i.test(message)) break;
    }
  }

  const status = okCategories === 0 ? "FAILED" : failedCategories.length > 0 ? "PARTIAL" : "SUCCESS";
  return { status, categories: okCategories, keywords, failedCategories };
};
