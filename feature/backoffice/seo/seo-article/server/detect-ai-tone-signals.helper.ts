import type { SeoArticleBlock, SeoArticleTextRun } from "../type/seo-article-block.type";

/**
 * เกณฑ์ตัดสิน "กลิ่น AI" — ตั้งไว้ที่เดียวเพื่อให้ test อ้างเลขเดียวกับโค้ดจริง
 *
 * ที่มาของตัวเลข: เจ้าของธุรกิจอ่านบทความแล้วบอกว่า "มันเป็นลักษณะของ ai" เพราะ AI ซอยทุกความคิด
 * เป็นหัวข้อย่อยขีดกลาง แทนที่จะเรียบเรียงเป็นย่อหน้า — prompt จึงบังคับความเรียง 70% ขึ้นไป
 * ตัวตรวจนี้เป็นตาข่ายรับท้าย (log เตือนเท่านั้น ไม่ reject) เผื่อโมเดลไม่ทำตาม prompt
 */
export const AI_TONE_THRESHOLDS = {
  /** สัดส่วนย่อหน้าขั้นต่ำต่อบล็อกเนื้อหาทั้งหมด — ต่ำกว่านี้ = เนื้อหาถูกซอยเป็นรายการมากเกินไป */
  minParagraphRatio: 0.6,
  /** สัดส่วนรายการสูงสุดต่อบล็อกเนื้อหาทั้งหมด */
  maxListRatio: 0.35,
  /** จำนวนย่อหน้าขั้นต่ำที่จะเริ่มตรวจความสม่ำเสมอของความยาว (น้อยกว่านี้ตัดสินไม่ได้) */
  minParagraphsForLengthCheck: 4,
  /**
   * ค่าสัมประสิทธิ์การกระจายของความยาวย่อหน้า (ส่วนเบี่ยงเบนมาตรฐาน ÷ ค่าเฉลี่ย)
   * ต่ำกว่านี้ = ทุกย่อหน้ายาวเท่ากันเป๊ะ ซึ่งเป็นลายเซ็นของเครื่อง คนเขียนจะยาวสั้นสลับกัน
   */
  minParagraphLengthVariation: 0.18,
} as const;

/**
 * สำนวนที่เป็นลายเซ็นของ AI ในภาษาไทย + จำนวนครั้งที่ยอมให้ใช้ได้ทั้งบทความ
 * (บางคำใช้ครั้งเดียวไม่แปลก แต่โผล่ทุกย่อหน้าเมื่อไหร่คนอ่านออกทันที)
 */
export const AI_TONE_PHRASES: { phrase: string; maxCount: number }[] = [
  { phrase: "ไม่เพียงแต่", maxCount: 0 },
  { phrase: "หวังว่าบทความนี้", maxCount: 0 },
  { phrase: "เป็นประโยชน์ไม่มากก็น้อย", maxCount: 0 },
  { phrase: "ในโลกปัจจุบัน", maxCount: 0 },
  { phrase: "ยิ่งไปกว่านั้น", maxCount: 0 },
  { phrase: "ท้ายที่สุดนี้", maxCount: 0 },
  { phrase: "อย่างไรก็ตาม", maxCount: 2 },
  { phrase: "นอกจากนี้", maxCount: 2 },
  { phrase: "โดยสรุป", maxCount: 1 },
  { phrase: "สรุปแล้ว", maxCount: 1 },
  // ภาษาพูดที่ไม่เข้ากับเว็บบริการของแบรนด์ (เจ้าของเว็บติว่า "ไม่เป็นทางการ ดูแปลก")
  { phrase: "บอกกันตรง", maxCount: 0 },
  { phrase: "พูดกันตรง", maxCount: 0 },
  { phrase: "กันก่อน", maxCount: 0 },
  { phrase: "กว่าเพื่อน", maxCount: 0 },
  { phrase: "ก่อนนะ", maxCount: 0 },
  { phrase: "ได้เลย", maxCount: 1 },
  { phrase: "ไม่ต้องห่วง", maxCount: 0 },
];

/** ชนิดบล็อกที่นับเป็น "เนื้อหา" — heading/divider/image เป็นโครง ไม่ใช่เนื้อความ จึงไม่นับเป็นตัวหาร */
const CONTENT_BLOCK_TYPES = new Set(["paragraph", "bulletList", "numberedList", "table", "quote", "callout"]);

/** ชนิดบล็อกที่เป็นรายการ (ตัวการหลักที่ทำให้บทความอ่านเหมือนเครื่องเขียน) */
const LIST_BLOCK_TYPES = new Set(["bulletList", "numberedList"]);

/** ต่อ runs เป็นข้อความเดียว — ใช้ทั้งนับความยาวย่อหน้าและค้นสำนวนต้องห้าม */
const runsToText = (runs: SeoArticleTextRun[] | undefined): string =>
  Array.isArray(runs) ? runs.map((run) => run.text).join("") : "";

/** ดึงข้อความทั้งหมดในบล็อกเดียว (ครอบคลุมทั้ง runs, items ของ list และ cells ของ table) */
const blockToText = (block: SeoArticleBlock): string => {
  switch (block.type) {
    case "paragraph":
    case "heading":
    case "quote":
    case "callout":
      return runsToText(block.runs);
    case "bulletList":
    case "numberedList":
      return block.items.map((item) => runsToText(item.runs)).join(" ");
    case "table":
      return block.rows.map((row) => row.cells.map((cell) => runsToText(cell.runs)).join(" ")).join(" ");
    default:
      return "";
  }
};

/** นับจำนวนครั้งที่ needle โผล่ใน haystack (ไม่ทับซ้อนกัน) */
const countOccurrences = (haystack: string, needle: string): number => {
  if (needle.length === 0) return 0;
  let count = 0;
  let from = 0;
  for (;;) {
    const found = haystack.indexOf(needle, from);
    if (found === -1) break;
    count += 1;
    from = found + needle.length;
  }
  return count;
};

/**
 * @description ตรวจ "สัญญาณว่าบทความนี้เขียนด้วย AI" จากบล็อกที่ AI ส่งกลับมา — เตือนอย่างเดียว ไม่ปัดตกบทความ
 * @logic
 * - ตัวหาร = บล็อกเนื้อหาเท่านั้น (paragraph/list/table/quote/callout) ไม่นับ heading, divider, image
 * - สัญญาณที่ตรวจ 4 อย่าง:
 *   1. สัดส่วนย่อหน้าต่ำกว่า `minParagraphRatio` → เนื้อหาถูกซอยเป็นรายการแทนการเรียบเรียง
 *   2. สัดส่วนรายการเกิน `maxListRatio` หรือมีรายการวางติดกันตั้งแต่ 2 บล็อก → อ่านเป็นสไลด์ ไม่ใช่บทความ
 *   3. ความยาวย่อหน้าสม่ำเสมอเกินไป (ค่าสัมประสิทธิ์การกระจาย < `minParagraphLengthVariation`)
 *      คำนวณจากส่วนเบี่ยงเบนมาตรฐาน ÷ ค่าเฉลี่ย ของจำนวนตัวอักษรต่อย่อหน้า
 *   4. สำนวนลายเซ็น AI ภาษาไทยเกินโควตาใน `AI_TONE_PHRASES`
 * - บทความที่ไม่มีบล็อกเนื้อหาเลย → คืน [] (เป็นหน้าที่ของ normalizeAiBlocks ที่เตือนเรื่องบล็อกเสียอยู่แล้ว)
 * @param blocks บล็อกบทความที่ normalize แล้ว
 * @returns ข้อความเตือนภาษาไทย (ว่าง = ไม่พบสัญญาณ)
 * @used-by {@link ./write-seo-article.helper.ts}
 * @related {@link ./normalize-ai-blocks.helper.ts}
 */
export const detectAiToneSignals = (blocks: SeoArticleBlock[]): string[] => {
  const warnings: string[] = [];
  if (!Array.isArray(blocks) || blocks.length === 0) return warnings;

  const contentBlocks = blocks.filter((block) => CONTENT_BLOCK_TYPES.has(block.type));
  if (contentBlocks.length === 0) return warnings;

  const paragraphs = contentBlocks.filter((block) => block.type === "paragraph");
  const listCount = contentBlocks.filter((block) => LIST_BLOCK_TYPES.has(block.type)).length;

  // 1. ความเรียงน้อยเกินไป
  const paragraphRatio = paragraphs.length / contentBlocks.length;
  if (paragraphRatio < AI_TONE_THRESHOLDS.minParagraphRatio) {
    warnings.push(
      `[SEO-TONE-01] ย่อหน้าเป็นแค่ ${Math.round(paragraphRatio * 100)}% ของเนื้อหา ` +
        `(ต้องอย่างน้อย ${Math.round(AI_TONE_THRESHOLDS.minParagraphRatio * 100)}%) — บทความถูกซอยเป็นรายการมากเกินไป`
    );
  }

  // 2a. รายการเยอะเกินไป
  const listRatio = listCount / contentBlocks.length;
  if (listRatio > AI_TONE_THRESHOLDS.maxListRatio) {
    warnings.push(
      `[SEO-TONE-02] บล็อกรายการเป็น ${Math.round(listRatio * 100)}% ของเนื้อหา ` +
        `(เกินเพดาน ${Math.round(AI_TONE_THRESHOLDS.maxListRatio * 100)}%)`
    );
  }

  // 2b. รายการวางติดกัน — สัญญาณชัดที่สุดว่า AI ซอยความคิดเป็นข้อ ๆ รัว ๆ
  const adjacentListAt = contentBlocks.findIndex(
    (block, index) =>
      index > 0 && LIST_BLOCK_TYPES.has(block.type) && LIST_BLOCK_TYPES.has(contentBlocks[index - 1].type)
  );
  if (adjacentListAt !== -1) {
    warnings.push(`[SEO-TONE-03] มีบล็อกรายการวางติดกันโดยไม่มีย่อหน้าคั่น (บล็อกเนื้อหาที่ ${adjacentListAt + 1})`);
  }

  // 3. ย่อหน้ายาวเท่ากันหมด
  if (paragraphs.length >= AI_TONE_THRESHOLDS.minParagraphsForLengthCheck) {
    const lengths = paragraphs.map((block) => blockToText(block).trim().length);
    const mean = lengths.reduce((sum, value) => sum + value, 0) / lengths.length;
    if (mean > 0) {
      const variance = lengths.reduce((sum, value) => sum + (value - mean) ** 2, 0) / lengths.length;
      const variation = Math.sqrt(variance) / mean;
      if (variation < AI_TONE_THRESHOLDS.minParagraphLengthVariation) {
        warnings.push(
          `[SEO-TONE-04] ย่อหน้ายาวใกล้เคียงกันหมด (ค่าการกระจาย ${variation.toFixed(2)} ` +
            `ต่ำกว่า ${AI_TONE_THRESHOLDS.minParagraphLengthVariation}) — คนเขียนจริงจะยาวสั้นสลับกัน`
        );
      }
    }
  }

  // 4. สำนวนลายเซ็น AI
  const fullText = blocks.map(blockToText).join("\n");
  for (const { phrase, maxCount } of AI_TONE_PHRASES) {
    const count = countOccurrences(fullText, phrase);
    if (count > maxCount) {
      warnings.push(`[SEO-TONE-05] ใช้สำนวน "${phrase}" ${count} ครั้ง (เกินโควตา ${maxCount})`);
    }
  }

  return warnings;
};
