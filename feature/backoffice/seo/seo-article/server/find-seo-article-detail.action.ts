"use server";

import { cookies } from "next/headers";
import { verifyByToken } from "@/lib/seo/auth";
import { ResponsePattern, ResponsePatternType } from "@/lib/seo/helper/response-pattern";
import { fileLogger } from "@/lib/seo/logger";
import prisma from "@/lib/seo/prisma";
import { SeoArticle } from "@prisma/client";
import { seoArticleBlockContentSchema } from "../constant/seo-article-block-schema";
import { convertLegacyArticle } from "../helper/convert-legacy-article.helper";
import { isBlockArticleContent, isLegacyArticleContent } from "../helper/is-legacy-article-content.helper";
import type { SeoArticleBlockContent } from "../type/seo-article-block.type";

/** บทความ 1 เรื่องพร้อมเนื้อหาที่แปลงเป็นโครง block แล้ว — editor ใช้ก้อนนี้ก้อนเดียว */
export interface SeoArticleDetail {
  article: SeoArticle; // แถวดิบจาก DB (contentJson ยังเป็นของเดิมในฐาน) — ใช้ updatedAt เป็นตัวชนกันตอนเซฟ
  content: SeoArticleBlockContent; // เนื้อหาโครง block v2 เสมอ (แถวเก่าแปลงให้แล้วในหน่วยความจำ)
  isLegacy: boolean; // true = แถวนี้ยังเก็บโครง v1 ในฐาน จะกลายเป็น v2 เมื่อ super-admin กดบันทึกครั้งแรก
  contentWarnings: string[]; // จุดที่แปลงจากโครงเก่าแล้วเสียรายละเอียด (แสดงเตือนในหน้าแก้ไข)
}

interface FindSeoArticleDetailParams {
  seoArticleId: number;
}

/**
 * @description ดึงบทความ SEO เรื่องเดียวแบบสด ๆ สำหรับหน้าแก้ไข (ไม่พึ่งข้อมูลจาก list ที่อาจเก่า)
 * @page /super-admin/hurry-web/seo-article
 * @access super-admin
 * @logic
 * - list ตัด contentJson ออกเพื่อความเบา → editor ต้องโหลดเรื่องเดียวเองจาก action นี้
 * - contentJson โครงเก่า (v1 sections+html) ถูกแปลงเป็น block v2 ในหน่วยความจำก่อนส่งกลับ
 *   ฐานยังเก็บของเดิมไว้จนกว่าจะกดบันทึก — ไม่มี write ใน action นี้
 * - โครงที่พังจริง ๆ (ไม่ใช่ทั้ง v1 และ v2 หรือ v2 ที่ผิด schema) ตีกลับเป็น error ไม่ปล่อยเข้า editor
 * @used-by {@link find-seo-article-detail.query.ts}
 * @related {@link save-seo-article.action.ts}, {@link ../helper/convert-legacy-article.helper.ts}
 */
export const findSeoArticleDetail = async (
  params: FindSeoArticleDetailParams
): Promise<ResponsePatternType<SeoArticleDetail>> => {
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
    return ResponsePattern.forbidden("[SEO-DET-01] เฉพาะ super-admin เท่านั้น");
  }

  const log = fileLogger.session("ดึงบทความ SEO เรื่องเดียว", {
    type: "R",
    id: `SEO:${params.seoArticleId}`,
    userName: decoded.name || "unknown",
  });

  try {
    // บทความที่ถูกลบต้องเปิดไม่ได้ด้วย — ไม่งั้นลิงก์เก่า/ปุ่ม back จะพากลับเข้าหน้าแก้ไขของบทความที่ลบไปแล้ว
    const article = await prisma.seoArticle.findFirst({
      where: { seoArticleId: params.seoArticleId, deletedAt: null },
    });
    if (!article) {
      log.error("ไม่พบบทความ");
      return ResponsePattern.notFound("[SEO-DET-02] ไม่พบบทความ");
    }

    const rawContent = article.contentJson as unknown;

    if (isLegacyArticleContent(rawContent)) {
      const converted = convertLegacyArticle(rawContent);
      log.end({ result: `v1→v2 ${converted.content.blocks.length} block` });
      return ResponsePattern.ok("ดึงข้อมูลสำเร็จ", {
        article,
        content: converted.content,
        isLegacy: true,
        contentWarnings: converted.warnings,
      });
    }

    if (!isBlockArticleContent(rawContent)) {
      log.error("contentJson ไม่ใช่ทั้งโครงเก่าและโครง block");
      return ResponsePattern.error("[SEO-DET-03] โครงเนื้อหาของบทความนี้อ่านไม่ได้ — ต้องแก้ข้อมูลในฐานก่อน");
    }

    const parsed = seoArticleBlockContentSchema.safeParse(rawContent);
    if (!parsed.success) {
      const issue = parsed.error.issues[0];
      log.error(`contentJson ผิด schema: ${issue?.path.join(".")} ${issue?.message}`);
      return ResponsePattern.error("[SEO-DET-04] โครงเนื้อหาของบทความนี้ไม่ตรงสเปก — ต้องแก้ข้อมูลในฐานก่อน");
    }

    log.end({ result: `${parsed.data.blocks.length} block` });
    return ResponsePattern.ok("ดึงข้อมูลสำเร็จ", {
      article,
      content: parsed.data,
      isLegacy: false,
      contentWarnings: [],
    });
  } catch (error) {
    log.error(error instanceof Error ? error.message : "Unknown");
    return ResponsePattern.error("[SEO-DET-05] ดึงบทความไม่สำเร็จ");
  } finally {
    log.end();
  }
};
