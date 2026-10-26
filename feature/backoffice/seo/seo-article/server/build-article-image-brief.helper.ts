import "server-only";
import { generateObject } from "ai";
import { z } from "zod";
import { AiUsageFeature } from "@prisma/client";
import { trackAiUsage } from "@/lib/ai/usage/track-ai-usage";
import { getSeoArticleAi } from "./seo-article-ai-model";
import type { SingleImagePlacement, SingleImageStyle } from "./build-single-image-prompt.helper";

/** ความยาวสูงสุดของบริบทเนื้อหาที่ส่งให้โมเดลอ่าน — ยาวกว่านี้ไม่ได้ช่วยให้ภาพตรงขึ้น แต่เปลืองโทเคน */
const MAX_CONTEXT_LENGTH = 2000;

export interface BuildArticleImageBriefParams {
  articleTitle: string;
  /** หัวข้อที่บล็อกรูปอยู่ใกล้ที่สุด (ถ้ามี) */
  nearbyHeading?: string;
  /** เนื้อความรอบ ๆ จุดที่จะแทรกรูป — มาจากร่างในหน้าแก้ไข จึงสะท้อนสิ่งที่ผู้ใช้เห็นตรงหน้าจริง */
  nearbyText?: string;
  placement: SingleImagePlacement;
  style: SingleImageStyle;
}

export interface ArticleImageBrief {
  /** คำสั่งวาดภาษาไทย — ส่งต่อเข้า buildSingleImagePrompt เหมือนกับที่ผู้ใช้พิมพ์เอง */
  description: string;
  /** คำอธิบายรูป (alt) ที่เสนอให้ */
  alt: string;
}

/** ยุบช่องว่างและตัดความยาวบริบท — กันเนื้อหายาว ๆ กินโทเคนโดยไม่จำเป็น */
const toContext = (value: string): string => value.replace(/\s+/g, " ").trim().slice(0, MAX_CONTEXT_LENGTH);

const briefSchema = z.object({
  description: z.string().describe("คำสั่งวาดภาพเป็นภาษาไทย สั้น กระชับ บอกว่าในภาพมีอะไรบ้าง"),
  alt: z.string().describe("คำอธิบายรูปสำหรับ alt เป็นภาษาไทย 1 ประโยคสั้น"),
});

const SYSTEM_PROMPT = [
  "คุณเป็นบรรณาธิการภาพของบล็อก LG Subscribe (บริการเช่ารายเดือนเครื่องใช้ไฟฟ้า LG) ในไทย — ภาพแสดงเครื่องใช้ไฟฟ้า LG ในบ้านคนไทยแบบสมจริง",
  "หน้าที่คุณคือ อ่านบทความแล้วตัดสินใจแทนบรรณาธิการว่า 'ตรงจุดนี้ควรมีภาพอะไร' แล้วเขียนเป็นคำสั่งวาด",
  "",
  "กฎ:",
  "- ภาพต้องเล่าเรื่องที่ 'หัวข้อตรงนั้น' กำลังพูดถึง ไม่ใช่ภาพกว้าง ๆ ที่ใช้กับบทความไหนก็ได้",
  "- เจาะจงเป็นรูปธรรม: ระบุวัตถุ มุมกล้อง สิ่งที่เห็นในภาพ",
  "- ห้ามสั่งให้ใส่โลโก้ ชื่อแบรนด์ หรือลายน้ำ และห้ามสั่งให้มีตัวหนังสือที่อ่านได้บนตัวเครื่องหรือในภาพ",
  "- description ไม่เกิน 300 ตัวอักษร, alt ไม่เกิน 100 ตัวอักษร",
].join("\n");

/**
 * @description ให้ AI อ่านบริบทบทความแล้วเขียน "คำสั่งวาดรูป" ให้เอง — ใช้ตอนผู้ใช้กดวาดโดยไม่พิมพ์อะไร
 * @logic
 * - ผลลัพธ์ถูกส่งต่อเข้า {@link ./build-single-image-prompt.helper.ts} เหมือนกับคำสั่งที่ผู้ใช้พิมพ์เอง
 *   ทำแบบนี้เพื่อให้ทางอัตโนมัติกับทางพิมพ์เองผ่านด่านตรวจ + ล็อกแบรนด์ชุดเดียวกันเป๊ะ ๆ ไม่แตกเป็นสองสูตร
 * - บริบทที่ใช้มาจาก **ร่างในหน้าแก้ไข** ไม่ใช่จากฐานข้อมูล เพราะผู้ใช้อาจยังไม่ได้กดบันทึก
 *   ถ้าไปอ่านฐาน ภาพจะอิงเนื้อหาเก่าที่ต่างจากสิ่งที่เห็นตรงหน้า
 * - บรีฟของ infographic ต่างจากภาพถ่าย: ต้องบอก "โครงของแผนภาพ" (ขั้นตอน/เปรียบเทียบ/รายการ)
 *   ไม่ใช่บอกมุมกล้อง — ไม่งั้นโมเดลจะวาดออกมาเป็นรูปถ่ายทั้งที่สั่งเป็นอินโฟกราฟิก
 * @param params ชื่อบทความ + หัวข้อ/เนื้อความใกล้เคียง + ตำแหน่ง + สไตล์
 * @returns คำสั่งวาด + alt ที่เสนอ
 * @throws เมื่อเรียกโมเดลไม่สำเร็จ — ผู้เรียกต้องดักแล้วคืน [SEO-IMG-GEN-09]
 * @used-by {@link ./generate-single-article-image.action.ts}
 */
export const buildArticleImageBrief = async (params: BuildArticleImageBriefParams): Promise<ArticleImageBrief> => {
  const styleBrief =
    params.style === "infographic"
      ? [
          "ภาพนี้เป็น **อินโฟกราฟิก** (แผนภาพ ไม่ใช่ภาพถ่าย)",
          "ให้บอกโครงของแผนภาพให้ชัด เช่น ขั้นตอน 1-2-3 / เปรียบเทียบก่อน-หลัง / รายการสิ่งที่ต้องเตรียม",
          "ระบุข้อความไทยที่จะอยู่ในภาพให้ครบ แต่ **สั้นที่สุด** — หัวเรื่องไม่เกิน 6 คำ และป้ายกำกับไม่เกิน 4 อัน อันละ 1-3 คำ",
          "ห้ามให้มีประโยคยาวในภาพ เพราะตัวอักษรไทยจะเพี้ยน",
        ].join("\n")
      : [
          "ภาพนี้เป็น **ภาพถ่าย** สไตล์ไลฟ์สไตล์ในบ้านคนไทย",
          "ให้บอกว่าเห็นอะไรในเฟรม มุมกล้องแบบไหน (ภาพใกล้ตัวเครื่อง / ภาพกว้างทั้งห้อง / มุมมองจากด้านบน)",
          "ห้ามสั่งให้มีตัวหนังสือใด ๆ ในภาพ",
        ].join("\n");

  const placementBrief =
    params.placement === "cover"
      ? "ตำแหน่ง: เป็น **รูปปก** หัวบทความ ต้องกว้าง ชวนคลิก และสรุปภาพรวมของบทความทั้งเรื่อง"
      : "ตำแหน่ง: เป็น **รูปแทรก** กลางบทความ ต้องเจาะจงเฉพาะหัวข้อตรงนั้น ไม่ใช่ภาพรวมของทั้งบทความ";

  const userMessage = [
    `ชื่อบทความ: ${toContext(params.articleTitle)}`,
    params.nearbyHeading ? `หัวข้อตรงจุดที่จะแทรกรูป: ${toContext(params.nearbyHeading)}` : "",
    params.nearbyText ? `เนื้อความรอบ ๆ จุดนั้น: ${toContext(params.nearbyText)}` : "",
    "",
    placementBrief,
    styleBrief,
  ]
    .filter(Boolean)
    .join("\n");

  const resolvedModel = getSeoArticleAi("imageBrief");
  const aiStartedAt = Date.now();
  const { object, usage } = await generateObject({
    model: resolvedModel.model,
    schema: briefSchema,
    providerOptions: resolvedModel.providerOptions,
    system: SYSTEM_PROMPT,
    messages: [{ role: "user", content: userMessage }],
  });
  void trackAiUsage({
    feature: AiUsageFeature.SEO_ARTICLE_IMAGE_BRIEF,
    provider: resolvedModel.provider,
    model: resolvedModel.modelId,
    usage,
    startedAt: aiStartedAt,
  });

  return { description: object.description.trim(), alt: object.alt.trim() };
};
