"use server";

import { cookies } from "next/headers";
import { verifyByToken } from "@/lib/seo/auth";
import { ResponsePattern, ResponsePatternType } from "@/lib/seo/helper/response-pattern";
import prisma from "@/lib/seo/prisma";
import { AskAnswerFaqStatus } from "@prisma/client";
import type { AskAnswerFaqItem } from "../type/ask-answer-faq-item.type";

/** เพดานต่อสถานะ — หน้านี้เป็นรายการสั้น ไม่ทำ pagination (ข้อ FAQ ทั้งหน้ามีหลักสิบ ไม่ใช่หลักพัน) */
const MAX_ROWS = 200;

export interface FindAskAnswerFaqsParams {
  /** ไม่ส่ง = ทุกสถานะ */
  status?: AskAnswerFaqStatus;
}

/**
 * @description ดึงข้อถาม-ตอบที่ AI เสนอไว้ สำหรับหมวด "หน้า ถาม-ตอบ" ในหน้า SEO Article
 * @page /super-admin/hurry-web/seo-article?section=faq
 * @access super-admin
 * @logic
 * - เรียง DRAFT ก่อนเสมอแล้วค่อยใหม่→เก่า — ของที่ต้องลงมือตรวจต้องอยู่บนสุด ไม่ใช่ปนกับของที่จบไปแล้ว
 * - แปลง Date เป็น ISO string ตั้งแต่ที่ server: ค่าที่ข้าม server action boundary ควรเป็น primitive
 *   ไม่งั้น cache ฝั่ง client จะได้ Date ที่ serialize/deserialize ไม่ตรงกันข้ามรอบ
 * - `hasEn` ตัดสินที่นี่ที่เดียว (ต้องครบทั้งคำถามและคำตอบ) UI จึงไม่มีทางตีความต่างจากตอน publish
 * @param params ตัวกรองสถานะ
 * @returns รายการข้อถาม-ตอบ
 * @used-by {@link ../tanstack/find-ask-answer-faqs.query.ts}
 * @related {@link ./publish-ask-answer-faqs.action.ts}
 */
export const findAskAnswerFaqs = async (
  params: FindAskAnswerFaqsParams = {}
): Promise<ResponsePatternType<AskAnswerFaqItem[]>> => {
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
    return ResponsePattern.forbidden("[FAQ-LIST-01] เฉพาะ super-admin เท่านั้น");
  }

  try {
    const rows = await prisma.askAnswerFaq.findMany({
      ...(params.status ? { where: { status: params.status } } : {}),
      orderBy: [{ status: "asc" }, { createdAt: "desc" }], // enum เรียง DRAFT < PUBLISHED < REJECTED ตามลำดับที่ประกาศ
      take: MAX_ROWS,
    });

    return ResponsePattern.ok(
      "สำเร็จ",
      rows.map<AskAnswerFaqItem>((row) => ({
        askAnswerFaqId: row.askAnswerFaqId,
        faqKey: row.faqKey,
        question: row.question,
        answer: row.answer,
        questionEn: row.questionEn,
        answerEn: row.answerEn,
        hasEn: Boolean(row.questionEn?.trim() && row.answerEn?.trim()),
        status: row.status,
        targetKeyword: row.targetKeyword,
        reason: row.reason,
        proofNote: row.proofNote,
        relatedSlug: row.relatedSlug,
        requestedBy: row.requestedBy,
        publishedAt: row.publishedAt?.toISOString() ?? null,
        rejectedReason: row.rejectedReason,
        createdAt: row.createdAt.toISOString(),
      }))
    );
  } catch (error) {
    console.error("[FAQ-LIST-02] ดึงรายการข้อถาม-ตอบไม่สำเร็จ:", error instanceof Error ? error.message : "Unknown");
    return ResponsePattern.error("[FAQ-LIST-02] ดึงรายการข้อถาม-ตอบไม่สำเร็จ");
  }
};
