import { z } from "zod";
import { createBlockId } from "../helper/create-block-id.helper";
import { SEO_ARTICLE_CALLOUT_VARIANTS } from "../type/seo-article-block.type";
import type {
  SeoArticleBlock,
  SeoArticleListItem,
  SeoArticleTableRow,
  SeoArticleTextRun,
} from "../type/seo-article-block.type";

/**
 * schema ของ run ที่ AI พ่นออกมา — ตรงกับ SeoArticleTextRun แต่ยังไม่การันตีความถูกต้อง
 * (ตัวจริงถูกกรองอีกทีใน normalizeAiRuns)
 */
const aiRunSchema = z.object({
  text: z.string().describe("ข้อความ plain text ห้ามมี HTML tag เด็ดขาด"),
  bold: z.boolean().optional().describe("ตัวหนา — ใส่เฉพาะตอนเป็น true เท่านั้น"),
  italic: z.boolean().optional().describe("ตัวเอียง — ใส่เฉพาะตอนเป็น true เท่านั้น"),
  link: z.string().optional().describe("URL ปลายทาง (http/https หรือ path ขึ้นต้นด้วย /) ถ้า run นี้เป็นลิงก์"),
});

/**
 * schema ของ block ที่ AI พ่นออกมา — ตั้งใจทำเป็น object แบนตัวเดียวที่มี field เฉพาะทางเป็น optional ทั้งหมด
 * แทนการใช้ z.discriminatedUnion
 *
 * เหตุผล: discriminatedUnion กลายเป็น `anyOf` ใน JSON Schema ซึ่ง structured output ของ Anthropic
 * มักตอบไม่ตรงรูป (สลับ field ข้ามชนิด) — โครงแบนตัวเดียวโมเดลตอบแม่นกว่ามาก
 * แล้วค่อยแปลงเป็น union จริงด้วย normalizeAiBlocks ฝั่งเรา (validate + ทิ้งของเสีย + ใส่ id)
 *
 * ⚠️ ห้ามใส่ `.min(n)` ที่ n > 1 บน array ในไฟล์นี้ — Anthropic ไม่รองรับ minItems > 1 (คุมจำนวนผ่าน describe/prompt)
 */
export const aiArticleBlockSchema = z.object({
  type: z
    .enum(["paragraph", "heading", "bulletList", "numberedList", "table", "quote", "divider", "callout"])
    .describe("ชนิดของบล็อก — ห้ามใช้ image (ระบบแทรกรูปให้เองทีหลัง)"),
  level: z.number().optional().describe("เฉพาะ heading: 2 = หัวข้อหลัก, 3 = หัวข้อซ้อนใต้หัวข้อหลัก (ห้ามใช้ 1)"),
  variant: z
    .enum(SEO_ARTICLE_CALLOUT_VARIANTS)
    .optional()
    .describe("เฉพาะ callout: tip = เคล็ดลับ, warn = คำเตือน/ข้อห้าม, info = ข้อมูลเพิ่มเติม"),
  runs: z.array(aiRunSchema).optional().describe("เนื้อความของ paragraph / heading / quote / callout"),
  items: z
    .array(z.object({ runs: z.array(aiRunSchema) }))
    .optional()
    .describe(
      "เฉพาะ bulletList / numberedList — 1 item = 1 บรรทัด แนะนำ 3-6 บรรทัด " +
        "ใช้ได้เฉพาะขั้นตอนที่ต้องทำตามลำดับจริง หรือรายการของจริงที่นับได้ ห้ามใช้แทนการเรียบเรียงเป็นย่อหน้า"
    ),
  rows: z
    .array(z.object({ cells: z.array(z.object({ runs: z.array(aiRunSchema), isHeader: z.boolean().optional() })) }))
    .optional()
    .describe("เฉพาะ table — แถวแรกต้องเป็นหัวตาราง (ทุก cell ใส่ isHeader: true) แนะนำ 3-5 แถว 2-3 คอลัมน์"),
});

export type AiArticleBlock = z.infer<typeof aiArticleBlockSchema>;

export interface NormalizeAiBlocksResult {
  blocks: SeoArticleBlock[];
  warnings: string[];
}

/** ลิงก์ที่ยอมให้ผ่าน — กัน javascript:/data: ที่ AI อาจหลุดมา (เนื้อหานี้ถูก render บนเว็บจริง) */
const isSafeLink = (link: string): boolean => /^https?:\/\//i.test(link) || link.startsWith("/");

/**
 * @description กรอง + รวม run ที่ AI พ่นมาให้เป็น SeoArticleTextRun ที่สะอาด
 * @logic
 * - ทิ้ง run ที่ text ไม่ใช่ string หรือเป็นสตริงว่าง (run ที่มีแต่ช่องว่างยังเก็บไว้ เพราะเป็นตัวคั่นคำจริง)
 * - ใส่ flag เฉพาะตอนเป็น true เท่านั้น — ห้ามเขียน `bold: false` ลง JSON ตามสเปกโครงบล็อก
 * - ลิงก์ที่ไม่ใช่ http/https หรือ path ภายใน → ตัด field link ทิ้ง (กัน XSS ผ่าน javascript:)
 * - run ที่ติดกันและจัดรูปแบบเหมือนกันถูกรวมเป็น run เดียว (สเปกบังคับว่าห้ามมี run ซ้ำรูปแบบติดกัน)
 * @param raw ค่า runs ดิบจาก AI
 * @returns runs ที่ผ่านการทำความสะอาดแล้ว
 * @used-by {@link ./normalize-ai-blocks.helper.ts}
 */
export const normalizeAiRuns = (raw: unknown): SeoArticleTextRun[] => {
  if (!Array.isArray(raw)) return [];

  const cleaned: SeoArticleTextRun[] = [];
  for (const item of raw) {
    if (typeof item !== "object" || item === null) continue;
    const { text, bold, italic, link } = item as Record<string, unknown>;
    if (typeof text !== "string" || text.length === 0) continue;

    const run: SeoArticleTextRun = { text };
    if (bold === true) run.bold = true;
    if (italic === true) run.italic = true;
    if (typeof link === "string" && isSafeLink(link)) run.link = link;

    const previous = cleaned[cleaned.length - 1];
    if (previous && previous.bold === run.bold && previous.italic === run.italic && previous.link === run.link) {
      previous.text += run.text;
      continue;
    }
    cleaned.push(run);
  }

  return cleaned;
};

/** true = มีตัวอักษรจริง ไม่ใช่ช่องว่างล้วน */
const hasVisibleText = (runs: SeoArticleTextRun[]): boolean => runs.some((run) => run.text.trim().length > 0);

/** แปลง items ของ list — ทิ้งบรรทัดที่ไม่มีข้อความจริง */
const normalizeListItems = (raw: unknown): SeoArticleListItem[] => {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((item) => ({ runs: normalizeAiRuns((item as { runs?: unknown } | null)?.runs) }))
    .filter((item) => hasVisibleText(item.runs));
};

/** แปลง rows ของตาราง — เก็บ cell ว่างไว้ได้ (ช่องว่างในตารางมีความหมาย) แต่ทิ้งแถวที่ไม่มี cell เลย */
const normalizeTableRows = (raw: unknown): SeoArticleTableRow[] => {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((row) => {
      const cells = Array.isArray((row as { cells?: unknown } | null)?.cells)
        ? (row as { cells: unknown[] }).cells
        : [];
      return {
        cells: cells.map((cell) => {
          const runs = normalizeAiRuns((cell as { runs?: unknown } | null)?.runs);
          const isHeader = (cell as { isHeader?: unknown } | null)?.isHeader === true;
          return isHeader ? { runs, isHeader: true } : { runs };
        }),
      };
    })
    .filter((row) => row.cells.length > 0);
};

/**
 * @description แปลง block ดิบที่ AI พ่นมา (โครงแบน) เป็น SeoArticleBlock[] ตามสเปกโครงบล็อก v2
 * @logic
 * - ใส่ `id` ให้ทุกบล็อกฝั่งเรา — ไม่ให้ AI ตั้งเอง (โมเดลชอบตั้งซ้ำกัน แล้ว key ตอน drag/reorder จะพัง)
 * - บล็อกที่ไม่มีเนื้อหาจริงถูกทิ้งพร้อม warning — ห้ามทิ้งเงียบ เพราะคนรีวิวต้องรู้ว่า AI พ่นของเสียมา
 * - heading: ยอมรับแค่ level 2/3 ค่าอื่นถูกดัดเป็น 2 และถ้า level 3 มาก่อนที่จะเคยมี level 2
 *   จะถูกเลื่อนขึ้นเป็น 2 (h1 สงวนให้ title ของบทความ บทความจึงต้องเริ่มที่ h2 เสมอ)
 * - callout ที่ไม่ระบุ variant → "info"
 * - type ที่ไม่รู้จัก (รวม "image" ที่ AI ไม่ควรพ่นมา) ถูกทิ้งพร้อม warning — รูปเป็นหน้าที่ของ generate-article-images
 * @param rawBlocks ค่า blocks ดิบจาก generateObject
 * @param options inject createId เพื่อให้ test deterministic
 * @returns blocks ที่ใช้ได้จริง + warnings ที่ควรให้คนรีวิวเห็น
 * @used-by {@link ./write-seo-article.helper.ts}
 * @related {@link ../type/seo-article-block.type.ts}
 */
export const normalizeAiBlocks = (
  rawBlocks: unknown,
  options: { createId?: () => string } = {}
): NormalizeAiBlocksResult => {
  const createId = options.createId ?? createBlockId;
  const blocks: SeoArticleBlock[] = [];
  const warnings: string[] = [];

  if (!Array.isArray(rawBlocks)) {
    return { blocks, warnings: ["AI ไม่ได้ส่ง blocks กลับมาเป็น array"] };
  }

  let hasSeenTopHeading = false;

  rawBlocks.forEach((raw, index) => {
    if (typeof raw !== "object" || raw === null) {
      warnings.push(`บล็อกที่ ${index + 1}: ไม่ใช่ object — ข้าม`);
      return;
    }
    const block = raw as Record<string, unknown>;
    const type = block.type;
    const position = index + 1;

    switch (type) {
      case "paragraph":
      case "quote":
      case "callout": {
        const runs = normalizeAiRuns(block.runs);
        if (!hasVisibleText(runs)) {
          warnings.push(`บล็อกที่ ${position} (${type}): ไม่มีข้อความ — ข้าม`);
          return;
        }
        if (type === "callout") {
          const variant = SEO_ARTICLE_CALLOUT_VARIANTS.find((item) => item === block.variant) ?? "info";
          blocks.push({ id: createId(), type: "callout", variant, runs });
          return;
        }
        blocks.push({ id: createId(), type, runs });
        return;
      }

      case "heading": {
        const runs = normalizeAiRuns(block.runs);
        if (!hasVisibleText(runs)) {
          warnings.push(`บล็อกที่ ${position} (heading): ไม่มีข้อความ — ข้าม`);
          return;
        }
        let level: 2 | 3 = block.level === 3 ? 3 : 2;
        if (block.level !== 2 && block.level !== 3) {
          warnings.push(`บล็อกที่ ${position} (heading): level=${String(block.level)} ไม่รองรับ — ใช้ level 2 แทน`);
        }
        if (level === 3 && !hasSeenTopHeading) {
          level = 2;
          warnings.push(`บล็อกที่ ${position} (heading): h3 มาก่อน h2 — เลื่อนขึ้นเป็น h2 (h1 สงวนให้ชื่อบทความ)`);
        }
        if (level === 2) hasSeenTopHeading = true;
        blocks.push({ id: createId(), type: "heading", level, runs });
        return;
      }

      case "bulletList":
      case "numberedList": {
        const items = normalizeListItems(block.items);
        if (items.length === 0) {
          warnings.push(`บล็อกที่ ${position} (${type}): ไม่มีรายการที่มีข้อความ — ข้าม`);
          return;
        }
        blocks.push({ id: createId(), type, items });
        return;
      }

      case "table": {
        const rows = normalizeTableRows(block.rows);
        if (rows.length === 0) {
          warnings.push(`บล็อกที่ ${position} (table): ไม่มีแถว — ข้าม`);
          return;
        }
        blocks.push({ id: createId(), type: "table", rows });
        return;
      }

      case "divider": {
        blocks.push({ id: createId(), type: "divider" });
        return;
      }

      default: {
        warnings.push(`บล็อกที่ ${position}: ชนิด "${String(type)}" ไม่รองรับ — ข้าม`);
      }
    }
  });

  return { blocks, warnings };
};
