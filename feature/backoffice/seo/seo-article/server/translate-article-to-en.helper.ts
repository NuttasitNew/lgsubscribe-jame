import "server-only";
import { generateObject } from "ai";
import { z } from "zod";
import { AiUsageFeature } from "@prisma/client";
import { trackAiUsage } from "@/lib/ai/usage/track-ai-usage";
import { getSeoArticleAi } from "./seo-article-ai-model";
import { collectArticleTextUnits } from "../helper/article-text-units.helper";
import { applyArticleTextUnits } from "../helper/apply-article-text-units.helper";
import type { SeoArticleBlockContent } from "../type/seo-article-block.type";

/** ผลการแปลบทความเป็นอังกฤษ — ครบชุดพอที่จะเสิร์ฟ /en/blog/<slug> ได้เลย */
export interface TranslateArticleToEnResult {
  titleEn: string;
  metaDescriptionEn: string;
  keywordsEn: string[];
  contentEn: SeoArticleBlockContent;
  /** จุดที่ต้องให้คนดู (เช่น AI แปลข้อความไม่ครบ) — ผู้เรียกเอาไป log */
  warnings: string[];
}

/**
 * schema ของ structured output
 *
 * ⚠️ Anthropic ไม่รองรับ `minItems` > 1 → ห้ามใช้ `.min(n)` ที่ n > 1 บน array ในไฟล์นี้
 * (บทเรียนเดียวกับ {@link ./write-seo-article.helper.ts})
 */
const translationSchema = z.object({
  titleEn: z.string().describe("ชื่อบทความภาษาอังกฤษ 40-65 ตัวอักษร เป็นภาษาที่คนอังกฤษอ่านแล้วเป็นธรรมชาติ"),
  metaDescriptionEn: z.string().describe("meta description ภาษาอังกฤษ 120-155 ตัวอักษร"),
  keywordsEn: z.array(z.string()).describe("คำค้นภาษาอังกฤษ 4-6 คำ ที่คนต่างชาติในไทยใช้ค้นจริง"),
  texts: z
    .array(z.string())
    .describe("ข้อความที่แปลแล้ว เรียงตามลำดับเดิมและมีจำนวนเท่ากับที่ส่งไปทุกชิ้น ห้ามรวบหรือข้ามชิ้นไหน"),
});

const SYSTEM_PROMPT = `You translate LG Subscribe's Thai blog posts into English.

LG Subscribe offers monthly subscription (rental) of LG home appliances in Thailand — air conditioners, air purifiers, dehumidifiers, dishwashers, fridges, washers and more — with LG technician care at home per the contract terms. Customers contact them on LINE @lgsubscribe.

Rules:
- Translate meaning, not word-for-word. The result must read like it was written in English by someone who knows home appliances and subscription services.
- Keep every number, price, measurement, duration and model name exactly as in the Thai original. Never invent or round them.
- Keep "LG Subscribe", "LG", product model codes and "LINE @lgsubscribe" unchanged.
- Do not add claims that are not in the Thai text (no customer counts, review scores, awards or guaranteed approval).
- You receive a numbered list of text fragments. Return exactly the same number of fragments, in the same order.
  A fragment may be a sentence, a fragment of a sentence, a table cell, or an image caption — translate each one on its own.
- Never merge, split, reorder, drop or add fragments. An empty fragment stays empty.
- Plain text only: no HTML, no markdown, no quotation marks added around fragments.`;

/**
 * @description แปลบทความไทยทั้งเรื่องเป็นอังกฤษ — คืน meta EN + เนื้อหาโครงเดิมที่แปลแล้ว
 * @logic
 * - ให้ AI แตะเฉพาะ "ข้อความ" ผ่านรายการชิ้นส่วนที่ numbered ไว้ ส่วนโครงบล็อก/รูป/ลิงก์/ตัวหนา
 *   ประกอบกลับด้วยโค้ด — โครงบทความ EN จึงตรงกับไทย 1:1 เสมอ ไม่มีบล็อกหายหรือรูปหลุด
 * - **จำนวนชิ้นที่คืนไม่เท่าที่ส่งไป = throw [SEO-EN-TR-01] ไม่ส่งค่าออกเด็ดขาด** เพราะการประกอบกลับ
 *   อ่านตามตำแหน่ง ถ้า AI รวบ/แตก/ข้ามชิ้นกลางทาง ทุกชิ้นหลังจากนั้นจะเลื่อนไปลงบล็อกผิด
 *   (บทความ EN ที่ย่อหน้าสลับที่ = พังทั้งเรื่อง และเขียนทับฉบับ EN เดิมที่ดีอยู่แล้ว)
 *   ผู้เรียกทั้งสองทางรับมือได้: ตอนสร้างบทความ catch แล้วข้าม EN, ปุ่มอัปเดต EN คืน error ไม่แตะฐาน
 * - บทความไม่มีข้อความเลย (โครงว่าง) ก็ยังแปล title/meta/keywords ให้ตามปกติ
 * @param params บทความฉบับไทยทั้งชุด
 * @returns meta EN + contentEn + warnings
 * @used-by {@link ./translate-seo-article-en.action.ts}, {@link ./write-seo-article.helper.ts}
 * @related {@link ../helper/article-text-units.helper.ts}
 */
export const translateArticleToEn = async (params: {
  title: string;
  metaDescription: string;
  keywords: string[];
  content: SeoArticleBlockContent;
}): Promise<TranslateArticleToEnResult> => {
  const units = collectArticleTextUnits(params.content);
  const warnings: string[] = [];

  const numbered = units.map((text, index) => `${index + 1}. ${text}`).join("\n");

  const resolvedModel = getSeoArticleAi("translateArticle");
  const aiStartedAt = Date.now();
  const { object, usage } = await generateObject({
    model: resolvedModel.model,
    schema: translationSchema,
    providerOptions: resolvedModel.providerOptions,
    system: SYSTEM_PROMPT,
    prompt: [
      `Thai title: ${params.title}`,
      `Thai meta description: ${params.metaDescription}`,
      `Thai keywords: ${params.keywords.join(", ")}`,
      "",
      `Below are ${units.length} text fragments from the article body. Return exactly ${units.length} translated fragments in \`texts\`, in this order:`,
      numbered,
    ].join("\n"),
  });
  void trackAiUsage({
    feature: AiUsageFeature.SEO_ARTICLE_TRANSLATE,
    provider: resolvedModel.provider,
    model: resolvedModel.modelId,
    usage,
    startedAt: aiStartedAt,
  });

  // จำนวนชิ้นไม่เท่ากัน = AI รวบ/แตก/ข้ามชิ้น → การประกอบกลับเป็นแบบ "ตำแหน่งต่อตำแหน่ง"
  // จะเลื่อนทั้งบทความตั้งแต่จุดที่เพี้ยน (ย่อหน้าไปโผล่ผิดที่ หัวข้อกลายเป็นเนื้อ) ไม่ใช่แค่ "ขาดบางช่อง"
  // → แปลไม่ครบ = ห้ามส่งค่าออก ให้ผู้เรียกตัดสินใจ (สร้างบทความ = ข้าม EN, ปุ่มอัปเดต EN = ไม่เขียนทับของเดิม)
  if (object.texts.length !== units.length) {
    throw new Error(
      `[SEO-EN-TR-01] AI คืนข้อความ ${object.texts.length} ชิ้น แต่ส่งไป ${units.length} ชิ้น — ไม่บันทึกคำแปลที่ตำแหน่งเลื่อน ลองกดแปลใหม่อีกครั้ง`
    );
  }

  return {
    titleEn: object.titleEn.trim(),
    metaDescriptionEn: object.metaDescriptionEn.trim(),
    keywordsEn: object.keywordsEn.map((keyword) => keyword.trim()).filter((keyword) => keyword.length > 0),
    contentEn: applyArticleTextUnits(params.content, object.texts),
    warnings,
  };
};
