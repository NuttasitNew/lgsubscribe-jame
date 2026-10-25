import "server-only";

import { SeoArticleJobType, SeoArticleOrigin, SeoKeywordArticleType, SeoKeywordStatus } from "@prisma/client";
import prisma from "@/lib/seo/prisma";
import { enqueueSeoArticleJob } from "../../seo-article/server/enqueue-seo-article-job.helper";
import { generateSeoArticleFromBrief } from "../../seo-article/server/generate-seo-article-drafts.helper";
import type { SeoArticleJobRunner } from "../../seo-article/server/seo-article-job-runner.type";
import type {
  SeoKeywordResearchPayload,
  SeoWriteFromKeywordPayload,
} from "../../seo-article/type/seo-article-job-payload.type";
import { researchKeywords } from "./research-keywords.helper";
import { analyzeSerp, buildSerpBriefMessage } from "./analyze-serp.helper";
import { applySourcePolicy, researchComparison } from "./research-comparison.helper";
import { buildSiteContext } from "./build-site-context.helper";
import type { CompareDataset, SerpBrief } from "../type/seo-keyword.type";

/**
 * @description runner ของงาน RESEARCH_KEYWORDS — AI ตัวแรก: หาคำค้นของกลุ่มลูกค้า แล้วบันทึกเป็นข้อเสนอ (PROPOSED)
 * @used-by {@link ../../seo-article/server/run-seo-article-job.helper.ts}
 */
export const runResearchKeywordsJob: SeoArticleJobRunner = async (job) => {
  const payload = (job.payload ?? {}) as SeoKeywordResearchPayload;
  const result = await researchKeywords({
    requestedBy: job.requestedBy,
    ...(payload.focus ? { focus: payload.focus } : {}),
  });
  if (result.created === 0) {
    throw new Error(`[SEO-KW-01] AI ไม่ได้เสนอคำใหม่ (ซ้ำกับที่มีแล้ว ${result.skipped} คำ) — ลองระบุโฟกัสเป็นหมวดสินค้า`);
  }
  return { title: `ได้คำค้นใหม่ ${result.created} คำ` };
};

/**
 * @description runner ของงาน WRITE_FROM_KEYWORD — AI ตัวที่สอง: อ่านบทความอันดับต้น ๆ → หาช่องโหว่ → (เก็บข้อมูลตารางเทียบ) → เขียนร่าง
 * @logic
 * 1. analyzeSerp: ค้น Google จริง อ่านหน้าอันดับต้น สรุปช่องโหว่ + ข้อเท็จจริงที่มี URL ยืนยัน
 * 2. คำแบบ COMPARE → researchComparison เก็บตารางเทียบแบรนด์ที่ทุกช่องมีแหล่งยืนยัน
 * 3. บันทึกผล research ลง SeoKeyword.serpBrief ก่อนเขียน — ถ้าขั้นเขียนพัง ไม่ต้องจ่ายค่าค้นเว็บใหม่ในรอบหน้า
 *    (ผล research อายุไม่เกิน 14 วันใช้ซ้ำได้)
 * - บทความ COMPARE แยกเป็น 3 งานต่อกัน (อ่านคู่แข่ง → ตารางเทียบ → เขียน) แต่ละงานได้ function invocation ของตัวเอง
 *   เพราะรวมกันราว 13 นาที เกินเพดาน 800 วินาทีต่อการเรียกของ Vercel — งานถัดไปอ่านผลที่บันทึกไว้แล้วทำขั้นที่เหลือ
 * 4. เขียนร่างด้วยตัวเขียนเดิม (Sonnet 5.5) + วาดรูปด้วยรูปสินค้าจริงจากเว็บ → ผูกบทความกับคำ + เริ่มติดตามอันดับ
 */
export const runWriteFromKeywordJob: SeoArticleJobRunner = async (job) => {
  const payload = (job.payload ?? {}) as unknown as SeoWriteFromKeywordPayload;
  const keyword = await prisma.seoKeyword.findUnique({ where: { seoKeywordId: payload.seoKeywordId } });
  if (!keyword) throw new Error("[SEO-KW-02] ไม่พบคำค้นนี้ (อาจถูกลบไปแล้ว)");

  const cached = keyword.serpBrief as unknown as SerpBrief | CompareDataset | null;
  const isFresh = keyword.serpAnalyzedAt != null && Date.now() - keyword.serpAnalyzedAt.getTime() < 14 * 86400000;
  const isCompare = keyword.articleType === SeoKeywordArticleType.COMPARE;
  // ผลที่เก็บก่อนมีการสกัดสไตล์การเขียน/ตารางเช่า vs ซื้อขาด ถือว่าเก่า วิเคราะห์ใหม่
  const cachedSerp = cached?.kind === "compare" ? cached.serp : cached?.kind === "serp" ? cached : undefined;
  const usableSerp = isFresh && cachedSerp?.writingStyle ? cachedSerp : undefined;
  const usableCompare =
    usableSerp && cached?.kind === "compare" && "buyVsRent" in cached ? applySourcePolicy(cached) : undefined;

  const saveBrief = (brief: SerpBrief | CompareDataset) =>
    prisma.seoKeyword.update({
      where: { seoKeywordId: keyword.seoKeywordId },
      data: { serpBrief: brief as unknown as object, serpAnalyzedAt: new Date() },
    });

  // ขั้น 1: อ่านคู่แข่ง (~2 นาที) — บทความเทียบต้องเก็บตารางต่ออีก ~9 นาที จึงแยกไปงานถัดไปให้ได้เวลาของตัวเอง
  let serp = usableSerp;
  if (!serp) {
    serp = await analyzeSerp(keyword.keyword);
    await saveBrief(serp);
    if (isCompare) return queueNextStage(job, keyword.keyword, "อ่านบทความคู่แข่งแล้ว — ต่อคิวเก็บข้อมูลตารางเทียบ");
  }

  // ขั้น 2 (เฉพาะ COMPARE): เก็บข้อมูลตารางเทียบแบรนด์ + เช่า vs ซื้อขาด แล้วต่อคิวขั้นเขียน
  let compare = isCompare ? usableCompare : undefined;
  if (isCompare && !compare) {
    compare = await researchComparison(keyword.keyword, serp);
    await saveBrief(compare);
    return queueNextStage(job, keyword.keyword, "เก็บข้อมูลตารางเทียบแล้ว — ต่อคิวเขียนบทความ");
  }

  const { products } = buildSiteContext();
  const productImagePaths = serp.productSlugs
    .map((slug) => products.find((product) => product.slug === slug)?.image)
    .filter((path): path is string => Boolean(path))
    .slice(0, 2);

  const created = await generateSeoArticleFromBrief({
    brief: {
      promptBrief:
        `[จาก keyword research] เขียนบทความเพื่อเล่นคำค้น "${keyword.keyword}" ` +
        `สำหรับกลุ่มลูกค้า: ${keyword.persona ?? "ผู้สนใจเช่าเครื่องใช้ไฟฟ้า LG"} (intent: ${keyword.intent})` +
        (isCompare ? " — เป็นบทความเปรียบเทียบแบบมีตาราง" : ""),
      targetKeyword: keyword.keyword,
      ...(isCompare ? { category: "buyingGuide" as const } : {}),
      researchBrief: buildSerpBriefMessage(serp),
      ...(compare ? { compare } : {}),
    },
    generateImages: job.generateImages,
    requestedBy: job.requestedBy,
    productImagePaths,
    origin: SeoArticleOrigin.MANUAL,
  });

  await prisma.seoKeyword.update({
    where: { seoKeywordId: keyword.seoKeywordId },
    data: { seoArticleId: created.seoArticleId, status: SeoKeywordStatus.TRACKING },
  });

  return { seoArticleId: created.seoArticleId, title: created.title };
};

/** ต่อคิวขั้นถัดไปของคำเดียวกัน (งานใหม่ = function invocation ใหม่) แล้วปิดงานนี้ว่าเสร็จขั้นของมัน */
const queueNextStage = async (
  job: Parameters<SeoArticleJobRunner>[0],
  keyword: string,
  title: string
): Promise<Awaited<ReturnType<SeoArticleJobRunner>>> => {
  await enqueueSeoArticleJob({
    jobType: SeoArticleJobType.WRITE_FROM_KEYWORD,
    label: keyword,
    requestedBy: job.requestedBy,
    generateImages: job.generateImages,
    payload: job.payload as unknown as SeoWriteFromKeywordPayload,
  });
  return { title };
};
