/**
 * @description คัดกรอง URL ของลิงก์ในบทความก่อนนำไปฝังเป็น href — pure function
 * @logic อนุญาตเฉพาะ http/https และ path ภายในเว็บที่ขึ้นต้น "/" (ไม่ใช่ "//" ที่เป็น protocol-relative)
 *        — `javascript:`, `data:`, `vbscript:` และ scheme อื่นทั้งหมดถูกตัดทิ้ง
 *        ห้ามพึ่ง safeguard ของ React/browser เป็นด่านเดียว ต้องกรองที่ต้นทางเสมอ
 * @param link ค่า link จาก run (อาจ undefined)
 * @returns href ที่ใช้ได้ (trim แล้ว) หรือ null ถ้าไม่ปลอดภัย
 * @used-by {@link ../server/render-blocks-to-sections.helper.ts}, {@link ../constant/seo-article-block-schema.ts}
 */
export function toSafeArticleHref(link: string | undefined): string | null {
  if (!link) return null;
  const trimmed = link.trim();
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  if (trimmed.startsWith("/") && !trimmed.startsWith("//")) return trimmed;
  return null;
}

/**
 * @description ตรวจว่าค่า link ของ run ผ่านเกณฑ์ปลอดภัยหรือไม่ (ว่าง/ไม่มี = ผ่าน เพราะเป็น optional)
 * @logic ใช้เป็น predicate ของ zod `.refine()` — บล็อกไม่ให้ scheme อันตรายถูกบันทึกลง contentJson ตั้งแต่ต้นทาง
 * @param link ค่า link จาก run
 * @returns true = บันทึกได้
 * @used-by {@link ../constant/seo-article-block-schema.ts}
 */
export function isSafeArticleHref(link: string | undefined): boolean {
  if (!link || link.trim().length === 0) return true;
  return toSafeArticleHref(link) !== null;
}
