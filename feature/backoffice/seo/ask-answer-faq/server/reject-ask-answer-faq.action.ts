"use server";

import { cookies } from "next/headers";
import { verifyByToken } from "@/lib/seo/auth";
import { ResponsePattern, ResponsePatternType } from "@/lib/seo/helper/response-pattern";
import { fileLogger } from "@/lib/seo/logger";
import prisma from "@/lib/seo/prisma";
import { AskAnswerFaqStatus } from "@prisma/client";

export interface RejectAskAnswerFaqParams {
  askAnswerFaqId: number;
  /** เหตุผล (ไม่บังคับ) — ช่วยให้ย้อนดูได้ว่าทำไมข้อแนวนี้ถึงไม่เอา */
  reason?: string;
}

/**
 * @description ปัดตกข้อถาม-ตอบที่ AI เสนอ — ไม่ลบทิ้ง เพื่อกัน AI เสนอคำถามเดิมซ้ำรอบหน้า
 * @page /super-admin/hurry-web/seo-article?section=faq
 * @access super-admin
 * @logic
 * - **ห้าม hard delete** เหตุผลเดียวกับ SeoArticle.REJECTED: แถวที่หายไปแปลว่า AI ไม่รู้ว่าเคยเสนอแล้ว
 *   แล้วจะเสนอคำถามเดิมกลับมาทุกรอบจนคนกดปัดตกเลิกใช้ปุ่ม
 * - ปัดตกได้เฉพาะ DRAFT — ข้อที่ขึ้นเว็บแล้วต้องเอาออกจากไฟล์ก่อน ไม่ใช่เปลี่ยนสถานะในฐานเฉย ๆ
 *   (เปลี่ยนสถานะอย่างเดียวจะได้ข้อที่ระบบคิดว่า "ไม่เอาแล้ว" แต่ยังโชว์อยู่บนหน้าเว็บจริง)
 * @param params เลขข้อ + เหตุผล
 * @returns เลขข้อที่ปัดตก
 * @used-by {@link ../tanstack/reject-ask-answer-faq.mutation.ts}
 */
export const rejectAskAnswerFaq = async (
  params: RejectAskAnswerFaqParams
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
    return ResponsePattern.forbidden("[FAQ-REJ-01] เฉพาะ super-admin เท่านั้น");
  }

  const log = fileLogger.session("ปัดตกข้อถาม-ตอบ", {
    type: "U",
    id: `FAQ:${params.askAnswerFaqId}`,
    userName: decoded.name || "unknown",
  });

  try {
    const rejected = await prisma.askAnswerFaq.updateMany({
      where: { askAnswerFaqId: params.askAnswerFaqId, status: AskAnswerFaqStatus.DRAFT },
      data: {
        status: AskAnswerFaqStatus.REJECTED,
        rejectedReason: params.reason?.trim() || null,
      },
    });

    if (rejected.count === 0) {
      log.error("ไม่พบข้อ หรือข้อนี้ไม่ใช่ร่างแล้ว");
      return ResponsePattern.badRequest("[FAQ-REJ-02] ปัดตกได้เฉพาะข้อที่ยังไม่เผยแพร่");
    }

    log.end({ result: "rejected" });
    return ResponsePattern.ok("ปัดตกแล้ว", { askAnswerFaqId: params.askAnswerFaqId });
  } catch (error) {
    log.error(error instanceof Error ? error.message : "Unknown");
    return ResponsePattern.error("[FAQ-REJ-03] ปัดตกไม่สำเร็จ");
  } finally {
    log.end();
  }
};
