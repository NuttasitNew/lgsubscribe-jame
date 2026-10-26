"use server";

import { cookies } from "next/headers";
import { verifyByToken } from "@/lib/seo/auth";
import { ResponsePattern, ResponsePatternType } from "@/lib/seo/helper/response-pattern";
import { fileLogger } from "@/lib/seo/logger";
import prisma from "@/lib/seo/prisma";
import { SeoArticleImage, SeoArticleImagePlacement } from "@prisma/client";

/** รูป 1 ใบในคลัง + ชื่อบทความต้นทาง (มีเฉพาะแท็บ "จากบทความอื่น") */
export interface SeoArticleImageItem extends SeoArticleImage {
  articleTitle: string; // ชื่อบทความที่วาดใบนี้ — บอกผู้ใช้ว่ารูปมาจากเรื่องไหน
}

/** คลังรูปแยก 2 กอง ตามที่หน้าแก้ไขต้องแสดงเป็นคนละแท็บ */
export interface SeoArticleImageLibrary {
  ownImages: SeoArticleImageItem[]; // รูปที่วาดให้บทความนี้
  otherImages: SeoArticleImageItem[]; // รูปจากบทความอื่น — หยิบมาใช้ซ้ำได้ ไม่ต้องเสียค่า gen ใหม่
}

interface FindSeoArticleImagesParams {
  seoArticleId: number;
  /** ดึงเฉพาะรูปที่วาดมาเพื่อตำแหน่งนี้ — ปกกับรูปแทรกคนละมุมภาพ ปนกันแล้วเลือกผิด */
  placement: SeoArticleImagePlacement;
}

/** เพดานรูปจากบทความอื่นต่อครั้ง — คลังโตเรื่อย ๆ ดึงหมดจะหนักทั้ง query และหน้าจอ */
const OTHER_IMAGE_LIMIT = 60;

/**
 * @description ดึงคลังรูปที่ AI เคยวาด — แยกเป็นของบทความนี้ กับของบทความอื่นที่หยิบมาใช้ซ้ำได้
 * @page /super-admin/hurry-web/seo-article?edit=<id>
 * @access super-admin
 * @logic
 * - รูปทุกใบมีค่าใช้จ่ายจริงต่อใบ (gpt-image-2.5-sunburst) จึงต้องเลือกกลับมาใช้ได้ทั้งของตัวเองและข้ามบทความ
 * - กรองด้วย placement เสมอ: รูปปกเป็นมุมกว้างใช้เป็น og:image ส่วนรูปแทรกเป็นภาพประกอบหัวข้อ
 *   เอามาปนกันแล้วผู้ใช้จะเลือกรูปผิดสัดส่วนขึ้นเว็บ
 * - "บทความอื่น" ตัดบทความที่ถูกลบทิ้งไปแล้วออก (deletedAt) และจำกัด {@link OTHER_IMAGE_LIMIT} ใบล่าสุด
 * - เรียงใหม่→เก่า ทั้งสองกอง — ใบที่เพิ่งวาดคือใบที่ผู้ใช้กำลังตามหา
 * @param params seoArticleId + ตำแหน่งรูปที่กำลังจะแทน
 * @returns คลังรูป 2 กอง (ownImages / otherImages)
 * @used-by {@link ../tanstack/find-seo-article-images.query.ts}
 * @related {@link ./record-article-image.helper.ts}
 */
export const findSeoArticleImages = async (
  params: FindSeoArticleImagesParams
): Promise<ResponsePatternType<SeoArticleImageLibrary>> => {
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
    return ResponsePattern.forbidden("[SEO-IMG-LIB-02] เฉพาะ super-admin เท่านั้น");
  }

  const log = fileLogger.session("ดึงคลังรูปบทความ", {
    type: "R",
    id: `SEO:${params.seoArticleId}`,
    userName: decoded.name || "unknown",
  });

  try {
    // 2 ชุดยิงพร้อมกัน — คนละเงื่อนไข ไม่มีอันไหนต้องรอผลอีกอัน
    const [own, others] = await Promise.all([
      prisma.seoArticleImage.findMany({
        where: { seoArticleId: params.seoArticleId, placement: params.placement },
        orderBy: { createdAt: "desc" },
      }),
      prisma.seoArticleImage.findMany({
        where: {
          seoArticleId: { not: params.seoArticleId },
          placement: params.placement,
          seoArticle: { deletedAt: null },
        },
        orderBy: { createdAt: "desc" },
        take: OTHER_IMAGE_LIMIT,
        include: { seoArticle: { select: { title: true } } },
      }),
    ]);

    const data: SeoArticleImageLibrary = {
      ownImages: own.map((image) => ({ ...image, articleTitle: "" })),
      otherImages: others.map(({ seoArticle, ...image }) => ({ ...image, articleTitle: seoArticle.title })),
    };

    log.end({ result: `own ${own.length} / อื่น ${others.length}` });
    return ResponsePattern.ok("ดึงข้อมูลสำเร็จ", data);
  } catch (error) {
    log.error(error instanceof Error ? error.message : "Unknown");
    return ResponsePattern.error("[SEO-IMG-LIB-03] ดึงคลังรูปไม่สำเร็จ");
  } finally {
    log.end();
  }
};
