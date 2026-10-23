import type {
  SeoArticleBlock,
  SeoArticleTextRun,
} from "@/feature/backoffice/seo/seo-article/type/seo-article-block.type";

/** ชื่อ block ที่ลงทะเบียนใน schema ของ BlockNote สำหรับรูปแบบกำหนดเอง (ไม่ใช้ image block ของ BlockNote) */
export const SEO_EDITOR_IMAGE_BLOCK = "seoImage";

/** ชื่อ block callout ที่ลงทะเบียนใน schema ของ BlockNote */
export const SEO_EDITOR_CALLOUT_BLOCK = "callout";

/** ข้อความหนึ่งชิ้นใน editor (โครงเดียวกับ StyledText ของ BlockNote แต่ประกาศเองเพื่อให้ helper ไม่ผูกกับ generic ของ library) */
export interface EditorStyledText {
  type: "text";
  text: string;
  styles: { bold?: true; italic?: true };
}

/** ลิงก์ใน editor (โครงเดียวกับ Link ของ BlockNote) */
export interface EditorLink {
  type: "link";
  href: string;
  content: EditorStyledText[];
}

export type EditorInlineContent = EditorStyledText | EditorLink;

/** ช่องตารางแบบ object ที่ BlockNote คืนมาตอนอ่าน editor.document */
export interface EditorTableCellObject {
  type: "tableCell";
  props?: Record<string, unknown>;
  content: EditorInlineContent[];
}

/** เนื้อหาของ block ตาราง */
export interface EditorTableContent {
  type: "tableContent";
  columnWidths?: (number | undefined)[];
  headerRows?: number;
  headerCols?: number;
  rows: { cells: EditorInlineContent[][] | EditorTableCellObject[] }[];
}

/** block หนึ่งอันใน document ของ editor — โครงกลางที่ helper สองทางใช้ร่วมกัน */
export interface EditorBlock {
  id?: string;
  type: string;
  props?: Record<string, unknown>;
  content?: EditorInlineContent[] | EditorTableContent;
  children?: EditorBlock[];
}

/**
 * @description แปลง rich-text run ของบทความ SEO เป็น inline content ของ BlockNote
 * @logic
 * - run ที่มี `link` → ห่อเป็น node ชนิด "link" (BlockNote เก็บ href ที่ตัวห่อ ไม่ใช่ที่ style ของ text)
 * - flag ที่เป็น false/undefined จะไม่ถูกใส่ลง styles เลย — BlockNote ถือว่า key ที่ไม่มี = ไม่ติดสไตล์
 * - run ที่ข้อความว่างถูกตัดทิ้ง เพราะ ProseMirror ไม่มี text node ว่าง (ถ้าใส่ไปจะโดนกลืนหายแล้วทำให้ dirty-check เพี้ยน)
 * @param runs run จากบทความ (โครง v2)
 * @returns inline content ที่ส่งเข้า BlockNote ได้ตรง ๆ
 * @used-by {@link convert-seo-blocks-to-editor.ts} เอง และ seo-article-block-editor.tsx
 */
export function convertRunsToInlineContent(runs: SeoArticleTextRun[]): EditorInlineContent[] {
  const result: EditorInlineContent[] = [];

  for (const run of runs) {
    if (!run.text) continue;

    const styles: { bold?: true; italic?: true } = {};
    if (run.bold) styles.bold = true;
    if (run.italic) styles.italic = true;

    const styledText: EditorStyledText = { type: "text", text: run.text, styles };

    if (run.link) {
      const previous = result[result.length - 1];
      // run ที่ลิงก์เดียวกันติดกัน → รวมไว้ใน node link เดียว ให้ editor แสดงเป็นลิงก์ก้อนเดียว
      if (previous && previous.type === "link" && previous.href === run.link) {
        previous.content.push(styledText);
      } else {
        result.push({ type: "link", href: run.link, content: [styledText] });
      }
      continue;
    }

    result.push(styledText);
  }

  return result;
}

/** สร้าง block ย่อยของ list (bullet/numbered) — 1 item ของบทความ = 1 block ใน editor */
function buildListItemBlocks(
  blockType: "bulletListItem" | "numberedListItem",
  items: { runs: SeoArticleTextRun[] }[]
): EditorBlock[] {
  return items.map((item) => ({
    type: blockType,
    props: {},
    content: convertRunsToInlineContent(item.runs),
  }));
}

/** สร้าง block ตารางของ editor จากแถว/ช่องของบทความ */
function buildTableBlock(block: Extract<SeoArticleBlock, { type: "table" }>): EditorBlock {
  const columnCount = block.rows.reduce((max, row) => Math.max(max, row.cells.length), 0);

  // BlockNote เก็บ "แถวหัวตาราง" เป็นจำนวนแถวจากบนสุด ไม่ได้เก็บ flag รายช่อง
  // → นับเฉพาะแถวบนสุดที่ทุกช่องเป็น header ติดต่อกัน
  let headerRows = 0;
  for (const row of block.rows) {
    if (row.cells.length > 0 && row.cells.every((cell) => cell.isHeader)) headerRows += 1;
    else break;
  }

  return {
    id: block.id,
    type: "table",
    props: {},
    content: {
      type: "tableContent",
      columnWidths: Array.from({ length: columnCount }, () => undefined),
      ...(headerRows > 0 ? { headerRows } : {}),
      rows: block.rows.map((row) => ({
        cells: row.cells.map((cell) => convertRunsToInlineContent(cell.runs)),
      })),
    },
  };
}

/**
 * @description แปลงบทความโครง block (v2) → document ของ BlockNote เพื่อเปิดในโปรแกรมแก้ไข
 * @logic
 * - ส่วนใหญ่เป็น 1:1 ยกเว้น list: บทความเก็บ bulletList/numberedList เป็นก้อนเดียวที่มี items[]
 *   แต่ BlockNote เก็บเป็น block ต่อ 1 บรรทัด → 1 block ของบทความจึงกลายเป็นหลาย block ใน editor
 *   (ขากลับ {@link convert-editor-to-seo-blocks.ts} จับ block ที่ติดกันรวมกลับเป็นก้อนเดิม)
 * - `id` ของบทความถูกส่งต่อให้ block แรกของแต่ละก้อนเสมอ เพื่อให้ลากสลับแล้ว key ไม่กระโดด
 * - รูปใช้ block กำหนดเอง `seoImage` ไม่ใช่ image ของ BlockNote เพราะต้องบังคับกรอก alt + อัปผ่าน Vercel Blob เอง
 * - บทความว่าง → คืนย่อหน้าเปล่า 1 อัน เพราะ BlockNote ต้องมีอย่างน้อย 1 block ถึงจะ mount ได้
 * @param blocks block ของบทความ (contentJson.blocks)
 * @returns document ที่ส่งเข้า useCreateBlockNote({ initialContent }) ได้
 * @used-by seo-article-block-editor.tsx
 * @related {@link convert-editor-to-seo-blocks.ts} (ขากลับ ต้องแปลงกลับได้ตรงเป๊ะ)
 */
export function convertSeoBlocksToEditor(blocks: SeoArticleBlock[]): EditorBlock[] {
  const result: EditorBlock[] = [];

  for (const block of blocks) {
    switch (block.type) {
      case "paragraph":
        result.push({ id: block.id, type: "paragraph", props: {}, content: convertRunsToInlineContent(block.runs) });
        break;

      case "heading":
        result.push({
          id: block.id,
          type: "heading",
          props: { level: block.level },
          content: convertRunsToInlineContent(block.runs),
        });
        break;

      case "bulletList":
      case "numberedList": {
        const itemBlocks = buildListItemBlocks(
          block.type === "bulletList" ? "bulletListItem" : "numberedListItem",
          block.items
        );
        // ก้อน list ว่าง (ไม่มี item) ไม่มีอะไรให้แสดง — ข้ามไปเลย ไม่งั้นจะได้ block ค้างที่ลบไม่ออก
        if (itemBlocks.length === 0) break;
        itemBlocks[0].id = block.id;
        result.push(...itemBlocks);
        break;
      }

      case "image":
        result.push({
          id: block.id,
          type: SEO_EDITOR_IMAGE_BLOCK,
          props: {
            url: block.url,
            alt: block.alt,
            caption: block.caption ?? "",
            width: block.width ?? 0,
            height: block.height ?? 0,
          },
        });
        break;

      case "table":
        result.push(buildTableBlock(block));
        break;

      case "quote":
        result.push({ id: block.id, type: "quote", props: {}, content: convertRunsToInlineContent(block.runs) });
        break;

      case "divider":
        result.push({ id: block.id, type: "divider", props: {} });
        break;

      case "callout":
        result.push({
          id: block.id,
          type: SEO_EDITOR_CALLOUT_BLOCK,
          props: { variant: block.variant },
          content: convertRunsToInlineContent(block.runs),
        });
        break;
    }
  }

  if (result.length === 0) return [{ type: "paragraph", props: {}, content: [] }];

  return result;
}
