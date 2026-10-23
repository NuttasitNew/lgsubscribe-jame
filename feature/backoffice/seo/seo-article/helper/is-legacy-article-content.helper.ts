import type { SeoArticleContent } from "../type/seo-article-content.type";
import { SEO_ARTICLE_BLOCK_VERSION, type SeoArticleBlockContent } from "../type/seo-article-block.type";

/**
 * @description ตรวจว่า contentJson ที่อ่านมาเป็นโครงเก่า (sections + html) หรือไม่
 * @logic
 * - โครงเก่าไม่มี field `version` เลย และมี `sections` เป็น array → undefined = version 1
 * - โครงใหม่มี `version === 2` และมี `blocks` เป็น array
 * - ใช้ตัดสินว่าต้องส่งเข้า convertLegacyArticle ก่อนหรือใช้ได้เลย
 * @param content ค่าดิบจาก SeoArticle.contentJson (Prisma Json → unknown)
 * @returns true ถ้าเป็นโครงเก่า
 * @used-by feature seo-article (อ่าน contentJson ทุกจุด)
 * @related {@link ./convert-legacy-article.helper.ts}
 */
export function isLegacyArticleContent(content: unknown): content is SeoArticleContent {
  if (typeof content !== "object" || content === null) return false;
  const candidate = content as Record<string, unknown>;
  if (candidate.version === SEO_ARTICLE_BLOCK_VERSION) return false;
  return Array.isArray(candidate.sections);
}

/**
 * @description ตรวจว่า contentJson เป็นโครง block เวอร์ชันปัจจุบันแล้วหรือยัง
 * @logic เช็ค `version === 2` + `blocks` เป็น array (ไม่ validate ลึก — ใช้ zod schema ถ้าต้องการความแน่นอน)
 * @param content ค่าดิบจาก SeoArticle.contentJson
 * @returns true ถ้าเป็นโครง block แล้ว
 * @used-by feature seo-article (อ่าน contentJson ทุกจุด)
 * @related {@link ../constant/seo-article-block-schema.ts}
 */
export function isBlockArticleContent(content: unknown): content is SeoArticleBlockContent {
  if (typeof content !== "object" || content === null) return false;
  const candidate = content as Record<string, unknown>;
  return candidate.version === SEO_ARTICLE_BLOCK_VERSION && Array.isArray(candidate.blocks);
}
