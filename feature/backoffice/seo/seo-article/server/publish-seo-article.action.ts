"use server";

import { cookies } from "next/headers";
import { verifyByToken } from "@/lib/seo/auth";
import { ResponsePattern, ResponsePatternType } from "@/lib/seo/helper/response-pattern";
import { fileLogger } from "@/lib/seo/logger";
import prisma from "@/lib/seo/prisma";
import { SeoArticle, SeoArticleStatus } from "@prisma/client";
import { buildPublicBlogArticle, revalidateBlog } from "./public-blog-article.helper";

interface PublishSeoArticleParams {
  seoArticleId: number;
}

/**
 * @description เผยแพร่บทความ SEO ขึ้นหน้า /blog/<slug> ของ lg-jame (อ่านจากฐานข้อมูลโดยตรง)
 * @page /backoffice/seo/
 * @access seo.manage
 * @logic
 * 1. เผยแพร่ได้ทั้ง DRAFT (ครั้งแรก) และ PUBLISHED (แก้แล้วเผยแพร่ซ้ำ)
 * 2. ประกอบหน้าเว็บด้วย buildPublicBlogArticle ตัวเดียวกับที่หน้า /blog ใช้ — ไม่ผ่าน = ไม่เผยแพร่
 * 3. วันเผยแพร่ครั้งแรกไม่ขยับเมื่อเผยแพร่ซ้ำ
 * 4. สำเร็จแล้ว revalidate /blog, /blog/<slug> และ sitemap ให้หน้าเว็บเห็นทันที
 * @used-by {@link publish-seo-article.mutation.ts}
 */
export const publishSeoArticle = async (params: PublishSeoArticleParams): Promise<ResponsePatternType<SeoArticle>> => {
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
    return ResponsePattern.forbidden("[SEO-ART-20] เฉพาะ super-admin เท่านั้น");
  }

  const log = fileLogger.session("เผยแพร่บทความ SEO", {
    type: "U",
    id: `SEO:${params.seoArticleId}`,
    userName: decoded.name || "unknown",
  });

  try {
    const article = await prisma.seoArticle.findUnique({
      where: { seoArticleId: params.seoArticleId },
    });
    if (!article || article.deletedAt) {
      log.error("ไม่พบบทความ");
      return ResponsePattern.notFound("[SEO-ART-21] ไม่พบบทความ");
    }
    const isRepublish = article.status === SeoArticleStatus.PUBLISHED;
    if (article.status !== SeoArticleStatus.DRAFT && !isRepublish) {
      log.error(`เผยแพร่ไม่ได้ status=${article.status}`);
      return ResponsePattern.badRequest("[SEO-ART-22] เผยแพร่ได้เฉพาะร่าง (DRAFT) หรือบทความที่เผยแพร่แล้ว");
    }

    const publishedAt = article.publishedAt ?? new Date(); // เผยแพร่ซ้ำไม่ขยับวันเผยแพร่ครั้งแรก
    const pageCheck = buildPublicBlogArticle({ ...article, publishedAt });
    if (!pageCheck.success) {
      log.error(`หน้าเว็บไม่ผ่านการตรวจ: ${pageCheck.detail}`);
      return ResponsePattern.validationError(
        `[SEO-ART-26] บทความไม่ผ่านการตรวจ ยังไม่เผยแพร่ — ${pageCheck.detail} (แก้ในหน้าแก้ไขแล้วบันทึกก่อน)`
      );
    }

    const result = await prisma.seoArticle.update({
      where: { seoArticleId: params.seoArticleId },
      data: {
        status: SeoArticleStatus.PUBLISHED,
        publishedAt,
        approvedBy: decoded.name || decoded.userId,
      },
    });
    revalidateBlog(article.slug);

    log.end({ result: `SEO:${params.seoArticleId}` });
    return ResponsePattern.ok(isRepublish ? "อัปเดตบทความบนเว็บแล้ว" : "เผยแพร่บทความขึ้นเว็บแล้ว", result);
  } catch (error) {
    log.error(error instanceof Error ? error.message : "Unknown");
    return ResponsePattern.error("[SEO-ART-24] เผยแพร่ไม่สำเร็จ");
  } finally {
    log.end();
  }
};
