/** จำนวนครั้งสูงสุดที่ยอมวนหา slug ว่าง — กันวน infinite ถ้า isTaken พังแล้วตอบ true ตลอด */
const MAX_SLUG_ATTEMPTS = 50;

/** slug สำรองเมื่อชื่อที่ได้มาแปลงเป็น kebab-case แล้วเหลือสตริงว่าง (เช่น AI ส่งชื่อไทยล้วนมา) */
const FALLBACK_SLUG = "seo-article";

/**
 * @description แปลงข้อความเป็น slug kebab-case ที่ hurry-web ยอมรับ
 * @logic
 * - hurry-web guard ด้วย `/^[a-z0-9]+(?:-[a-z0-9]+)*$/` (lib/content/blog.ts) — slug ที่ไม่ผ่านจะ 404
 *   ดังนั้นต้องเหลือแค่ a-z 0-9 และ `-` เท่านั้น
 * - อักขระที่ไม่ผ่าน (ไทย, เว้นวรรค, `_`, ตัวใหญ่) ถูกยุบเป็น `-` ตัวเดียว แล้วตัด `-` หัวท้ายทิ้ง
 * @param raw ข้อความตั้งต้น (slug ที่ AI เสนอมา)
 * @returns slug kebab-case (อาจเป็นสตริงว่างถ้าไม่เหลืออักขระที่ใช้ได้เลย)
 * @used-by {@link ./resolve-seo-article-slug.helper.ts}
 */
export const toKebabSlug = (raw: string): string =>
  raw
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/-{2,}/g, "-")
    .replace(/^-+|-+$/g, "");

/**
 * @description หา slug ที่ยังว่างจริงสำหรับบทความใหม่ — วนเติม -2, -3, ... จนกว่าจะไม่ชน
 * @logic
 * - บั๊กเดิม: เติม suffix ครั้งเดียว (`slug-yyyyMMdd`) แล้วยิง create เลย → ถ้า slug ที่เติมแล้วก็ชนอีก
 *   (เช่น กด "สร้างตอนนี้" ซ้ำในวันเดียวกัน หรือหัวข้อซ้ำ) จะระเบิดที่ constraint `@unique` ของ SeoArticle.slug
 *   ทำให้บทความที่ AI เขียนเสร็จแล้วหายทั้งเรื่อง (เสียค่า API ฟรี ๆ)
 * - ตัวนี้วนถามจนเจอช่องว่างจริง โดยเริ่มจาก slug เปล่า → `-2` → `-3` → ...
 * - ยังมีช่อง TOCTOU อยู่ (ถามแล้วค่อย create) — ผู้เรียกควรจับ error P2002 แล้วเรียกซ้ำอีกรอบ
 *   แต่เคสนี้เกิดยากมากเพราะสร้างบทความทีละเรื่องแบบ sequential
 * @param params baseSlug = slug ที่อยากได้, isTaken = ฟังก์ชันถามว่า slug นี้ถูกใช้แล้วหรือยัง (inject เพื่อ test ได้)
 * @returns slug ที่ยังว่าง
 * @throws เมื่อวนครบ maxAttempts แล้วยังไม่เจอช่องว่าง — `[SEO-SLUG-01]`
 * @used-by {@link ./generate-seo-article-drafts.helper.ts}
 */
export const resolveSeoArticleSlug = async (params: {
  baseSlug: string;
  isTaken: (slug: string) => Promise<boolean>;
  maxAttempts?: number;
}): Promise<string> => {
  const base = toKebabSlug(params.baseSlug) || FALLBACK_SLUG;
  const maxAttempts = params.maxAttempts ?? MAX_SLUG_ATTEMPTS;

  if (!(await params.isTaken(base))) return base;

  for (let suffix = 2; suffix <= maxAttempts; suffix += 1) {
    const candidate = `${base}-${suffix}`;
    if (!(await params.isTaken(candidate))) return candidate;
  }

  throw new Error(`[SEO-SLUG-01] หา slug ที่ยังว่างไม่ได้ (ลอง ${maxAttempts} ครั้งจาก "${base}")`);
};
