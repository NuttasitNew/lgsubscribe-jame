"use server";

import { cookies } from "next/headers";
import { verifyByToken } from "@/lib/seo/auth";
import { ResponsePattern, ResponsePatternType } from "@/lib/seo/helper/response-pattern";
import { fileLogger } from "@/lib/seo/logger";
import prisma from "@/lib/seo/prisma";
import { SeoArticleStatus } from "@prisma/client";
import { revalidateBlog } from "./public-blog-article.helper";

interface DeleteSeoArticleParams {
  seoArticleId: number;
}

/**
 * @description ลบบทความ SEO แบบ soft delete — หายจากหน้ารายการ และถ้าเคยขึ้นเว็บแล้วจะซ่อนบนเว็บด้วย
 * @page /super-admin/hurry-web/seo-article
 * @access super-admin
 * @logic
 * - **ห้าม hard delete เด็ดขาด** เหตุผล 2 ข้อ:
 *   1. slug ต้องถูกจองไว้ ไม่ให้บทความใหม่ไปใช้ URL เดิมที่ Google เคยเก็บไว้
 *   2. ตัวกันหัวข้อซ้ำของ AI อ่านจากบทความเดิมทั้งหมด ลบทิ้ง = AI เสนอหัวข้อเดิมวนกลับมาอีก
 * - บทความที่เคยเผยแพร่: push ไฟล์เดิมทับด้วย `hidden: true` เพื่อให้ hurry-web ข้ามบทความนั้น
 *   **จงใจไม่ลบไฟล์ทิ้ง** — เก็บไว้ให้กู้คืนได้ด้วยการพลิก flag แล้ว push ใหม่ ไม่ต้องประกอบเนื้อหาขึ้นมาใหม่
 * - ลำดับสำคัญ: push เว็บให้สำเร็จ**ก่อน** แล้วค่อยเขียน deletedAt ลงฐาน
 *   ถ้าเขียนฐานก่อนแล้ว push พัง จะได้สภาพ "หลังบ้านบอกลบแล้วแต่เว็บยังโชว์อยู่" ซึ่งมองไม่เห็นและไม่มีใครตามแก้
 *   ทางกลับกันถ้า push สำเร็จแต่เขียนฐานพลาด ผู้ใช้กดลบซ้ำได้ (push ทับ hidden=true เดิมไม่มีผลเสีย)
 * - ⚠️ ผลข้างเคียงที่ยอมรับไว้แล้ว: URL ที่ Google เคย index จะกลายเป็น 404 ทันที
 *   (hurry-web ตั้ง dynamicParams=false) ถ้าบทความนั้นมีทราฟฟิกอยู่ ควรทำ redirect แทนการลบ
 * @param params seoArticleId
 * @returns บทความที่ถูกลบ (สถานะเดิม + deletedAt)
 * @used-by {@link ../tanstack/delete-seo-article.mutation.ts}
 * @related {@link ./publish-seo-article.action.ts} (ตัว push ไฟล์ขึ้นเว็บ)
 */
export const deleteSeoArticle = async (
  params: DeleteSeoArticleParams
): Promise<ResponsePatternType<{ seoArticleId: number; hiddenOnWeb: boolean }>> => {
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
    return ResponsePattern.forbidden("[SEO-DEL-01] เฉพาะ super-admin เท่านั้น");
  }

  const log = fileLogger.session("ลบบทความ SEO", {
    type: "D",
    id: `SEO:${params.seoArticleId}`,
    userName: decoded.name || "unknown",
  });

  try {
    const article = await prisma.seoArticle.findUnique({
      where: { seoArticleId: params.seoArticleId },
      select: { slug: true, status: true, deletedAt: true },
    });
    if (!article) {
      log.error("ไม่พบบทความ");
      return ResponsePattern.notFound("[SEO-DEL-02] ไม่พบบทความ");
    }
    if (article.deletedAt) {
      log.error("ถูกลบไปแล้ว");
      return ResponsePattern.badRequest("[SEO-DEL-03] บทความนี้ถูกลบไปแล้ว");
    }

    // บทความที่ขึ้นเว็บอยู่จะหายจาก /blog ทันทีที่ deletedAt ถูกตั้ง (หน้าเว็บกรอง deletedAt: null)
    const hiddenOnWeb = article.status === SeoArticleStatus.PUBLISHED;

    await prisma.seoArticle.update({
      where: { seoArticleId: params.seoArticleId },
      data: { deletedAt: new Date(), deletedBy: decoded.name || "unknown" },
    });
    if (hiddenOnWeb) revalidateBlog(article.slug);

    log.end({ result: `SEO:${params.seoArticleId} hiddenOnWeb=${hiddenOnWeb}` });
    return ResponsePattern.ok(hiddenOnWeb ? "ลบบทความแล้ว และซ่อนออกจากเว็บเรียบร้อย" : "ลบบทความแล้ว", {
      seoArticleId: params.seoArticleId,
      hiddenOnWeb,
    });
  } catch (error) {
    log.error(error instanceof Error ? error.message : "Unknown");
    return ResponsePattern.error("[SEO-DEL-05] ลบบทความไม่สำเร็จ");
  } finally {
    log.end();
  }
};
