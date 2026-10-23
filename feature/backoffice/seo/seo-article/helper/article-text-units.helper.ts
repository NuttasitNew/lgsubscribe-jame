import type { SeoArticleBlockContent } from "../type/seo-article-block.type";

/**
 * @description แตกบทความเป็น "รายการข้อความล้วน" เรียงตายตัว เพื่อส่งไปแปล แล้วประกอบกลับที่ตำแหน่งเดิม
 * @logic
 * - แปลทั้งบทความด้วยการให้ AI คืนโครงบล็อกทั้งก้อนเสี่ยงเกินไป: บล็อกหาย ชนิดเพี้ยน รูปหลุด ลำดับสลับ
 *   วิธีนี้ AI แตะได้แค่ "ข้อความ" ส่วนโครงสร้าง/รูป/ลิงก์/ตัวหนา ถูกประกอบกลับด้วยโค้ดล้วน
 * - ลำดับต้องคงที่ระหว่าง collect กับ apply เสมอ — ทั้งคู่เดินโครงเดียวกันตามลำดับนี้:
 *   บล็อกตามลำดับ (runs / items / cells / alt+caption) → faq ทีละข้อ (question, answer)
 * - title/metaDescription/keywords **ไม่อยู่ในชุดนี้** เพราะเป็น field ของบทความ ไม่ได้อยู่ใน content
 *   (ตัวแปลส่งไปแยกต่างหากและเก็บลง titleEn/metaDescriptionEn/keywordsEn)
 * - บล็อกที่ไม่มีข้อความ (divider) ไม่กินช่อง; รูปกิน 2 ช่อง (alt, caption) เสมอเพื่อให้ index ตรงกันแน่นอน
 * @param content บทความฉบับไทย
 * @returns ข้อความทุกชิ้นเรียงตามลำดับที่ apply จะอ่านกลับ
 * @used-by {@link ../server/translate-article-to-en.helper.ts}
 * @related {@link ./apply-article-text-units.helper.ts}
 */
export const collectArticleTextUnits = (content: SeoArticleBlockContent): string[] => {
  const units: string[] = [];

  for (const block of content.blocks) {
    switch (block.type) {
      case "paragraph":
      case "heading":
      case "quote":
      case "callout":
        for (const run of block.runs) units.push(run.text);
        break;
      case "bulletList":
      case "numberedList":
        for (const item of block.items) for (const run of item.runs) units.push(run.text);
        break;
      case "table":
        for (const row of block.rows) for (const cell of row.cells) for (const run of cell.runs) units.push(run.text);
        break;
      case "image":
        units.push(block.alt, block.caption ?? "");
        break;
      case "divider":
        break;
    }
  }

  for (const item of content.faq) units.push(item.question, item.answer);

  return units;
};
