/** meta ภาษาอังกฤษของบทความ — ค่าว่างทั้งชุด = บทความนี้ไม่มีหน้า /en/blog/<slug> */
export interface SeoArticleEnMeta {
  titleEn: string;
  metaDescriptionEn: string;
  keywordsEn: string[];
}

/**
 * @description อ่าน meta ภาษาอังกฤษออกจากแถวบทความ ให้ได้ค่าที่ฟอร์มใช้ได้ทันทีเสมอ (ไม่มีค่า = สตริงว่าง/อาเรย์ว่าง)
 * @logic
 * - รับ `unknown` แล้วเช็คทีละ field เอง **โดยตั้งใจ** — คอลัมน์ชุด EN เพิ่งถูกเพิ่มเข้า schema
 *   แถวเก่าทุกแถวเป็น null และ Prisma client บนเครื่องที่ยังไม่ได้ generate จะยังไม่รู้จัก field พวกนี้
 *   ถ้าผูกกับ type ของ Prisma ตรง ๆ หน้าแก้ไขจะพังทั้งหน้าเพียงเพราะลำดับการ deploy ไม่ตรงกัน
 * - keywordsEn คัดเฉพาะสตริงที่มีตัวอักษรจริง — ค่าขยะใน JSON ต้องไม่ไหลเข้าไปเป็นคำค้นบนหน้าเว็บ
 * @param row แถว SeoArticle ที่ได้จาก server action
 * @returns meta EN ที่ normalize แล้ว
 * @used-by seo-article-editor-page.tsx
 * @related {@link ../components/seo-article-en-meta-form.tsx}
 */
export function readSeoArticleEnMeta(row: unknown): SeoArticleEnMeta {
  const source = (row ?? {}) as Record<string, unknown>;

  const titleEn = typeof source.titleEn === "string" ? source.titleEn : "";
  const metaDescriptionEn = typeof source.metaDescriptionEn === "string" ? source.metaDescriptionEn : "";
  const keywordsEn = Array.isArray(source.keywordsEn)
    ? source.keywordsEn.filter((keyword): keyword is string => typeof keyword === "string" && keyword.trim() !== "")
    : [];

  return { titleEn, metaDescriptionEn, keywordsEn };
}
