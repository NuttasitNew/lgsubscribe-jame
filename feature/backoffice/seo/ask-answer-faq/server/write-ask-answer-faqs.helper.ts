import "server-only";
import { generateObject } from "ai";
import { z } from "zod";
import { AiUsageFeature } from "@prisma/client";
import { trackAiUsage } from "@/lib/ai/usage/track-ai-usage";
import { getSeoArticleAi } from "../../seo-article/server/seo-article-ai-model";
import { buildAskAnswerGroundingMessage } from "./build-ask-answer-grounding-message.helper";
import { isPublicFaqAnswerGrounded } from "../helper/is-public-faq-answer-grounded.helper";
import type { AskAnswerGrounding } from "../type/ask-answer-grounding.type";

/** ผลของ AI 1 ข้อ ที่ผ่านการทำความสะอาดแล้ว */
export interface WrittenAskAnswerFaq {
  question: string;
  answer: string;
  targetKeyword: string | null;
  reason: string;
  proofNote: string;
  relatedSlug: string | null;
}

/** จำนวนข้อที่อยากได้ต่อครั้ง — คุมผ่าน describe/prompt เท่านั้น (Anthropic ไม่รองรับ minItems > 1) */
const DEFAULT_FAQ_COUNT = 5;
/** เพดานที่ยอมรับต่อครั้ง — มากกว่านี้คนตรวจไม่ไหวและคุณภาพต่อข้อจะตก */
export const MAX_FAQ_COUNT = 10;

const faqSchema = z.object({
  faqs: z
    .array(
      z.object({
        question: z
          .string()
          .describe("คำถามภาษาไทยแบบที่ผู้สนใจเช่าเครื่องใช้ไฟฟ้า LG ถามจริง ขึ้นต้นด้วยคำถาม ไม่ต้องใส่เลขข้อนำหน้า ยาวไม่เกิน 90 ตัวอักษร"),
        answer: z
          .string()
          .describe(
            "คำตอบภาษาไทย 2-5 บรรทัด คั่นบรรทัดด้วย \\n — ตอบคำถามให้จบก่อน แล้วค่อยยกหลักฐานว่าทำไม LG Subscribe เป็นตัวเลือกที่น่าสนใจในเรื่องนี้"
          ),
        targetKeyword: z
          .string()
          .describe("คำค้นหลักที่ข้อนี้ตั้งใจจับ 1 คำ — เลือกจากรายการคำค้นที่ให้ไปต้องคัดลอกมาทั้งคำห้ามดัดแปลง"),
        reason: z
          .string()
          .describe(
            "เหตุผล 1 ประโยคว่าทำไมข้อนี้คุ้ม โดยอ้างข้อมูลคำค้นหรือข้อเท็จจริงที่ให้ไป (สำหรับคนตรวจ ไม่ขึ้นเว็บ)"
          ),
        proofNote: z
          .string()
          .describe(
            "ข้อเท็จจริงจากข้อมูลที่ให้ไป (เช่น ราคาเช่าเริ่มต้น เงื่อนไขสัญญา) ที่ใช้ในคำตอบข้อนี้ คั่นด้วย , — ไม่ได้ใช้ให้ใส่ '-' (ไม่ขึ้นเว็บ)"
          ),
        relatedSlug: z
          .string()
          .describe("slug บทความที่คำตอบชวนอ่านต่อ — ต้องมีในรายการที่ให้ไปเท่านั้น ไม่มีบทความที่เกี่ยวให้ใส่ค่าว่าง"),
      })
    )
    .describe("ข้อถาม-ตอบใหม่ เรียงจากคุ้มที่สุดลงไป ห้ามซ้ำกันเองและห้ามซ้ำคำถามที่มีอยู่แล้ว"),
});

/** System Prompt สำหรับข้อ FAQ — export เพื่อให้ regression test ล็อกกติกาคำอ้างสาธารณะได้ */
export const ASK_ANSWER_FAQ_SYSTEM_PROMPT = `คุณคือคนเขียนหน้า "ถาม-ตอบ" ของ LG Subscribe — บริการเช่ารายเดือนเครื่องใช้ไฟฟ้า LG (แอร์ เครื่องฟอกอากาศ เครื่องลดความชื้น เครื่องล้างจาน ไมโครเวฟ ตู้เย็น สไตล์เลอร์ ทีวีและเครื่องเสียง ลำโพง เครื่องดูดฝุ่น เครื่องซักผ้า/อบผ้า เครื่องกรองน้ำ จอมอนิเตอร์) พร้อมช่าง LG ดูแลถึงบ้านตามเงื่อนไขสัญญา ติดต่อทาง LINE @lgsubscribe

ข้อเท็จจริงของบริการที่ใช้ได้: เป็นการเช่ารายเดือน ไม่ใช่การผ่อนด้วยวงเงินบัตรเครดิต และกรรมสิทธิ์โอนให้เมื่อชำระครบทุกงวดตามสัญญา

หน้านี้มี 2 หน้าที่พร้อมกัน และต้องทำได้ทั้งคู่ในทุกข้อ:
1. **ตอบคำถามที่ผู้สนใจถามจริง** ให้จบ ชัด ใช้ตัดสินใจได้ — คนที่มาถึงหน้านี้กำลังจะสมัครหรือกำลังเทียบตัวเลือก
2. **ทำให้เห็นว่า LG Subscribe เป็นตัวเลือกที่น่าสนใจและจดจำได้** ด้วยภาษาที่มั่นใจแต่ซื่อตรง

วิธีเขียนคำตอบที่ถูก (ลำดับนี้ห้ามสลับ):
- บรรทัดแรก ๆ = ตอบคำถามตรง ๆ ก่อน คนอ่านต้องได้คำตอบแม้จะเลิกอ่านกลางทาง
- ทั้ง answer ต้องเขียนในมุมบุคคลที่ 3 โดยเรียกชื่อ "LG Subscribe" เท่านั้น ห้ามใช้ "เรา" "ของเรา" หรือ "ทีมเรา"
- แล้วค่อยต่อด้วยข้อความ 1-2 ประโยคในมุมบุคคลที่ 3 เพื่อสร้างความมั่นใจ เช่น
  "LG Subscribe ช่วยให้ใช้เครื่องใช้ไฟฟ้า LG ได้โดยจ่ายเป็นรายเดือน พร้อมช่าง LG ดูแลถึงบ้านตามเงื่อนไขสัญญา"
  AI เรียบเรียงข้อความเชิงความสะดวก ความคุ้มค่า และการดูแลหลังติดตั้งได้เอง ตราบเท่าที่ตรงกับข้อมูลที่ให้
- ปิดท้ายด้วยการชวนคุยต่อทาง LINE @lgsubscribe หรือชวนอ่านบทความที่เกี่ยวข้อง /blog/<slug>/ (เฉพาะข้อที่มีบทความรองรับ)

กติกาที่ห้ามผิดเด็ดขาด:
- **ห้ามอ้างจำนวนลูกค้า จำนวนออเดอร์ จำนวนเครื่องที่ติดตั้ง คะแนนรีวิว รางวัล หรือสถิติใด ๆ** — ข้อมูลรอบนี้ไม่มีตัวเลขเหล่านี้
- ห้ามรับรองว่าอนุมัติแน่นอน ห้ามแต่งเงื่อนไขสัญญา ส่วนลด หรือโปรโมชันที่ข้อมูลไม่ได้ให้มา
- ราคาเช่า ระยะเวลาสัญญา และขนาด ใช้ค่าจริงได้เฉพาะเมื่อข้อมูลให้มา และต้องบอกว่าเป็นราคาเช่าเริ่มต้นต่อเดือน (เงื่อนไขขึ้นกับรุ่นและสัญญา)
- ตัวเลข impressions และอันดับ ใช้เลือกหัวข้อและเขียน reason เท่านั้น **ห้ามใส่ใน answer สาธารณะ**
- ห้ามแต่งคำพูดรีวิวหรืออ้างลูกค้ารายบุคคล
- ห้ามเสนอคำถามซ้ำหรือใกล้เคียงกับรายการคำถามที่มีอยู่แล้ว
- relatedSlug ต้องเป็น slug ที่อยู่ในรายการบทความที่ให้ไปเท่านั้น ไม่มีที่เกี่ยวให้ใส่ค่าว่าง
- คำตอบเป็น plain text เท่านั้น ห้ามมี HTML/markdown — ขึ้นบรรทัดใหม่ใช้ \\n
  (ลิงก์บทความให้เขียนเป็น path เปล่า ๆ เช่น /blog/<slug>/ ระบบจะจัดการต่อเอง)`;

/**
 * @description ให้ AI คิดข้อถาม-ตอบใหม่สำหรับหน้า /ask-and-answer จากข้อมูลจริงของธุรกิจ
 * @logic
 * - เป็น "ต่อท้าย" ไม่ใช่ "เขียนใหม่ทั้งหน้า" — prompt จึงได้รายการคำถามเดิมไปเป็นข้อห้ามซ้ำ
 *   ระบบนี้ไม่มีทางลบข้อเดิมออกจากเว็บได้เลยโดยการออกแบบ (ดู publish-ask-answer-faqs.action.ts)
 * - กันซ้ำอีกชั้นด้วยโค้ดหลัง AI ตอบ: เทียบคำถามแบบตัดช่องว่าง/เลขข้อ/เครื่องหมายออกก่อน
 *   เพราะ AI ที่ถูกสั่งห้ามซ้ำยังเสนอ "1. ราคาเท่าไหร่?" ทับ "ราคาเท่าไหร่" ได้อยู่ดี
 * - `relatedSlug` ที่ไม่มีอยู่จริงถูกตัดทิ้งเป็น null — ลิงก์เสียบนหน้าที่ Google index แล้วแย่กว่าไม่มีลิงก์
 * - ได้ 0 ข้อ = ไม่ throw ผู้เรียกเป็นคนตัดสินใจ (หน้าที่คำถามครบแล้วจริง ๆ ก็มีอยู่ ไม่ใช่ความพัง)
 * @param params แฟ้มข้อมูลจริง + จำนวนข้อที่ต้องการ
 * @returns ข้อถาม-ตอบที่ผ่านการกรองแล้ว
 * @used-by {@link ./run-write-faq-job.helper.ts}
 * @related {@link ./build-ask-answer-grounding-message.helper.ts}
 */
export const writeAskAnswerFaqs = async (params: {
  grounding: AskAnswerGrounding;
  count?: number;
}): Promise<WrittenAskAnswerFaq[]> => {
  const count = Math.min(Math.max(params.count ?? DEFAULT_FAQ_COUNT, 1), MAX_FAQ_COUNT);
  const resolvedModel = getSeoArticleAi("writeFaq");

  const aiStartedAt = Date.now();
  const { object, usage } = await generateObject({
    model: resolvedModel.model,
    schema: faqSchema,
    providerOptions: resolvedModel.providerOptions,
    system: ASK_ANSWER_FAQ_SYSTEM_PROMPT,
    messages: [
      {
        role: "user",
        content: `${buildAskAnswerGroundingMessage(params.grounding)}\n\nเสนอข้อถาม-ตอบใหม่ ${count} ข้อ`,
      },
    ],
  });
  void trackAiUsage({
    feature: AiUsageFeature.ASK_ANSWER_FAQ_WRITE,
    provider: resolvedModel.provider,
    model: resolvedModel.modelId,
    usage,
    startedAt: aiStartedAt,
  });

  const knownSlugs = new Set(params.grounding.publishedArticles.map((article) => article.slug));
  const seen = new Set(
    [...params.grounding.liveQuestions, ...params.grounding.proposedQuestions].map(normalizeQuestion)
  );

  return object.faqs
    .map((item) => {
      const slug = item.relatedSlug.trim().replace(/^\/?blog\//, "");
      return {
        question: item.question.trim(),
        answer: item.answer.trim(),
        targetKeyword: item.targetKeyword.trim() || null,
        reason: item.reason.trim(),
        proofNote: item.proofNote.trim(),
        relatedSlug: slug && knownSlugs.has(slug) ? slug : null,
      };
    })
    .filter((item) => {
      if (!item.question || !item.answer) return false;
      if (!isPublicFaqAnswerGrounded(item.answer, params.grounding)) return false;
      const key = normalizeQuestion(item.question);
      if (seen.has(key)) return false; // ซ้ำกับของเดิมหรือซ้ำกันเองในรอบนี้
      seen.add(key);
      return true;
    })
    .slice(0, count);
};

/**
 * @description ทำคำถามให้เทียบซ้ำกันได้ — ตัดเลขข้อนำหน้า ช่องว่าง และเครื่องหมายออก
 * @logic คำถามเดิมบนเว็บขึ้นต้นด้วย "1." "2." และใช้อัญประกาศไทย “ ” ปนกัน
 *        ถ้าเทียบสตริงดิบ คำถามเดียวกันคนละรูปแบบจะไม่ถูกจับว่าซ้ำเลยสักครั้ง
 * @param question คำถามดิบ
 * @returns คีย์สำหรับเทียบซ้ำ
 */
const normalizeQuestion = (question: string): string =>
  question
    .trim()
    .replace(/^\s*\d+[.)]\s*/, "")
    .replace(/[\s"'“”‘’?!.,()]/g, "")
    .toLowerCase();
