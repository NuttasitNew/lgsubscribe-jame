import "server-only";
import prisma from "@/lib/seo/prisma";
import { AskAnswerFaqStatus, SeoArticleStatus } from "@prisma/client";
import { catalogProductLabel, listCatalogCategories } from "../../seo-article/helper/service-subcategory.helper";
import { readAskAnswerFile } from "./read-ask-answer-file.helper";
import type { AskAnswerGrounding } from "../type/ask-answer-grounding.type";

/** ช่วงข้อมูล Search Console ที่ใช้หาคำใกล้ขึ้นหน้าแรก */
const GSC_WINDOW_DAYS = 28;
const NEAR_MISS_MIN_POSITION = 8;
const NEAR_MISS_MAX_POSITION = 30;
const MAX_NEAR_MISS = 15;
/** จำนวนรุ่นต่อหมวดที่ส่งเข้า prompt */
const MAX_PRODUCTS_PER_CATEGORY = 5;

/**
 * @description ประกอบ "แฟ้มข้อมูลจริง" ของ LG Subscribe ให้ AI ใช้คิดข้อถาม-ตอบใหม่ให้หน้า /faq
 * @logic
 * - หมวด/รุ่น/ราคาเช่ารายเดือนมาจากแคตตาล็อก; lg-jame ไม่มีข้อมูลออเดอร์/ลูกค้า/รีวิว → ตัวเลขเหล่านั้นเป็น 0/null
 *   (prompt ห้าม AI อ้างตัวเลขที่เป็น 0/null อยู่แล้ว)
 * - คำใกล้ขึ้นหน้าแรกมาจาก SeoSearchQueryDaily (Search Console)
 * - คำถามที่อยู่บนหน้า /faq แล้ว + ที่เคยเสนอ ถูกส่งไปกันซ้ำ
 */
export const buildAskAnswerGrounding = async (): Promise<AskAnswerGrounding> => {
  const gscSince = new Date(Date.now() - GSC_WINDOW_DAYS * 86400000);

  const [gscRows, publishedArticles, proposedRows, liveFile] = await Promise.all([
    prisma.seoSearchQueryDaily.groupBy({
      by: ["query"],
      where: { date: { gte: gscSince } },
      _sum: { impressions: true },
      _avg: { position: true },
    }),
    prisma.seoArticle.findMany({
      where: { status: SeoArticleStatus.PUBLISHED, deletedAt: null },
      select: { title: true, slug: true, targetKeyword: true },
      orderBy: { publishedAt: "desc" },
    }),
    // ทุกสถานะรวม REJECTED — คำถามที่เคยปัดตกก็ไม่ควรถูกเสนอซ้ำ
    prisma.askAnswerFaq.findMany({ select: { question: true, status: true } }),
    readAskAnswerFile("th").catch(() => null),
  ]);

  const categories = listCatalogCategories().map((category) => {
    const prices = category.products
      .map((product) => product.monthlyPrice)
      .filter((price): price is number => price != null);
    return {
      categoryCode: category.categoryCode,
      categoryName: category.categoryName,
      serviceCount: category.products.length,
      priceRange: prices.length > 0 ? { min: Math.min(...prices), max: Math.max(...prices) } : null,
      topServices: category.products
        .slice(0, MAX_PRODUCTS_PER_CATEGORY)
        .map((product) => ({ serviceName: catalogProductLabel(product), orderCount: 0 })),
    };
  });

  const nearMissQueries = gscRows
    .map((row) => ({
      query: row.query,
      impressions: Number(row._sum.impressions ?? 0),
      position: Math.round((row._avg.position ?? 0) * 10) / 10,
    }))
    .filter((row) => row.position >= NEAR_MISS_MIN_POSITION && row.position <= NEAR_MISS_MAX_POSITION)
    .sort((a, b) => b.impressions - a.impressions)
    .slice(0, MAX_NEAR_MISS);

  return {
    completedOrderCount: 0,
    repeatCustomerCount: 0,
    activeCustomerCount: 0,
    categories,
    topDistricts: [],
    googleReview: null,
    publishedArticles,
    adKeywords: [],
    nearMissQueries,
    liveQuestions: (liveFile?.data.faqs ?? []).map((faq) => faq.question),
    liveFaqKeys: (liveFile?.data.faqs ?? []).map((faq) => faq.id).filter(Boolean),
    proposedQuestions: proposedRows
      .filter((row) => row.status !== AskAnswerFaqStatus.PUBLISHED)
      .map((row) => row.question),
  };
};
