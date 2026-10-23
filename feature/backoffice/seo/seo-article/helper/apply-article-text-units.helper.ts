import type { SeoArticleBlockContent } from "../type/seo-article-block.type";

/**
 * @description ประกอบบทความฉบับใหม่จากข้อความที่แปลแล้ว — โครงสร้าง/รูป/ลิงก์/ตัวหนา คงเดิมทุกจุด
 * @logic
 * - เดินโครงลำดับเดียวกับ {@link ./article-text-units.helper.ts} เป๊ะ ๆ (title/meta/keywords ไม่รวมอยู่ในนี้
 *   เพราะเป็น field แยกของบทความ ไม่ได้อยู่ใน content)
 * - ข้อความที่แปลไม่ครบ (AI คืนมาน้อยกว่าที่ส่งไป) → ช่องที่เหลือ**ใช้ข้อความเดิม** ไม่ใช่ปล่อยว่าง
 *   บทความ EN ที่มีย่อหน้าไทยปนยังอ่านรู้เรื่องและแก้ต่อได้ ดีกว่าย่อหน้าหายไปเฉย ๆ
 * - รูปคง `url`/`width`/`height` เดิมทั้งหมด — ฉบับ EN ใช้ไฟล์รูปใบเดียวกับไทย ไม่ต้อง gen ใหม่
 * - คืน object ใหม่ทั้งชุด ไม่แก้ของเดิมในที่ (ฉบับไทยต้องไม่ถูกแตะ)
 * @param content บทความฉบับไทย (ต้นแบบโครงสร้าง)
 * @param translated ข้อความที่แปลแล้ว เรียงตามลำดับเดียวกับ collectArticleTextUnits
 * @returns บทความฉบับ EN ที่โครงเหมือนเดิมทุกประการ
 * @used-by {@link ../server/translate-article-to-en.helper.ts}
 * @related {@link ./article-text-units.helper.ts}
 */
export const applyArticleTextUnits = (
  content: SeoArticleBlockContent,
  translated: string[]
): SeoArticleBlockContent => {
  let cursor = 0;
  /** ข้อความชิ้นถัดไป — แปลไม่ครบให้ตกกลับเป็นของเดิม */
  const next = (fallback: string): string => {
    const value = translated[cursor];
    cursor += 1;
    return typeof value === "string" && value.trim().length > 0 ? value : fallback;
  };

  const blocks = content.blocks.map((block) => {
    switch (block.type) {
      case "paragraph":
      case "heading":
      case "quote":
      case "callout":
        return { ...block, runs: block.runs.map((run) => ({ ...run, text: next(run.text) })) };
      case "bulletList":
      case "numberedList":
        return {
          ...block,
          items: block.items.map((item) => ({
            ...item,
            runs: item.runs.map((run) => ({ ...run, text: next(run.text) })),
          })),
        };
      case "table":
        return {
          ...block,
          rows: block.rows.map((row) => ({
            ...row,
            cells: row.cells.map((cell) => ({
              ...cell,
              runs: cell.runs.map((run) => ({ ...run, text: next(run.text) })),
            })),
          })),
        };
      case "image": {
        const alt = next(block.alt);
        const caption = next(block.caption ?? "");
        return { ...block, alt, ...(block.caption === undefined ? {} : { caption }) };
      }
      case "divider":
        return block;
    }
  });

  const faq = content.faq.map((item) => ({
    ...item,
    question: next(item.question),
    answer: next(item.answer),
  }));

  return { ...content, blocks, faq };
};
