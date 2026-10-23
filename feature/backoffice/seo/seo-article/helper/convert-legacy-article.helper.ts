import type { SeoArticleContent } from "../type/seo-article-content.type";
import {
  SEO_ARTICLE_BLOCK_VERSION,
  type SeoArticleBlock,
  type SeoArticleBlockContent,
  type SeoArticleListItem,
  type SeoArticleTableCell,
  type SeoArticleTableRow,
  type SeoArticleTextRun,
} from "../type/seo-article-block.type";
import { createBlockId } from "./create-block-id.helper";
import { parseHtmlNodes, type HtmlElementNode, type HtmlNode } from "./parse-html-nodes.helper";

/** tag ที่เป็นการจัดรูปแบบข้อความในบรรทัด — ไม่ตัด block ใหม่ */
const INLINE_PASSTHROUGH_TAGS = new Set(["span", "u", "code", "small", "mark", "s", "sub", "sup", "abbr", "time"]);

/** tag ที่เป็นแค่กล่องครอบ — เอา children ขึ้นมาแทน ไม่สร้าง block ของตัวเอง */
const CONTAINER_TAGS = new Set([
  "div",
  "section",
  "article",
  "main",
  "aside",
  "header",
  "footer",
  "figure",
  "tbody",
  "thead",
  "tfoot",
  "colgroup",
]);

/** tag ที่ตัดย่อหน้าใหม่เสมอ — ใช้ตัดสินว่า tag ที่ไม่รู้จักควรถูกมองเป็น inline หรือ block */
const BLOCK_LEVEL_TAGS = new Set([
  "p",
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "ul",
  "ol",
  "li",
  "table",
  "tr",
  "td",
  "th",
  "blockquote",
  "hr",
  "img",
  "pre",
  ...CONTAINER_TAGS,
]);

/** node นี้มี tag ระดับ block อยู่ข้างในไหม (ดูลึกทุกชั้น) */
function containsBlockLevel(node: HtmlElementNode): boolean {
  return node.children.some(
    (child) => child.kind === "element" && (BLOCK_LEVEL_TAGS.has(child.tag) || containsBlockLevel(child))
  );
}

export interface ConvertHtmlOptions {
  /** ฟังก์ชันสร้าง id — inject ได้เพื่อให้ test deterministic (default: createBlockId) */
  createId?: () => string;
}

export interface ConvertHtmlResult {
  blocks: SeoArticleBlock[];
  /** สิ่งที่ต้องมนุษย์ดูซ้ำ เช่น tag ที่ไม่รู้จักที่ถูก degrade — ห้ามทิ้งเงียบ */
  warnings: string[];
}

export interface ConvertLegacyArticleResult {
  content: SeoArticleBlockContent;
  warnings: string[];
}

/** รวม whitespace ติดกันเป็นช่องว่างเดียว (HTML ถือว่า whitespace ซ้ำ = ช่องว่างเดียว) */
function collapseWhitespace(text: string): string {
  return text.replace(/\s+/g, " ");
}

/** run 2 ตัวจัดรูปแบบเหมือนกันไหม — ใช้ตัดสินว่าควรรวมเป็น run เดียว */
function hasSameFormat(left: SeoArticleTextRun, right: SeoArticleTextRun): boolean {
  return left.bold === right.bold && left.italic === right.italic && left.link === right.link;
}

/**
 * @description ทำความสะอาด run — รวม run ที่ format เหมือนกัน, ตัดช่องว่างหัวท้าย, ทิ้ง run ว่าง
 * @logic ต้องทำเพื่อให้ข้อความเสถียร: `<p> <strong>ก</strong><strong>ข</strong> </p>` → run เดียว "กข" (bold)
 */
function normalizeRuns(runs: SeoArticleTextRun[]): SeoArticleTextRun[] {
  const merged: SeoArticleTextRun[] = [];

  for (const run of runs) {
    const previous = merged[merged.length - 1];
    if (previous !== undefined && hasSameFormat(previous, run)) {
      previous.text += run.text;
    } else {
      merged.push({ ...run });
    }
  }

  if (merged.length > 0) {
    merged[0].text = merged[0].text.replace(/^\s+/, "");
    merged[merged.length - 1].text = merged[merged.length - 1].text.replace(/\s+$/, "");
  }

  return merged.filter((run) => run.text.length > 0);
}

/** format ที่สืบทอดลงไปยัง node ลูก */
interface RunFormat {
  bold?: boolean;
  italic?: boolean;
  link?: string;
}

/**
 * @description เก็บข้อความจาก node ที่เป็นเนื้อในบรรทัด พร้อมสืบทอดตัวหนา/ตัวเอียง/ลิงก์
 * @logic tag ที่ไม่รู้จักจะถูกเปิดกล่องเอาข้อความข้างในออกมา (ไม่ทิ้ง) แล้วบันทึกไว้ใน warnings
 */
function collectRuns(nodes: HtmlNode[], format: RunFormat, warnings: string[]): SeoArticleTextRun[] {
  const runs: SeoArticleTextRun[] = [];

  for (const node of nodes) {
    if (node.kind === "text") {
      runs.push({ text: collapseWhitespace(node.text), ...format });
      continue;
    }

    switch (node.tag) {
      case "strong":
      case "b":
        runs.push(...collectRuns(node.children, { ...format, bold: true }, warnings));
        break;
      case "em":
      case "i":
        runs.push(...collectRuns(node.children, { ...format, italic: true }, warnings));
        break;
      case "a": {
        const href = node.attrs.href;
        runs.push(...collectRuns(node.children, { ...format, ...(href ? { link: href } : {}) }, warnings));
        break;
      }
      case "br":
        runs.push({ text: " ", ...format });
        break;
      default: {
        if (!INLINE_PASSTHROUGH_TAGS.has(node.tag)) {
          warnings.push(`tag <${node.tag}> อยู่ในบรรทัดข้อความ — เก็บเฉพาะข้อความข้างใน`);
        }
        runs.push(...collectRuns(node.children, format, warnings));
      }
    }
  }

  return runs;
}

/** แปลง `<li>` เป็นรายการใน list — li ที่ซ้อน list ข้างในจะถูกคลี่ออกมาเป็นรายการระดับเดียวกัน */
function collectListItems(node: HtmlElementNode, warnings: string[]): SeoArticleListItem[] {
  const items: SeoArticleListItem[] = [];

  for (const child of node.children) {
    if (child.kind === "text") {
      const runs = normalizeRuns(collectRuns([child], {}, warnings));
      if (runs.length > 0) items.push({ runs });
      continue;
    }

    if (child.tag === "li") {
      const nestedLists = child.children.filter(
        (grandChild): grandChild is HtmlElementNode =>
          grandChild.kind === "element" && (grandChild.tag === "ul" || grandChild.tag === "ol")
      );
      const ownNodes = child.children.filter(
        (grandChild) => !(grandChild.kind === "element" && (grandChild.tag === "ul" || grandChild.tag === "ol"))
      );

      const runs = normalizeRuns(collectRuns(ownNodes, {}, warnings));
      if (runs.length > 0) items.push({ runs });

      for (const nested of nestedLists) {
        warnings.push(`list ซ้อนใน <li> ถูกคลี่ออกมาเป็นรายการระดับเดียวกัน`);
        items.push(...collectListItems(nested, warnings));
      }
      continue;
    }

    if (child.tag === "ul" || child.tag === "ol") {
      items.push(...collectListItems(child, warnings));
      continue;
    }

    // เนื้อหาที่หลุดออกมานอก <li> — ไม่ทิ้ง ให้เป็นรายการหนึ่ง
    const runs = normalizeRuns(collectRuns([child], {}, warnings));
    if (runs.length > 0) items.push({ runs });
  }

  return items;
}

/** แปลง `<table>` เป็นแถว/ช่อง — รองรับทั้งที่มีและไม่มี thead/tbody */
function collectTableRows(node: HtmlElementNode, warnings: string[]): SeoArticleTableRow[] {
  const rows: SeoArticleTableRow[] = [];

  const visit = (current: HtmlElementNode) => {
    for (const child of current.children) {
      if (child.kind !== "element") continue;

      if (child.tag === "tr") {
        const cells: SeoArticleTableCell[] = [];
        for (const cellNode of child.children) {
          if (cellNode.kind !== "element") continue;
          if (cellNode.tag !== "td" && cellNode.tag !== "th") continue;
          const cell: SeoArticleTableCell = { runs: normalizeRuns(collectRuns(cellNode.children, {}, warnings)) };
          if (cellNode.tag === "th") cell.isHeader = true;
          cells.push(cell);
        }
        if (cells.length > 0) rows.push({ cells });
        continue;
      }

      if (CONTAINER_TAGS.has(child.tag) || child.tag === "table") {
        visit(child);
        continue;
      }

      // caption หรืออย่างอื่นในตาราง — เก็บเป็นแถวช่องเดียว ไม่ทิ้ง
      const runs = normalizeRuns(collectRuns([child], {}, warnings));
      if (runs.length > 0) rows.push({ cells: [{ runs }] });
    }
  };

  visit(node);
  return rows;
}

/**
 * @description แปลง HTML string ของบทความเก่าเป็น block
 * @logic
 * - รองรับ: p, ul/ol/li, strong/b, em/i, a, h1-h6, table/tr/td/th, blockquote, hr, img, br
 * - tag ที่ไม่รู้จักถูก degrade เป็น paragraph (เอาข้อความข้างในออกมา) พร้อมบันทึกใน warnings — ห้ามทิ้งเงียบ
 * - ข้อความที่ลอยอยู่นอก tag ถูกรวบเป็น paragraph เดียวกันจนกว่าจะเจอ block ถัดไป
 * - h1/h2 → heading level 2, h3-h6 → heading level 3 (h1 สงวนให้ title ของบทความ)
 * @param html HTML string จาก legacy `section.html`
 * @param options inject createId เพื่อให้ test deterministic
 * @returns block ที่แปลงได้ + warnings
 * @used-by {@link convertLegacyArticle}
 */
export function convertHtmlToBlocks(html: string, options: ConvertHtmlOptions = {}): ConvertHtmlResult {
  const createId = options.createId ?? createBlockId;
  const warnings: string[] = [];
  const blocks: SeoArticleBlock[] = [];

  const convertNodes = (nodes: HtmlNode[]) => {
    let pending: SeoArticleTextRun[] = [];

    const flushPending = () => {
      const runs = normalizeRuns(pending);
      pending = [];
      if (runs.length > 0) blocks.push({ id: createId(), type: "paragraph", runs });
    };

    for (const node of nodes) {
      if (node.kind === "text") {
        pending.push({ text: collapseWhitespace(node.text) });
        continue;
      }

      switch (node.tag) {
        case "strong":
        case "b":
        case "em":
        case "i":
        case "a":
        case "br":
          pending.push(...collectRuns([node], {}, warnings));
          break;

        case "p":
          flushPending();
          convertNodes(node.children);
          break;

        case "h1":
        case "h2":
        case "h3":
        case "h4":
        case "h5":
        case "h6": {
          flushPending();
          const runs = normalizeRuns(collectRuns(node.children, {}, warnings));
          const level = node.tag === "h1" || node.tag === "h2" ? 2 : 3;
          if (runs.length > 0) blocks.push({ id: createId(), type: "heading", level, runs });
          break;
        }

        case "ul":
        case "ol": {
          flushPending();
          const items = collectListItems(node, warnings);
          if (items.length > 0) {
            blocks.push({
              id: createId(),
              type: node.tag === "ul" ? "bulletList" : "numberedList",
              items,
            });
          }
          break;
        }

        case "li": {
          // <li> ที่หลุดออกมานอก list — ทำเป็น bulletList รายการเดียว ไม่ทิ้ง
          flushPending();
          warnings.push("พบ <li> นอก <ul>/<ol> — แปลงเป็นรายการเดี่ยว");
          const runs = normalizeRuns(collectRuns(node.children, {}, warnings));
          if (runs.length > 0) blocks.push({ id: createId(), type: "bulletList", items: [{ runs }] });
          break;
        }

        case "blockquote": {
          flushPending();
          const runs = normalizeRuns(collectRuns(node.children, {}, warnings));
          if (runs.length > 0) blocks.push({ id: createId(), type: "quote", runs });
          break;
        }

        case "hr":
          flushPending();
          blocks.push({ id: createId(), type: "divider" });
          break;

        case "img": {
          flushPending();
          const url = node.attrs.src ?? "";
          if (url.length > 0) {
            const width = Number.parseInt(node.attrs.width ?? "", 10);
            const height = Number.parseInt(node.attrs.height ?? "", 10);
            blocks.push({
              id: createId(),
              type: "image",
              url,
              alt: node.attrs.alt ?? "",
              ...(Number.isFinite(width) && width > 0 ? { width } : {}),
              ...(Number.isFinite(height) && height > 0 ? { height } : {}),
            });
          }
          break;
        }

        case "table": {
          flushPending();
          const rows = collectTableRows(node, warnings);
          if (rows.length > 0) blocks.push({ id: createId(), type: "table", rows });
          break;
        }

        default: {
          if (INLINE_PASSTHROUGH_TAGS.has(node.tag)) {
            pending.push(...collectRuns([node], {}, warnings));
            break;
          }
          const isContainer = CONTAINER_TAGS.has(node.tag);
          if (!isContainer) {
            warnings.push(`tag <${node.tag}> ไม่รองรับ — degrade เป็นย่อหน้า`);
          }

          // tag ที่ไม่รู้จักซึ่งไม่มี block ข้างใน = ใช้กลางประโยค → ต้องอยู่ในย่อหน้าเดิม
          // ห้าม flush ไม่งั้น "ก่อน<weird>กลาง</weird>หลัง" จะถูกหั่นเป็น 3 ย่อหน้า
          if (!isContainer && !containsBlockLevel(node)) {
            pending.push(...collectRuns(node.children, {}, warnings));
            break;
          }

          flushPending();
          convertNodes(node.children);
        }
      }
    }

    flushPending();
  };

  convertNodes(parseHtmlNodes(html));
  return { blocks, warnings };
}

/**
 * @description แปลงบทความโครงเก่า ({ sections: [{ heading, html, image? }] }) เป็นโครง block เวอร์ชัน 2
 * @logic
 * - ลำดับ block ต่อ 1 section = heading (level 2) → image (ถ้ามี) → block ที่แปลงจาก html
 *   ตรงกับลำดับที่ hurry-web render อยู่ตอนนี้ (dynamic-article-content.tsx)
 * - `coverImage` คงเป็น string เหมือนเดิม ห้ามแปลงเป็น object เด็ดขาด (og:image + JSON-LD ของบทความที่ index แล้วอ่านตรง ๆ)
 * - `category` / `faq` ยกมาทั้งก้อนไม่แตะ — faq.answer ยังเป็น plain text ตามสัญญาเดิมของ FAQPage JSON-LD
 * - `category` ที่หายไปใน data เก่า default เป็น "careTips" ตรงกับ fallback ของหน้า /blog
 * - รูปของ section เก่าไม่มีขนาดเก็บไว้ → ไม่ใส่ width/height (optional) ห้ามเดา
 * @param legacy contentJson โครงเก่า
 * @param options inject createId เพื่อให้ test deterministic
 * @returns contentJson โครงใหม่ + warnings ที่ควรให้คนตรวจ
 * @used-by feature seo-article (migration + editor)
 * @related {@link ../type/seo-article-block.type.ts}, {@link ./parse-html-nodes.helper.ts}
 */
export function convertLegacyArticle(
  legacy: SeoArticleContent,
  options: ConvertHtmlOptions = {}
): ConvertLegacyArticleResult {
  const createId = options.createId ?? createBlockId;
  const warnings: string[] = [];
  const blocks: SeoArticleBlock[] = [];

  for (const section of legacy.sections ?? []) {
    const headingRuns = normalizeRuns([{ text: collapseWhitespace(section.heading ?? "") }]);
    if (headingRuns.length > 0) {
      blocks.push({ id: createId(), type: "heading", level: 2, runs: headingRuns });
    }

    if (section.image?.url) {
      blocks.push({
        id: createId(),
        type: "image",
        url: section.image.url,
        alt: section.image.alt ?? "",
      });
    }

    const converted = convertHtmlToBlocks(section.html ?? "", { createId });
    blocks.push(...converted.blocks);
    warnings.push(...converted.warnings);
  }

  return {
    content: {
      version: SEO_ARTICLE_BLOCK_VERSION,
      ...(legacy.coverImage ? { coverImage: legacy.coverImage } : {}),
      category: legacy.category ?? "careTips",
      blocks,
      faq: legacy.faq ?? [],
    },
    warnings,
  };
}
