import "server-only";
import { generateObject } from "ai";
import { z } from "zod";
import { AiUsageFeature } from "@prisma/client";
import { trackAiUsage } from "@/lib/ai/usage/track-ai-usage";
import { getSeoArticleAi } from "../../seo-article/server/seo-article-ai-model";

/** 1 ข้อที่ส่งไปแปล / ที่แปลกลับมา — โครงเดียวกันทั้งขาไปขากลับ */
export interface AskAnswerFaqText {
  question: string;
  answer: string;
}

const translationSchema = z.object({
  faqs: z
    .array(
      z.object({
        question: z.string().describe("The translated question"),
        answer: z.string().describe("The translated answer, keeping the same line breaks (\\n) as the Thai original"),
      })
    )
    .describe("Translated items, same count and same order as the input list"),
});

const SYSTEM_PROMPT = `You translate the FAQ page of LG Subscribe into English.

LG Subscribe offers monthly subscription (rental) of LG home appliances in Thailand — air conditioners, air purifiers, dehumidifiers, dishwashers, fridges, washers and more — with LG technician care at home per the contract terms. Customers contact them on LINE @lgsubscribe.

Rules:
- Translate meaning, not word-for-word. It must read like an English-speaking staff member wrote it.
- Keep every number, price, count, duration and model name exactly as in the Thai original. Never invent, round or drop a number.
- Keep "LG Subscribe", "LG", product model codes, "LINE @lgsubscribe" and any /blog/... path unchanged.
- Do not add claims that are not in the Thai text (no customer counts, review scores, awards or guaranteed approval).
- Keep the same line breaks: if the Thai answer has three lines separated by \\n, the English answer has three lines separated by \\n.
- Return exactly the same number of items, in the same order. Never merge, split, reorder, drop or add items.
- Plain text only: no HTML, no markdown.`;

/**
 * @description แปลข้อถาม-ตอบเป็นอังกฤษทีละชุด — ใช้ทั้งตอน AI เขียนข้อใหม่ และตอนแปลไฟล์ en ทั้งใบ
 * @logic
 * - แปลเป็น "ชุด" ไม่ใช่ทีละข้อ เพราะคำศัพท์ต้องสม่ำเสมอกันทั้งหน้า (rental/subscription, air conditioner/aircon ปนกันแล้วดูไม่มืออาชีพ)
 * - **จำนวนข้อที่คืนไม่เท่าที่ส่งไป = throw** เพราะผู้เรียกจับคู่ผลลัพธ์ตามตำแหน่ง
 *   AI รวบ/ข้ามข้อกลางทางเมื่อไหร่ ทุกข้อหลังจากนั้นจะได้คำแปลของข้ออื่นถาวร (คำถามหนึ่ง คำตอบอีกเรื่อง)
 * - ส่ง list ว่าง = คืน list ว่าง ไม่เรียก AI (กันจ่ายค่า token ให้งานที่ไม่มีอะไรทำ)
 * @param faqs ข้อถาม-ตอบฉบับไทย
 * @returns ฉบับอังกฤษ เรียงตรงตำแหน่งกับ input
 * @used-by {@link ./run-write-faq-job.helper.ts}, {@link ./run-translate-faq-en-job.helper.ts}
 */
export const translateAskAnswerFaqs = async (faqs: AskAnswerFaqText[]): Promise<AskAnswerFaqText[]> => {
  if (faqs.length === 0) return [];

  const numbered = faqs
    .map((faq, index) => `--- item ${index + 1} ---\nQ: ${faq.question}\nA: ${faq.answer}`)
    .join("\n");

  const resolvedModel = getSeoArticleAi("translateFaq");
  const aiStartedAt = Date.now();
  const { object, usage } = await generateObject({
    model: resolvedModel.model,
    schema: translationSchema,
    providerOptions: resolvedModel.providerOptions,
    system: SYSTEM_PROMPT,
    prompt: `Below are ${faqs.length} Thai FAQ items. Return exactly ${faqs.length} translated items in the same order.\n\n${numbered}`,
  });
  void trackAiUsage({
    feature: AiUsageFeature.ASK_ANSWER_FAQ_TRANSLATE,
    provider: resolvedModel.provider,
    model: resolvedModel.modelId,
    usage,
    startedAt: aiStartedAt,
  });

  if (object.faqs.length !== faqs.length) {
    throw new Error(
      `[FAQ-EN-01] AI คืนคำแปล ${object.faqs.length} ข้อ แต่ส่งไป ${faqs.length} ข้อ — ไม่บันทึกคำแปลที่ตำแหน่งเลื่อน ลองสั่งใหม่อีกครั้ง`
    );
  }

  return object.faqs.map((faq) => ({ question: faq.question.trim(), answer: faq.answer.trim() }));
};
