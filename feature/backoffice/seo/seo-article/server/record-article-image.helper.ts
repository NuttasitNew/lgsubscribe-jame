import "server-only";
import { SeoArticleImagePlacement, SeoArticleImageStyle } from "@prisma/client";
import { fileLogger } from "@/lib/seo/logger";
import prisma from "@/lib/seo/prisma";

interface RecordArticleImageParams {
  seoArticleId: number;
  url: string;
  alt: string;
  prompt: string;
  placement: SeoArticleImagePlacement;
  style: SeoArticleImageStyle;
  createdBy: string;
}

/**
 * @description บันทึกรูปที่ AI วาดเสร็จลงคลังรูปของบทความ — ล้มเหลวแล้วกลืน ไม่โยนต่อ
 * @logic
 * - เรียกทันทีที่ upload R2 สำเร็จ ไม่ใช่ตอนกดบันทึกบทความ: ใบที่วาดแล้วผู้ใช้ไม่เลือกใช้
 *   ก็เสียเงินไปแล้วเหมือนกัน ต้องกลับมาหยิบได้
 * - **ห้าม throw** — คลังรูปเป็นของแถม ถ้าเขียนไม่ผ่านแล้วไปทำให้ flow วาดรูปพัง
 *   ผู้ใช้จะเสียทั้งค่า API และรูปที่วาดเสร็จแล้วไปพร้อมกัน จึงแค่ log ไว้ให้ตามได้
 * - ตารางนี้ไม่แตะ contentJson — หน้าแก้ไขยังเป็นเจ้าของร่างเหมือนเดิม
 * @param params รูป + บริบทที่ใช้วาด + คนสั่ง
 * @returns void (ผลลัพธ์ไม่มีผลต่อผู้เรียก)
 * @used-by {@link ./generate-single-article-image.action.ts}, {@link ./generate-seo-article-images.action.ts}
 * @related {@link ./find-seo-article-images.action.ts}
 */
export const recordArticleImage = async (params: RecordArticleImageParams): Promise<void> => {
  try {
    await prisma.seoArticleImage.create({
      data: {
        seoArticleId: params.seoArticleId,
        url: params.url,
        alt: params.alt,
        prompt: params.prompt,
        placement: params.placement,
        style: params.style,
        createdBy: params.createdBy,
      },
    });
  } catch (error) {
    const log = fileLogger.session("บันทึกคลังรูปบทความ", {
      type: "C",
      id: `SEO:${params.seoArticleId}`,
      userName: params.createdBy,
    });
    log.error(`[SEO-IMG-LIB-01] ${error instanceof Error ? error.message : "Unknown"}`);
    log.end();
  }
};
