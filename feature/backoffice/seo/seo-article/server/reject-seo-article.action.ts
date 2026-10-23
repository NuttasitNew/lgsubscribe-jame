"use server";

import { cookies } from "next/headers";
import { verifyByToken } from "@/lib/seo/auth";
import { ResponsePattern, ResponsePatternType } from "@/lib/seo/helper/response-pattern";
import { fileLogger } from "@/lib/seo/logger";
import prisma from "@/lib/seo/prisma";
import { SeoArticle, SeoArticleStatus } from "@prisma/client";

interface RejectSeoArticleParams {
  seoArticleId: number;
  reason?: string; // เหตุผล (optional)
}

/**
 * @description ปัดตกร่างบทความ SEO — เก็บ record ไว้ (ไม่ลบ) เพื่อกัน AI เสนอหัวข้อเดิมซ้ำ
 * @page /super-admin/hurry-web/seo-article
 * @access super-admin
 * @used-by {@link reject-seo-article.mutation.ts}
 */
export const rejectSeoArticle = async (params: RejectSeoArticleParams): Promise<ResponsePatternType<SeoArticle>> => {
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
    return ResponsePattern.forbidden("[SEO-ART-30] เฉพาะ super-admin เท่านั้น");
  }

  const log = fileLogger.session("ปัดตกร่างบทความ SEO", {
    type: "U",
    id: `SEO:${params.seoArticleId}`,
    userName: decoded.name || "unknown",
  });

  try {
    const existing = await prisma.seoArticle.findUnique({
      where: { seoArticleId: params.seoArticleId },
      select: { status: true },
    });
    if (!existing) {
      log.error("ไม่พบบทความ");
      return ResponsePattern.notFound("[SEO-ART-31] ไม่พบบทความ");
    }
    if (existing.status !== SeoArticleStatus.DRAFT) {
      log.error(`ปัดตกไม่ได้ status=${existing.status}`);
      return ResponsePattern.badRequest("[SEO-ART-32] ปัดตกได้เฉพาะร่าง (DRAFT) เท่านั้น");
    }

    const result = await prisma.seoArticle.update({
      where: { seoArticleId: params.seoArticleId },
      data: { status: SeoArticleStatus.REJECTED, rejectedReason: params.reason || null },
    });

    log.end({ result: `SEO:${params.seoArticleId}` });
    return ResponsePattern.ok("ปัดตกร่างแล้ว", result);
  } catch (error) {
    log.error(error instanceof Error ? error.message : "Unknown");
    return ResponsePattern.error("[SEO-ART-33] ปัดตกร่างไม่สำเร็จ");
  } finally {
    log.end();
  }
};
