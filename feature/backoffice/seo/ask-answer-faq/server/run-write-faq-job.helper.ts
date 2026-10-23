import "server-only";
import prisma from "@/lib/seo/prisma";
import { buildAskAnswerGrounding } from "./build-ask-answer-grounding.helper";
import { writeAskAnswerFaqs } from "./write-ask-answer-faqs.helper";
import { translateAskAnswerFaqs } from "./translate-ask-answer-faqs.helper";
import { pickUnusedFaqKey } from "../helper/pick-unused-faq-key.helper";
import type { SeoArticleJobRunner } from "../../seo-article/server/seo-article-job-runner.type";
import type { AskAnswerFaqWritePayload } from "../type/ask-answer-faq-job-payload.type";

/**
 * @description runner ของงาน WRITE_FAQ — คิดข้อถาม-ตอบใหม่ให้หน้า /ask-and-answer แล้วแปล EN ในงานเดียว
 * @logic
 * - ไทยก่อน อังกฤษตาม **ในงานเดียวกัน** ต่างจากบทความที่แยกงานแปลออกเป็นคิวใบที่สอง
 *   เพราะ FAQ 5 ข้อสั้นมาก (ไม่กี่วินาที) การแตกเป็น 2 job มีแต่จะเพิ่มจุดพังโดยไม่ได้อะไร
 * - **แปลพังไม่ล้มทั้งงาน** — ข้อไทยคือของหลักและมีค่าอยู่แล้ว บันทึกไปก่อนโดยฉบับ EN เป็น null
 *   (ตอนเผยแพร่ ไฟล์ en จะใช้ข้อความไทยไปพลาง แล้วกดปุ่มแปลไฟล์ en ทั้งใบซ่อมทีหลังได้)
 * - id ของแต่ละข้อกันซ้ำกับ **ทั้งไฟล์บนเว็บและทุกแถวในฐาน** ไม่ใช่แค่ชุดที่เพิ่งสร้าง
 *   (id ซ้ำ = accordion บนเว็บ 2 ข้อเปิดพร้อมกัน และคำแปล en จับคู่ผิดข้อถาวร)
 * - AI ไม่เสนอข้อใหม่เลย = งานสำเร็จแบบไม่มีผลลัพธ์ ไม่ใช่ FAILED (หน้าที่คำถามครบแล้วก็มีจริง)
 * @param job แถวงานในคิว (อ่านจำนวนข้อจาก payload.count)
 * @returns ป้ายชื่อสรุปจำนวนข้อที่ได้
 * @used-by {@link ../../seo-article/server/run-seo-article-job.helper.ts}
 * @related {@link ./write-ask-answer-faqs.helper.ts}, {@link ./publish-ask-answer-faqs.action.ts}
 */
export const runWriteFaqJob: SeoArticleJobRunner = async (job) => {
  const payload = (job.payload ?? {}) as AskAnswerFaqWritePayload;

  const grounding = await buildAskAnswerGrounding();
  const written = await writeAskAnswerFaqs({
    grounding,
    ...(payload.count ? { count: payload.count } : {}),
  });

  if (written.length === 0) {
    return { title: "ไม่มีคำถามใหม่ที่คุ้มพอจะเสนอ" };
  }

  // แปลพังไม่ล้มงาน — ข้อไทยต้องได้เก็บเสมอ ไม่งั้นเสียค่า AI รอบเขียนไปฟรี ๆ
  const translated = await translateAskAnswerFaqs(
    written.map((faq) => ({ question: faq.question, answer: faq.answer }))
  ).catch((error: unknown) => {
    console.error(
      `[FAQ-EN-02] แปล EN ไม่สำเร็จ job=${job.seoArticleJobId} — บันทึกเฉพาะฉบับไทย:`,
      error instanceof Error ? error.message : "Unknown"
    );
    return null;
  });

  // id ต้องไม่ชนกับข้อไหนเลย — ทั้งข้อเดิมบนเว็บ (ไม่ได้อยู่ในฐาน) และทุกแถวในฐาน
  const existingKeys = new Set([
    ...grounding.liveFaqKeys,
    ...(await prisma.askAnswerFaq.findMany({ select: { faqKey: true } })).map((row) => row.faqKey),
  ]);

  const rows = written.map((faq, index) => {
    const faqKey = pickUnusedFaqKey(existingKeys);
    existingKeys.add(faqKey);
    const en = translated?.[index];
    return {
      faqKey,
      question: faq.question,
      answer: faq.answer,
      ...(en ? { questionEn: en.question, answerEn: en.answer } : {}),
      ...(faq.targetKeyword ? { targetKeyword: faq.targetKeyword } : {}),
      reason: faq.reason,
      proofNote: faq.proofNote,
      ...(faq.relatedSlug ? { relatedSlug: faq.relatedSlug } : {}),
      requestedBy: job.requestedBy,
      seoArticleJobId: job.seoArticleJobId,
    };
  });

  await prisma.askAnswerFaq.createMany({ data: rows });

  return {
    title: `เสนอคำถามใหม่ ${rows.length} ข้อ${translated ? "" : " (แปล EN ไม่สำเร็จ)"}`,
  };
};
