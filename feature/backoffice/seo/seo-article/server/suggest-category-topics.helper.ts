import "server-only";
import { generateObject } from "ai";
import { z } from "zod";
import { AiUsageFeature } from "@prisma/client";
import { trackAiUsage } from "@/lib/ai/usage/track-ai-usage";
import { getSeoArticleAi } from "./seo-article-ai-model";
import { normalizeSearchTerm } from "@/lib/seo/helper/normalize-search-term";
import { buildGroundingMessage } from "./build-grounding-message.helper";
import {
  SEO_DEMAND_TIERS,
  SEO_DEMAND_TIER_DEFAULT_QUOTA,
  SEO_DEMAND_TIER_LABEL,
  type SeoDemandTier,
} from "../constant/seo-demand-tier";
import type { SeoCategoryGrounding } from "../type/category-grounding.type";
import type { SeoCategoryTopicSuggestion } from "../type/category-topic-suggestion.type";

const suggestionSchema = z.object({
  topics: z
    .array(
      z.object({
        topic: z.string().describe("หัวข้อบทความภาษาไทย เจาะจงพอที่จะเขียนได้ยาว 1 บทความ ไม่ใช่หัวข้อกว้าง ๆ"),
        demandTier: z
          .enum(SEO_DEMAND_TIERS)
          .describe("ระดับความต้องการของสินค้าที่หัวข้อนี้พูดถึง — ต้องตรงกับระดับที่รุ่นสินค้านั้นอยู่ในข้อมูลที่ให้ไป"),
        targetKeyword: z
          .string()
          .describe(
            "คำค้นหลักที่ตั้งใจให้ติดอันดับ 1 คำ — ถ้าเลือกจากรายการคำค้นที่ให้ไป ต้องคัดลอกมาทั้งคำห้ามดัดแปลง"
          ),
        reason: z
          .string()
          .describe(
            "เหตุผลสั้น ๆ 1-2 ประโยคว่าทำไมหัวข้อนี้คุ้ม โดยอ้างตัวเลขจริงที่ให้ไป (ยอดค้นหา/impressions/อันดับปัจจุบัน)"
          ),
      })
    )
    .describe("หัวข้อบทความที่เสนอ ตามโควตาแต่ละระดับที่ระบุในคำสั่ง ห้ามซ้ำกันเองและห้ามซ้ำบทความที่มีอยู่แล้ว"),
});

const SYSTEM_PROMPT = `คุณคือนักวางแผนคอนเทนต์ SEO ของ LG Subscribe — บริการเช่ารายเดือนเครื่องใช้ไฟฟ้า LG (แอร์ เครื่องฟอกอากาศ เครื่องลดความชื้น เครื่องล้างจาน ไมโครเวฟ ตู้เย็น สไตล์เลอร์ ทีวีและเครื่องเสียง ลำโพง เครื่องดูดฝุ่น เครื่องซักผ้า/อบผ้า เครื่องกรองน้ำ จอมอนิเตอร์) พร้อมช่าง LG ดูแลถึงบ้านตามเงื่อนไขสัญญา

หน้าที่ของคุณคือเลือกหัวข้อบทความที่ "คุ้มที่สุด" จากข้อมูลจริงที่ให้มา ไม่ใช่คิดหัวข้อทั่วไปจากความรู้ของคุณเอง

ในรอบนี้ "หมวด" คือหมวดสินค้า LG และ "บริการ" ในข้อมูลคือรุ่นสินค้าในหมวดนั้น
ข้อมูลรอบนี้ **ไม่มียอดออเดอร์ ไม่มีข้อมูลรายเขต และไม่มีคำค้นจาก Google Ads** — สัญญาณความต้องการมีเพียง
Google Search Console (impressions/อันดับ) และ Keyword Planner (ยอดค้นหาเฉลี่ยต่อเดือน) เท่านั้น
ถ้าข้อมูลส่วนไหนว่างหรือเป็น 0 ให้ถือว่าไม่มีข้อมูล ห้ามตีความว่าเป็นความต้องการจริง

**สิ่งสำคัญที่สุดของรอบนี้: ต้องเสนอให้ครบทุกระดับความต้องการตามโควตาที่สั่ง**

อย่าให้หัวข้อกระจุกอยู่กับรุ่นหรือสินค้าเดียวที่คุ้นกันอยู่แล้ว สินค้าอื่นในหมวดที่ยังไม่มีบทความรองรับ
คือช่องว่างที่เหลืออยู่จริง — ต้องกระจายให้ทั่ว

ตัวอย่างหัวข้อที่เหมาะกับ LG Subscribe: คู่มือเลือกซื้อ/เลือกเช่า, เปรียบเทียบรุ่น, เลือกขนาดตามพื้นที่ห้อง (เช่น BTU ของแอร์),
การดูแลและล้างฟิลเตอร์, เช่ารายเดือนเทียบกับซื้อขาด, ค่าไฟและการใช้งานประจำวัน, ขั้นตอนสมัครและการดูแลหลังติดตั้ง

หลักการเลือกหัวข้อ **แยกตามระดับ**:
- ระดับ "ถามเยอะ/ปานกลาง": เลือกจากคำที่เว็บติดอันดับ 8-30 อยู่แล้วใน Search Console
  หรือคำที่มียอดค้นหาจาก Keyword Planner สูง — ดันขึ้นหน้าแรกได้คุ้มที่สุด
- ระดับ "ถามน้อย": คนยังไม่รู้ว่ามีรุ่นนี้ให้เช่า — หัวข้อควรอธิบายว่าสินค้านี้แก้ปัญหาอะไรและเช่ารายเดือนได้
- ระดับ "ยังไม่มีใครถาม": **ห้ามตัดสินจากยอดขายหรือยอดออเดอร์ (ไม่มีข้อมูลนี้)**
  ให้ดู "ความต้องการจากการค้นหาบน Google" แทน — เลือกรุ่นหรือหมวดที่มีคนค้นคำที่เกี่ยวข้องจริง
  ให้น้ำหนักพิเศษกับของที่ติดป้าย [งานราคาสูงของหมวด] ถ้ามี
  ถ้าไม่มีคำค้นไหนรองรับกลุ่มนี้เลยจริง ๆ ให้เสนอน้อยกว่าโควตาได้ **ห้ามแต่งตัวเลขค้นหาขึ้นมาเอง**

หัวข้อต้องเขียนได้จากสินค้าและรุ่นที่ LG Subscribe มีจริงในหมวดนี้เท่านั้น ห้ามเสนอเรื่องที่ไม่มีให้เช่า

เจตนาค้นหาด้านความไว้วางใจและการตัดสินใจ:
- ถ้ารายการคำค้นจริงมีคำแนว "รีวิว", "ดีไหม", "คุ้มไหม", "ราคา", "เช่าหรือซื้อ", "เปรียบเทียบ",
  "ค่าไฟ", "ช่างติดตั้ง", "ดูแลหลังการขาย" หรือ "เงื่อนไข" ให้ให้น้ำหนักสูง
  เพราะเป็นคำของคนที่กำลังเปรียบเทียบและใกล้ตัดสินใจสมัคร
- เสนอหัวข้อที่ช่วยลดความกังวลก่อนสมัครได้ แต่ต้องผูกกับสินค้าจริงและข้อมูลคำค้นที่ให้มา
- ห้ามแต่งยอดค้นหา ห้ามอ้างว่าคำด้านความไว้วางใจมี demand ถ้าข้อมูลจริงของรอบนี้ไม่รองรับ
- ห้ามเสนอหัวข้อที่ต้องอ้างจำนวนลูกค้า คะแนนรีวิว รางวัล หรือการันตีว่าอนุมัติแน่นอน

เลือกชนิดหน้าให้ตรงเจตนา: คำเช่าสินค้ากว้าง ๆ ให้หน้าสินค้าเป็นหน้าหลัก บทความควรตอบคำถามย่อย
เรื่องราคา การเปรียบเทียบรุ่น วิธีเลือกขนาด หรือการดูแลรักษา ถ้ามีบทความจับคำนี้แล้วให้ปรับเรื่องเดิม ไม่สร้างเรื่องใหม่แข่งกัน
ยอดค้นหาเฉลี่ยต่อเดือนใช้อ้างได้เฉพาะบล็อก Keyword Planner ห้ามใช้ impressions ของ GSC แทนยอดตลาด

กติกาที่ห้ามผิด:
- **ห้ามเสนอหัวข้อซ้ำหรือใกล้เคียงกับบทความที่มีอยู่แล้ว** ที่ให้ไปในรายการ — บทความสองเรื่องที่จับคำเดียวกันจะแย่งอันดับกันเอง ทำให้ตกทั้งคู่
- targetKeyword ของแต่ละหัวข้อต้องไม่ซ้ำกัน
- demandTier ต้องตรงกับระดับที่รุ่นสินค้านั้นถูกจัดไว้ในข้อมูล ห้ามยกระดับเองเพื่อให้ครบโควตา
- ถ้าเลือก targetKeyword จากรายการคำค้นที่ให้มา ต้องคัดลอกมาทั้งคำเป๊ะ ๆ ห้ามเติม/ตัด/สลับคำ
  (ระบบใช้คำนี้เทียบกับอันดับจริงบน Google — ดัดแปลงแล้ววัดผลไม่ได้)
- reason ต้องอ้างตัวเลขจริงจากข้อมูลที่ให้ไป (ยอดค้นหา/impressions/อันดับปัจจุบัน) ห้ามแต่งตัวเลขเอง ถ้าไม่มีตัวเลขรองรับให้บอกตรง ๆ ว่าไม่มีข้อมูล`;

/**
 * @description AI เสนอหัวข้อบทความจาก "แฟ้มข้อมูลจริง" ของหมวดบริการ — ขั้นที่ 1 ของการสั่งเขียนบทความตามหมวด
 * @logic
 * - เป็น AI call สั้น (ไม่ได้เขียนเนื้อหา แค่เลือกหัวข้อ) จึงรอในหน้าจอได้ ต่างจากขั้นเขียนที่ต้องเข้าคิว
 * - ส่งข้อมูลจริง 6 ชุดจาก {@link ./build-category-grounding.helper.ts} ให้ AI เลือกเอง
 *   ว่าคำค้นไหนเกี่ยวกับหมวดนี้ — แม่นกว่าให้โค้ด match คำไทยแบบ substring มาก
 * - หลังได้ผลลัพธ์ ผูกตัวเลข Ads (คลิก/เงินที่เผา) + ยอดค้นหา กลับเข้าแต่ละหัวข้อจาก pool ที่ส่งไป
 *   ถ้า AI แต่งคำใหม่ที่ไม่มีใน pool จะได้ 0 — หน้าจอจะได้แสดงตามจริงว่าคำนี้ไม่มีข้อมูลรองรับ
 *   (สำคัญเป็นพิเศษกับหัวข้อระดับ UNTAPPED ที่ทั้งใบตัดสินจากยอดค้นหา — 0 = AI เดาเอง อย่าเชื่อ)
 * - กันหัวข้อซ้ำกันเองอีกชั้นด้วยโค้ด (AI ยังพลาดได้แม้ prompt สั่งห้าม)
 * - **โควตาต่อระดับบังคับด้วย prompt ไม่ใช่ด้วยโค้ด** เพราะบางหมวดไม่มีบริการระดับนั้นอยู่จริง
 *   (หมวดที่ขายดีทุกตัวจะไม่มี UNTAPPED เลย) — บังคับด้วยโค้ดแล้วจะได้หัวข้อที่ AI แต่งขึ้นมาให้ครบจำนวน
 *   ผู้เรียกต้องยอมรับได้ว่าบางระดับจะได้น้อยกว่าที่ขอ
 * @param params แฟ้มข้อมูลจริงของหมวด + โควตาหัวข้อต่อระดับ
 * @returns หัวข้อที่เสนอพร้อมระดับความต้องการและตัวเลขประกอบการตัดสินใจ
 * @used-by {@link ./suggest-category-topics.action.ts}
 * @related {@link ../constant/seo-demand-tier.ts}, {@link ../type/category-topic-suggestion.type.ts}
 */
export const suggestCategoryTopics = async (params: {
  grounding: SeoCategoryGrounding;
  /** จำนวนหัวข้อที่ต้องการต่อระดับ — ไม่ส่ง = SEO_DEMAND_TIER_DEFAULT_QUOTA */
  quota?: Partial<Record<SeoDemandTier, number>>;
}): Promise<SeoCategoryTopicSuggestion[]> => {
  const { grounding } = params;
  const quota = { ...SEO_DEMAND_TIER_DEFAULT_QUOTA, ...params.quota };

  const quotaLines = SEO_DEMAND_TIERS.filter((tier) => (quota[tier] ?? 0) > 0)
    .map((tier) => `- ระดับ "${SEO_DEMAND_TIER_LABEL[tier].label}" (${tier}): ${quota[tier]} หัวข้อ`)
    .join("\n");

  const userMessage = [
    buildGroundingMessage(grounding),
    "",
    "โควตาหัวข้อที่ต้องเสนอรอบนี้ (เรียงจากคุ้มที่สุดลงไปภายในแต่ละระดับ):",
    quotaLines,
    "",
    "ระดับไหนไม่มีสินค้ารองรับจริง ให้เสนอน้อยกว่าโควตาได้ — ห้ามยัดหัวข้อให้ครบจำนวนโดยไม่มีข้อมูลรองรับ",
  ].join("\n");

  const resolvedModel = getSeoArticleAi("suggestTopics");

  const aiStartedAt = Date.now();
  const { object, usage } = await generateObject({
    model: resolvedModel.model,
    schema: suggestionSchema,
    providerOptions: resolvedModel.providerOptions,
    system: SYSTEM_PROMPT,
    messages: [{ role: "user", content: userMessage }],
  });
  void trackAiUsage({
    feature: AiUsageFeature.SEO_ARTICLE_TOPIC,
    provider: resolvedModel.provider,
    model: resolvedModel.modelId,
    usage,
    operation: "by-category",
    startedAt: aiStartedAt,
  });

  const adStatByKeyword = new Map(grounding.adKeywords.map((k) => [k.keyword, k]));
  const searchStatByKeyword = new Map(grounding.searchDemand.map((row) => [row.keyword, row]));
  const plannerByKeyword = new Map(
    (grounding.plannerIdeas ?? []).map((row) => [normalizeSearchTerm(row.keyword), row])
  );
  const seenKeywords = new Set((grounding.existingKeywords ?? []).map(normalizeSearchTerm));

  return object.topics
    .map<SeoCategoryTopicSuggestion>((item) => {
      const targetKeyword = normalizeSearchTerm(item.targetKeyword);
      const adStat = adStatByKeyword.get(targetKeyword);
      const searchStat = searchStatByKeyword.get(targetKeyword);
      return {
        topic: item.topic.trim(),
        targetKeyword,
        reason: item.reason.trim(),
        adCostBaht: adStat?.costBaht ?? 0,
        adClicks: adStat?.clicks ?? 0,
        demandTier: item.demandTier,
        searchImpressions: searchStat?.impressions ?? 0,
        adImpressions: searchStat?.adImpressions ?? 0,
        avgMonthlySearches: plannerByKeyword.get(targetKeyword)?.avgMonthlySearches ?? null,
        organicPosition: searchStat?.organicPosition ?? null,
      };
    })
    .filter((item) => {
      if (!item.topic || !item.targetKeyword) return false;
      if (searchStatByKeyword.get(item.targetKeyword)?.hasArticle) return false;
      if (seenKeywords.has(item.targetKeyword)) return false; // AI เสนอคำซ้ำ — เอาอันแรกพอ
      seenKeywords.add(item.targetKeyword);
      return true;
    });
};
