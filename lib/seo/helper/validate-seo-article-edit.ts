import type { SeoArticleEditSnapshot } from "./is-seo-article-edit-equal";

/** ปัญหาที่ต้องแก้ก่อนกดบันทึกได้ — ทุกข้อมี code เฉพาะเพื่อให้ผู้ใช้แจ้งกลับมาแล้วตามได้ถูกจุด */
export interface SeoArticleEditIssue {
  code: string;
  message: string;
}

export interface ValidateSeoArticleEditOptions {
  /** slug ที่ล็อกไว้ (บทความที่เผยแพร่แล้ว) — ถ้าส่งมาแล้วค่าใน snapshot ไม่ตรง ถือว่าผิด */
  lockedSlug?: string;
}

/** รูปแบบ slug ที่หน้า /blog ของ hurry-web ยอมรับ — นอกเหนือจากนี้เว็บคืน 404 ทันที */
const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/**
 * @description ตรวจบทความก่อนบันทึก — คืนรายการปัญหาที่ต้องแก้ (ว่าง = บันทึกได้)
 * @logic
 * - [SEO-EDT-30] ต้องมีชื่อบทความ (เว็บใช้เป็น h1 + og:title)
 * - [SEO-EDT-31] slug ต้องเป็น kebab-case อังกฤษพิมพ์เล็ก มิฉะนั้นเว็บ guard ตัดเป็น 404
 * - [SEO-EDT-32] ต้องมี meta description (ใช้เป็นคำอธิบายบนหน้าผลค้นหา)
 * - [SEO-EDT-33] ต้องมีคำค้นอย่างน้อย 1 คำ เพราะคำแรกคือคำเป้าหมายที่ใช้วัดผลกับ Search Console
 * - [SEO-EDT-34] ต้องมีเนื้อหาอย่างน้อย 1 บล็อก
 * - [SEO-EDT-35] ทุกรูปต้องมีคำอธิบาย (alt) — เป็นข้อบังคับด้าน SEO และการเข้าถึง
 * - [SEO-EDT-36] FAQ ต้องกรอกครบทั้งคำถามและคำตอบ เพราะถูกยัดลง FAQPage JSON-LD ตรง ๆ
 * - [SEO-EDT-20] บทความที่เผยแพร่แล้วห้ามเปลี่ยน slug (ลิงก์เดิมที่ Google เก็บไว้จะกลายเป็น 404)
 * - [SEO-EDT-40]/[SEO-EDT-41] meta EN ต้องมีทั้งชื่อและ meta description หรือไม่มีเลย —
 *   ว่างทั้งชุด = บทความไทยล้วน (/en/blog/<slug> คืน 404 ตามตั้งใจ) แต่กรอกครึ่งเดียว = หน้าอังกฤษที่ขาด metadata
 * @param snapshot ฉบับที่กำลังจะบันทึก
 * @param options.lockedSlug slug เดิมของบทความที่เผยแพร่แล้ว
 * @returns รายการปัญหา (ว่าง = ผ่าน)
 * @used-by seo-article-editor-page.tsx
 * @related {@link is-seo-article-edit-equal.ts}
 */
export function validateSeoArticleEdit(
  snapshot: SeoArticleEditSnapshot,
  options: ValidateSeoArticleEditOptions = {}
): SeoArticleEditIssue[] {
  const issues: SeoArticleEditIssue[] = [];
  const slug = snapshot.slug.trim();

  if (!snapshot.title.trim()) {
    issues.push({ code: "SEO-EDT-30", message: "ยังไม่ได้ตั้งชื่อบทความ" });
  }

  if (!SLUG_PATTERN.test(slug)) {
    issues.push({
      code: "SEO-EDT-31",
      message: "URL ต้องเป็นภาษาอังกฤษพิมพ์เล็ก คั่นคำด้วย - เท่านั้น (เช่น mattress-cleaning-guide)",
    });
  }

  if (options.lockedSlug && slug !== options.lockedSlug.trim()) {
    issues.push({
      code: "SEO-EDT-20",
      message: `บทความนี้เผยแพร่แล้ว ห้ามเปลี่ยน URL — ต้องเป็น ${options.lockedSlug} เท่านั้น`,
    });
  }

  if (!snapshot.metaDescription.trim()) {
    issues.push({ code: "SEO-EDT-32", message: "ยังไม่ได้เขียนคำอธิบายใต้ชื่อบนหน้า Google (meta description)" });
  }

  if (snapshot.keywords.filter((keyword) => keyword.trim()).length === 0) {
    issues.push({ code: "SEO-EDT-33", message: "ต้องมีคำค้นอย่างน้อย 1 คำ (คำแรกคือคำเป้าหมายที่ใช้วัดผล)" });
  }

  const blocks = snapshot.content?.blocks ?? [];
  if (blocks.length === 0) {
    issues.push({ code: "SEO-EDT-34", message: "บทความยังไม่มีเนื้อหาสักบล็อก" });
  }

  const imagesWithoutAlt = blocks.filter((block) => block.type === "image" && !block.alt.trim()).length;
  if (imagesWithoutAlt > 0) {
    issues.push({
      code: "SEO-EDT-35",
      message: `มีรูป ${imagesWithoutAlt} รูปที่ยังไม่ได้กรอกคำอธิบายรูป (alt)`,
    });
  }

  const incompleteFaq = (snapshot.content?.faq ?? []).filter(
    (item) => !item.question.trim() || !item.answer.trim()
  ).length;
  if (incompleteFaq > 0) {
    issues.push({
      code: "SEO-EDT-36",
      message: `มีคำถามที่พบบ่อย ${incompleteFaq} ข้อที่กรอกไม่ครบ (ต้องมีทั้งคำถามและคำตอบ)`,
    });
  }

  // meta EN — ไม่กรอกเลยคือกรณีปกติ (บทความไทยล้วน) แต่กรอกครึ่ง ๆ กลาง ๆ ปล่อยขึ้นเว็บไม่ได้
  const titleEn = snapshot.titleEn?.trim() ?? "";
  const metaDescriptionEn = snapshot.metaDescriptionEn?.trim() ?? "";
  const keywordsEnCount = (snapshot.keywordsEn ?? []).filter((keyword) => keyword.trim()).length;

  if (titleEn || metaDescriptionEn || keywordsEnCount > 0) {
    if (!titleEn) {
      issues.push({ code: "SEO-EDT-40", message: "กรอกข้อมูลภาษาอังกฤษไว้แล้ว แต่ยังไม่มีชื่อบทความภาษาอังกฤษ" });
    }
    if (!metaDescriptionEn) {
      issues.push({
        code: "SEO-EDT-41",
        message: "กรอกข้อมูลภาษาอังกฤษไว้แล้ว แต่ยังไม่มีคำอธิบายบนหน้า Google ภาษาอังกฤษ (meta description)",
      });
    }
  }

  return issues;
}
