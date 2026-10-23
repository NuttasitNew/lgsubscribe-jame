import type {
  SeoArticleBlock,
  SeoArticleCalloutVariant,
  SeoArticleHeadingLevel,
  SeoArticleListItem,
  SeoArticleTableRow,
  SeoArticleTextRun,
} from "@/feature/backoffice/seo/seo-article/type/seo-article-block.type";
import { createBlockId } from "@/feature/backoffice/seo/seo-article/helper/create-block-id.helper";
import {
  SEO_EDITOR_CALLOUT_BLOCK,
  SEO_EDITOR_IMAGE_BLOCK,
  type EditorBlock,
  type EditorInlineContent,
  type EditorStyledText,
  type EditorTableCellObject,
  type EditorTableContent,
} from "./convert-seo-blocks-to-editor";

/** ตัวเลือกของ converter — เปิดให้ inject ตัวสร้าง id เพื่อให้ test เทียบผลได้แบบ deterministic */
export interface ConvertEditorOptions {
  createId?: () => string;
}

/** ต่อ run ใหม่เข้าท้ายรายการ โดยรวมกับ run ก่อนหน้าถ้ารูปแบบเหมือนกันเป๊ะ (สเปกห้ามมี run ติดกันที่ format ซ้ำ) */
function pushRun(runs: SeoArticleTextRun[], run: SeoArticleTextRun): void {
  if (!run.text) return;

  const previous = runs[runs.length - 1];
  if (previous && previous.bold === run.bold && previous.italic === run.italic && previous.link === run.link) {
    previous.text += run.text;
    return;
  }

  runs.push(run);
}

/** สร้าง run จาก text node ของ editor (ตัด flag ที่เป็น false ทิ้งตามสเปก) */
function buildRun(node: EditorStyledText, link?: string): SeoArticleTextRun {
  const run: SeoArticleTextRun = { text: node.text };
  if (node.styles?.bold) run.bold = true;
  if (node.styles?.italic) run.italic = true;
  if (link) run.link = link;
  return run;
}

/**
 * @description แปลง inline content ของ BlockNote → rich-text run ของบทความ SEO
 * @logic
 * - node ชนิด "link" ถูกคลี่เป็น run ที่มี `link` ต่อชิ้น เพราะสเปกเก็บ href ไว้ที่ run ไม่ใช่ตัวห่อ
 * - node ชนิดอื่นที่ไม่รู้จัก (เช่น inline content กำหนดเองที่อาจเพิ่มภายหลัง) ถูกข้าม ไม่ทำให้ทั้งบทความพัง
 * - run ที่ format เหมือนกันติดกันถูกรวมเป็น run เดียวเสมอ
 * @param content inline content จาก editor.document
 * @returns run ตามสเปก v2
 * @used-by {@link convert-editor-to-seo-blocks.ts}
 */
export function convertInlineContentToRuns(content: EditorInlineContent[] | undefined): SeoArticleTextRun[] {
  const runs: SeoArticleTextRun[] = [];
  if (!Array.isArray(content)) return runs;

  for (const node of content) {
    if (node?.type === "text") {
      pushRun(runs, buildRun(node));
      continue;
    }

    if (node?.type === "link") {
      for (const child of node.content || []) {
        if (child?.type === "text") pushRun(runs, buildRun(child, node.href));
      }
    }
  }

  return runs;
}

/** true เมื่อเนื้อหาของ block เป็นตาราง (ใช้แยกจาก inline content เพราะทั้งคู่อยู่ใน field `content` เดียวกัน) */
function isTableContent(content: EditorBlock["content"]): content is EditorTableContent {
  return !Array.isArray(content) && content?.type === "tableContent";
}

/** อ่านค่า props เป็นตัวเลขบวก — 0/ว่าง/ไม่ใช่ตัวเลข ถือว่า "ไม่รู้ขนาด" (สเปกให้ width/height เป็น optional) */
function readPositiveNumber(value: unknown): number | undefined {
  const parsed = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return undefined;
  return Math.round(parsed);
}

/** อ่านค่า props เป็นข้อความที่ตัดช่องว่างหัวท้ายแล้ว */
function readText(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

/** แปลงเนื้อหาตารางของ editor → แถวตามสเปก (รองรับทั้ง cell แบบ array และแบบ object) */
function buildTableRows(content: EditorTableContent): SeoArticleTableRow[] {
  const headerRows = typeof content.headerRows === "number" ? content.headerRows : 0;
  const headerCols = typeof content.headerCols === "number" ? content.headerCols : 0;

  return (content.rows || [])
    .map((row, rowIndex) => {
      const cells = (row?.cells || []).map((cell, columnIndex) => {
        const inline = Array.isArray(cell) ? cell : ((cell as EditorTableCellObject)?.content ?? []);
        const isHeader = rowIndex < headerRows || columnIndex < headerCols;
        return { runs: convertInlineContentToRuns(inline), ...(isHeader ? { isHeader: true as const } : {}) };
      });
      return { cells };
    })
    .filter((row) => row.cells.length > 0);
}

/** จับคู่ชนิด block ของ editor กับชนิด list ของบทความ */
const LIST_BLOCK_TYPE: Record<string, "bulletList" | "numberedList"> = {
  bulletListItem: "bulletList",
  numberedListItem: "numberedList",
};

/** คลี่ block ที่มีลูก (list ซ้อน) ให้เป็นระดับเดียวกันทั้งหมด — สเปก v2 ไม่มี list ซ้อนชั้น */
function flattenEditorBlocks(blocks: EditorBlock[]): EditorBlock[] {
  const flat: EditorBlock[] = [];

  for (const block of blocks) {
    if (!block) continue;
    flat.push(block);
    if (block.children?.length) flat.push(...flattenEditorBlocks(block.children));
  }

  return flat;
}

/**
 * @description แปลง document ของ BlockNote → block ของบทความ SEO (โครง v2 ที่เก็บลง contentJson)
 * @logic
 * - list: block `bulletListItem`/`numberedListItem` ที่ติดกันถูกรวมกลับเป็นก้อน bulletList/numberedList ก้อนเดียว
 *   (ตรงข้ามกับขาไป {@link convert-seo-blocks-to-editor.ts}) โดยยืม id ของ item แรกเป็น id ของก้อน
 * - list ซ้อนชั้นถูกคลี่เป็นระดับเดียว เพราะสเปกไม่มีชั้นซ้อน — เนื้อหาไม่หาย แค่ระดับหาย
 * - block ที่ไม่มีข้อความเลย (ย่อหน้า/หัวข้อ/quote/callout ว่าง) ถูกตัดทิ้ง
 *   สำคัญมาก: BlockNote เติมย่อหน้าเปล่าท้ายเอกสารเสมอ ถ้าไม่ตัดจะกลายเป็น "แก้ไขแล้ว" ทั้งที่ผู้ใช้แค่เปิดดู
 * - รูปที่ยังไม่มี url ถูกตัดทิ้ง (ผู้ใช้กด "เพิ่มรูป" แล้วยังไม่ได้อัป) — รูปที่มี url แต่ไม่มี alt ยังเก็บไว้
 *   เพราะตัวบังคับกรอก alt อยู่ที่ปุ่มบันทึก ไม่ใช่ที่ converter
 * - หัวข้อระดับ 1 ถูกบีบเป็น 2 และ 4-6 บีบเป็น 3 เพราะสเปกมีแค่ h2/h3 (h1 สงวนให้ชื่อบทความ)
 * @param blocks document จาก editor.document
 * @param options.createId ตัวสร้าง id (default = createBlockId) — inject เพื่อ test
 * @returns block ตามสเปก v2 พร้อมเก็บลง contentJson
 * @used-by seo-article-block-editor.tsx, seo-article-editor-page.tsx
 * @related {@link convert-seo-blocks-to-editor.ts}
 */
export function convertEditorToSeoBlocks(blocks: EditorBlock[], options: ConvertEditorOptions = {}): SeoArticleBlock[] {
  const createId = options.createId ?? createBlockId;
  const flatBlocks = flattenEditorBlocks(blocks || []);
  const result: SeoArticleBlock[] = [];

  let currentList: { block: Extract<SeoArticleBlock, { type: "bulletList" | "numberedList" }> } | null = null;

  /** ปิดก้อน list ที่กำลังสะสมอยู่ (เรียกทุกครั้งที่เจอ block ชนิดอื่น) */
  const closeList = () => {
    if (currentList && currentList.block.items.length > 0) result.push(currentList.block);
    currentList = null;
  };

  for (const block of flatBlocks) {
    const listType = LIST_BLOCK_TYPE[block.type];

    if (listType) {
      const runs = convertInlineContentToRuns(block.content as EditorInlineContent[]);
      const item: SeoArticleListItem = { runs };
      // รายการที่ไม่มีข้อความเลยไม่ต้องเก็บ แต่ห้ามปิดก้อน list — ผู้ใช้อาจแค่เว้นบรรทัดค้างไว้ระหว่างพิมพ์
      if (runs.length === 0) continue;

      if (currentList && currentList.block.type === listType) {
        currentList.block.items.push(item);
        continue;
      }

      closeList();
      currentList = {
        block:
          listType === "bulletList"
            ? { id: block.id || createId(), type: "bulletList", items: [item] }
            : { id: block.id || createId(), type: "numberedList", items: [item] },
      };
      continue;
    }

    closeList();

    const id = block.id || createId();

    switch (block.type) {
      case "paragraph": {
        const runs = convertInlineContentToRuns(block.content as EditorInlineContent[]);
        if (runs.length > 0) result.push({ id, type: "paragraph", runs });
        break;
      }

      case "heading": {
        const runs = convertInlineContentToRuns(block.content as EditorInlineContent[]);
        if (runs.length === 0) break;
        const rawLevel = Number(block.props?.level);
        const level: SeoArticleHeadingLevel = rawLevel >= 3 ? 3 : 2;
        result.push({ id, type: "heading", level, runs });
        break;
      }

      case "quote": {
        const runs = convertInlineContentToRuns(block.content as EditorInlineContent[]);
        if (runs.length > 0) result.push({ id, type: "quote", runs });
        break;
      }

      case SEO_EDITOR_CALLOUT_BLOCK: {
        const runs = convertInlineContentToRuns(block.content as EditorInlineContent[]);
        if (runs.length === 0) break;
        const rawVariant = readText(block.props?.variant);
        const variant: SeoArticleCalloutVariant = rawVariant === "warn" || rawVariant === "info" ? rawVariant : "tip";
        result.push({ id, type: "callout", variant, runs });
        break;
      }

      case SEO_EDITOR_IMAGE_BLOCK: {
        const url = readText(block.props?.url);
        if (!url) break;
        const caption = readText(block.props?.caption);
        const width = readPositiveNumber(block.props?.width);
        const height = readPositiveNumber(block.props?.height);
        result.push({
          id,
          type: "image",
          url,
          alt: readText(block.props?.alt),
          ...(caption ? { caption } : {}),
          ...(width ? { width } : {}),
          ...(height ? { height } : {}),
        });
        break;
      }

      case "table": {
        if (!isTableContent(block.content)) break;
        const rows = buildTableRows(block.content);
        if (rows.length > 0) result.push({ id, type: "table", rows });
        break;
      }

      case "divider":
        result.push({ id, type: "divider" });
        break;

      // block ชนิดที่ไม่รู้จักถูกข้าม — schema ของ editor จำกัดชนิดไว้แล้ว จึงเกิดได้เฉพาะตอน paste ของแปลก
      default:
        break;
    }
  }

  closeList();

  return result;
}
