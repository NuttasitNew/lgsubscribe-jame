import "server-only";
import prisma from "@/lib/seo/prisma";
import type { SeoArticleBlockContent } from "../type/seo-article-block.type";

/**
 * @description ประทับ `lastUsedAt` ให้รูปทุกใบใน contentJson ที่เพิ่งถูกบันทึก
 * @logic
 * - "ใช้อยู่จริง" ถูกตัดสินจาก contentJson เท่านั้น (ความจริงเดียวของบทความ) — ตารางคลังรูปเก็บแค่ประวัติการวาด
 * - อัปเดตทีเดียวด้วย updateMany ตาม url ที่พบ — ห้ามวนลูป update ทีละใบ
 * - จับข้าม seoArticleId โดยตั้งใจ: รูปใบเดียวถูกหยิบไปใช้ข้ามบทความได้ ใช้ที่ไหนก็นับว่าถูกใช้แล้ว
 * - ไม่มีรูปเลย = ไม่ยิง query
 * @param content เนื้อบทความฉบับที่เพิ่งบันทึก
 * @returns void
 * @used-by {@link ./save-seo-article.action.ts}
 * @related {@link ./record-article-image.helper.ts}
 */
export const markUsedArticleImages = async (content: SeoArticleBlockContent): Promise<void> => {
  const urls = new Set<string>();

  const cover = content.coverImage?.trim();
  if (cover) urls.add(cover);

  for (const block of content.blocks) {
    if (block.type !== "image") continue;
    const url = block.url?.trim();
    if (url) urls.add(url);
  }

  if (urls.size === 0) return;

  await prisma.seoArticleImage.updateMany({
    where: { url: { in: [...urls] } },
    data: { lastUsedAt: new Date() },
  });
};
