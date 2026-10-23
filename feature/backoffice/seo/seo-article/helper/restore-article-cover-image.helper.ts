import type { SeoArticleBlockContent } from "../type/seo-article-block.type";

/** ผลการกู้ปกหลัง gen รูปใหม่ */
export interface RestoreArticleCoverImageResult {
  content: SeoArticleBlockContent; // content ที่พร้อมเขียนลง DB / push ขึ้นเว็บ
  coverFailed: boolean; // true = job ปกไม่สำเร็จรอบนี้
  coverRestored: boolean; // true = คืนปกเดิมกลับมาแล้ว
}

/**
 * @description กู้ `coverImage` เดิมกลับ เมื่อรอบ gen รูปใหม่ทำปกไม่สำเร็จ — pure function
 * @logic
 * - ปุ่ม "สร้างรูปใหม่" ส่ง content ที่ล้างปกแล้วเข้า generateArticleImages เพื่อข้าม guard กันสร้างซ้ำ
 *   ถ้า job ปกถูก reject ผลลัพธ์จะไม่มี `coverImage` เลย
 * - ปล่อยผ่าน = บทความที่ Google index แล้วเสีย og:image + BlogPosting JSON-LD image ตกไปเป็นโลโก้
 *   + การ์ดแชร์ LINE/FB พัง และไม่มี rollback เพราะค่าเดิมถูกทับใน DB ไปแล้ว
 * - จึงคืนค่าเดิม (พร้อม alt เดิม) เมื่อ gen ปกพัง — รูปแทรกที่สำเร็จยังถูกเก็บตามปกติ
 * - ไม่มีปกเดิมให้คืน → คืน content เดิม แต่ยังรายงาน coverFailed ให้ผู้เรียก log
 * @param generated content ที่ได้จาก generateArticleImages
 * @param previousCoverImage ค่า coverImage ก่อน gen
 * @param previousCoverImageAlt ค่า coverImageAlt ก่อน gen
 * @returns content ที่กู้ปกแล้ว + สถานะว่าปกพัง/ถูกกู้หรือไม่
 * @used-by {@link ../server/generate-seo-article-images.action.ts}
 */
export function restoreArticleCoverImage(
  generated: SeoArticleBlockContent,
  previousCoverImage: string | undefined,
  previousCoverImageAlt: string | undefined
): RestoreArticleCoverImageResult {
  const coverFailed = !generated.coverImage?.trim();
  const previous = previousCoverImage?.trim();

  if (!coverFailed || !previous) {
    return { content: generated, coverFailed, coverRestored: false };
  }

  return {
    content: { ...generated, coverImage: previous, coverImageAlt: previousCoverImageAlt },
    coverFailed: true,
    coverRestored: true,
  };
}
