import "server-only";

import { SeoArticleOrigin, SeoKeywordArticleType, SeoKeywordStatus } from "@prisma/client";
import prisma from "@/lib/seo/prisma";
import { generateSeoArticleFromBrief } from "../../seo-article/server/generate-seo-article-drafts.helper";
import type { SeoArticleJobRunner } from "../../seo-article/server/seo-article-job-runner.type";
import type {
  SeoKeywordResearchPayload,
  SeoWriteFromKeywordPayload,
} from "../../seo-article/type/seo-article-job-payload.type";
import { researchKeywords } from "./research-keywords.helper";
import { analyzeSerp, buildSerpBriefMessage } from "./analyze-serp.helper";
import { researchComparison } from "./research-comparison.helper";
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
 * 4. เขียนร่างด้วยตัวเขียนเดิม (Sonnet 5.5) + วาดรูปด้วยรูปสินค้าจริงจากเว็บ → ผูกบทความกับคำ + เริ่มติดตามอันดับ
 */
export const runWriteFromKeywordJob: SeoArticleJobRunner = async (job) => {
  const payload = (job.payload ?? {}) as unknown as SeoWriteFromKeywordPayload;
  const keyword = await prisma.seoKeyword.findUnique({ where: { seoKeywordId: payload.seoKeywordId } });
  if (!keyword) throw new Error("[SEO-KW-02] ไม่พบคำค้นนี้ (อาจถูกลบไปแล้ว)");

  const cached = keyword.serpBrief as unknown as SerpBrief | CompareDataset | null;
  const isFresh = keyword.serpAnalyzedAt != null && Date.now() - keyword.serpAnalyzedAt.getTime() < 14 * 86400000;
  const isCompare = keyword.articleType === SeoKeywordArticleType.COMPARE;

  let serp: SerpBrief;
  let compare: CompareDataset | undefined;
  // ผลที่เก็บก่อนมีการสกัดสไตล์การเขียน/ตารางเช่า vs ซื้อขาด ถือว่าเก่า วิเคราะห์ใหม่
  const cachedSerp = cached?.kind === "compare" ? cached.serp : cached;
  const isComplete = Boolean(cachedSerp?.writingStyle) && (!isCompare || (cached?.kind === "compare" && "buyVsRent" in cached));
  if (isFresh && isComplete && cached && (isCompare ? cached.kind === "compare" && cached.serp : cached.kind === "serp")) {
    serp = cached.kind === "compare" ? cached.serp! : cached;
    compare = cached.kind === "compare" ? cached : undefined;
  } else {
    serp = await analyzeSerp(keyword.keyword);
    if (isCompare) compare = await researchComparison(keyword.keyword, serp);
    await prisma.seoKeyword.update({
      where: { seoKeywordId: keyword.seoKeywordId },
      data: { serpBrief: (compare ?? serp) as unknown as object, serpAnalyzedAt: new Date() },
    });
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
