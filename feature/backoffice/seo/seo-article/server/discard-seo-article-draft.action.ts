"use server";

import { cookies } from "next/headers";
import { verifyByToken } from "@/lib/seo/auth";
import { ResponsePattern, ResponsePatternType } from "@/lib/seo/helper/response-pattern";
import { fileLogger } from "@/lib/seo/logger";
import prisma from "@/lib/seo/prisma";
import { Prisma } from "@prisma/client";

export interface DiscardSeoArticleDraftResult {
  /** updatedAt ใหม่ของแถว — หน้าแก้ไขต้องเอาไปแทนค่าที่ถืออยู่ (ใช้ชนกันตอนกดบันทึก) */
  updatedAt: Date;
}

/**
 * @description ทิ้งร่างที่ค้างอยู่ของบทความ — ล้าง draftJson ทิ้ง ไม่แตะเนื้อบทความจริง
 * @page /super-admin/hurry-web/seo-article?edit=<id>
 * @access super-admin
 * @logic
 * - เรียกจาก 2 ทาง: ผู้ใช้กด "ทิ้งที่แก้" และ หลังกดบันทึก/เผยแพร่สำเร็จ (ร่างถูกย้ายขึ้นเนื้อจริงแล้ว)
 * - ทิ้งร่างเป็นการทำลายงานที่พิมพ์ค้างไว้ จึง log ไว้ว่าใครทิ้งของบทความไหน — ตามรอยได้ถ้ามีคนทักว่างานหาย
 * - ไม่ใช่ soft delete: ร่างเป็นของชั่วคราวระหว่างแก้ ไม่ใช่ข้อมูลบทความที่ต้องเก็บย้อนหลัง
 * @param seoArticleId บทความที่จะล้างร่าง
 * @returns updatedAt ใหม่ของแถว
 * @used-by {@link ../tanstack/discard-seo-article-draft.mutation.ts}
 * @related {@link ./save-seo-article-draft.action.ts}
 */
export const discardSeoArticleDraft = async (
  seoArticleId: number
): Promise<ResponsePatternType<DiscardSeoArticleDraftResult>> => {
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
    return ResponsePattern.forbidden("[SEO-DRAFT-10] เฉพาะ super-admin เท่านั้น");
  }

  const log = fileLogger.session("ทิ้งร่างบทความที่ค้างไว้", {
    type: "D",
    id: `SEO:${seoArticleId}`,
    userName: decoded.name || "unknown",
  });

  try {
    const updated = await prisma.seoArticle.update({
      where: { seoArticleId },
      // Prisma.DbNull = เขียน NULL จริงลงคอลัมน์ Json (ต่างจาก JsonNull ที่เก็บค่า JSON `null` ไว้ในช่อง)
      data: { draftJson: Prisma.DbNull, draftSavedAt: null, draftSavedBy: null },
      select: { updatedAt: true },
    });

    return ResponsePattern.ok("ทิ้งร่างแล้ว", { updatedAt: updated.updatedAt });
  } catch (error) {
    log.error(error instanceof Error ? error.message : "Unknown");
    return ResponsePattern.error("[SEO-DRAFT-11] ทิ้งร่างไม่สำเร็จ");
  } finally {
    log.end();
  }
};
