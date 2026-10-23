import type { SeoArticleBlock, SeoArticleTextRun } from "../type/seo-article-block.type";

export interface SerializeBlocksOptions {
  /** รวมข้อความของรูป (alt + caption) ด้วยหรือไม่ — default: false เพราะ excerpt ไม่ควรมีคำอธิบายรูป */
  includeImageText?: boolean;
}

/**
 * @description รวมข้อความจาก rich-text run เป็น string เดียว
 * @logic ต่อ text ตรง ๆ ไม่ใส่ตัวคั่น เพราะ run ถูกตัดตามการจัดรูปแบบ ไม่ใช่ตามคำ
 *        (`<strong>ห้าม</strong>ซัก` ต้องได้ "ห้ามซัก" ไม่ใช่ "ห้าม ซัก")
 */
export function serializeRunsToText(runs: SeoArticleTextRun[]): string {
  return runs.map((run) => run.text).join("");
}

/**
 * @description แปลง block ของบทความ SEO เป็น plain text — ใช้ทำ excerpt, นับจำนวนคำ, ตรวจว่า keyword อยู่ในเนื้อหาไหม
 * @logic
 * - block คั่นกันด้วยบรรทัดว่าง (`\n\n`) — รายการใน list และแถวตารางคั่นด้วย `\n`
 * - ช่องในตารางคั่นด้วย `" | "`
 * - divider ไม่มีข้อความ → ข้าม
 * - image ข้ามโดย default (เปิดด้วย `includeImageText` ถ้าต้องการตรวจ alt/caption)
 * - block ที่ไม่มีข้อความเลยจะไม่ทิ้งบรรทัดว่างซ้อน
 * @param blocks block ทั้งหมดของบทความ
 * @param options ตัวเลือกการรวมข้อความรูป
 * @returns plain text ที่ trim แล้ว
 * @used-by {@link ../../../../../test/feature/super-admin/hurry-web/seo-article/helper/convert-legacy-article.helper.test.ts}
 */
export function serializeBlocksToText(blocks: SeoArticleBlock[], options: SerializeBlocksOptions = {}): string {
  const { includeImageText = false } = options;

  const chunks: string[] = [];

  for (const block of blocks) {
    switch (block.type) {
      case "paragraph":
      case "heading":
      case "quote":
      case "callout": {
        chunks.push(serializeRunsToText(block.runs));
        break;
      }
      case "bulletList":
      case "numberedList": {
        chunks.push(block.items.map((item) => serializeRunsToText(item.runs)).join("\n"));
        break;
      }
      case "table": {
        chunks.push(
          block.rows.map((row) => row.cells.map((cell) => serializeRunsToText(cell.runs)).join(" | ")).join("\n")
        );
        break;
      }
      case "image": {
        if (includeImageText) {
          chunks.push([block.alt, block.caption].filter(Boolean).join(" "));
        }
        break;
      }
      case "divider":
        break;
    }
  }

  return chunks
    .map((chunk) => chunk.trim())
    .filter((chunk) => chunk.length > 0)
    .join("\n\n");
}
