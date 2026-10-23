"use server";

import { cookies } from "next/headers";
import { verifyByToken } from "@/lib/seo/auth";
import { ResponsePattern, ResponsePatternType } from "@/lib/seo/helper/response-pattern";
import { fileLogger } from "@/lib/seo/logger";
import prisma from "@/lib/seo/prisma";
import { AskAnswerFaqStatus } from "@prisma/client";

/** ความยาวสูงสุด — คำถามยาวกว่านี้หัว accordion บนเว็บจะล้น 2 บรรทัด, คำตอบยาวกว่านี้ไม่มีใครอ่านจบ */
const MAX_QUESTION_LENGTH = 200;
const MAX_ANSWER_LENGTH = 3000;

export interface UpdateAskAnswerFaqParams {
  askAnswerFaqId: number;
  question: string;
  answer: string;
  /** ฉบับ EN — ส่งค่าว่างทั้งคู่ = ล้างฉบับ EN ทิ้ง (ไฟล์ en จะกลับไปใช้ข้อความไทย) */
  questionEn?: string;
  answerEn?: string;
}

/**
 * @description แก้ข้อความของข้อถาม-ตอบที่ AI เสนอไว้ ก่อนกดเผยแพร่ขึ้นเว็บ
 * @page /super-admin/hurry-web/seo-article?section=faq
 * @access super-admin
 * @logic
 * - **แก้ได้เฉพาะ DRAFT** — ข้อที่ PUBLISHED แล้วอยู่บนหน้าเว็บจริง การแก้ที่นี่จะไม่ตามไปแก้ไฟล์
 *   ผลคือฐานกับเว็บพูดไม่ตรงกันโดยไม่มีใครรู้ (แก้ข้อที่ขึ้นเว็บแล้วให้ใช้ preview editor ของหน้า hurry-web)
 * - ฉบับ EN ต้อง **ครบคู่หรือไม่มีเลย** ใส่มาครึ่งเดียวถือว่าไม่มี — กันเคสหน้า /en ได้คำถามอังกฤษ
 *   คู่กับคำตอบไทย ซึ่งดูเหมือนระบบพังมากกว่าไม่แปลเลย
 * @param params ข้อความไทย + ฉบับ EN (ถ้ามี)
 * @returns เลขข้อที่แก้
 * @used-by {@link ../tanstack/update-ask-answer-faq.mutation.ts}
 * @related {@link ./publish-ask-answer-faqs.action.ts}
 */
export const updateAskAnswerFaq = async (
  params: UpdateAskAnswerFaqParams
): Promise<ResponsePatternType<{ askAnswerFaqId: number }>> => {
  const cookieStore = await cookies();
  const authToken = cookieStore.get("lg_backoffice_session")?.value;
  if (!authToken) return ResponsePattern.unauthorized("no auth token");

  let decoded;
  try {
    decoded = await verifyByToken(authToken);
  } catch {
    return ResponsePattern.unauthorized("Token ไม่ถูกต้องหรือหมดอายุ");
  }

  if (decoded.role !== "SUPER_ADMIN") {
    return ResponsePattern.forbidden("[FAQ-EDIT-01] เฉพาะ super-admin เท่านั้น");
  }

  const question = params.question.trim();
  const answer = params.answer.trim();
  if (!question || !answer) {
    return ResponsePattern.badRequest("[FAQ-EDIT-02] คำถามและคำตอบต้องไม่ว่าง");
  }
  if (question.length > MAX_QUESTION_LENGTH) {
    return ResponsePattern.badRequest(`[FAQ-EDIT-03] คำถามยาวเกิน ${MAX_QUESTION_LENGTH} ตัวอักษร`);
  }
  if (answer.length > MAX_ANSWER_LENGTH) {
    return ResponsePattern.badRequest(`[FAQ-EDIT-04] คำตอบยาวเกิน ${MAX_ANSWER_LENGTH} ตัวอักษร`);
  }

  const questionEn = params.questionEn?.trim() ?? "";
  const answerEn = params.answerEn?.trim() ?? "";
  if (Boolean(questionEn) !== Boolean(answerEn)) {
    return ResponsePattern.badRequest("[FAQ-EDIT-05] ฉบับอังกฤษต้องกรอกครบทั้งคำถามและคำตอบ หรือปล่อยว่างทั้งคู่");
  }

  const log = fileLogger.session("แก้ข้อถาม-ตอบหน้าเว็บ", {
    type: "U",
    id: `FAQ:${params.askAnswerFaqId}`,
    userName: decoded.name || "unknown",
  });

  try {
    // updateMany + เช็ค count = ตรวจสถานะกับการเขียนอยู่ใน statement เดียว ไม่มีช่องให้ 2 คนแก้ชนกัน
    const updated = await prisma.askAnswerFaq.updateMany({
      where: { askAnswerFaqId: params.askAnswerFaqId, status: AskAnswerFaqStatus.DRAFT },
      data: {
        question,
        answer,
        questionEn: questionEn || null,
        answerEn: answerEn || null,
      },
    });

    if (updated.count === 0) {
      log.error("ไม่พบข้อ หรือข้อนี้ไม่ใช่ร่างแล้ว");
      return ResponsePattern.badRequest("[FAQ-EDIT-06] แก้ได้เฉพาะข้อที่ยังไม่เผยแพร่ — โหลดหน้าใหม่แล้วลองอีกครั้ง");
    }

    log.end({ result: "ok" });
    return ResponsePattern.ok("บันทึกแล้ว", { askAnswerFaqId: params.askAnswerFaqId });
  } catch (error) {
    log.error(error instanceof Error ? error.message : "Unknown");
    return ResponsePattern.error("[FAQ-EDIT-07] บันทึกไม่สำเร็จ");
  } finally {
    log.end();
  }
};
