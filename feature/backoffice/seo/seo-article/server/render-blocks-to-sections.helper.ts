import { toSafeArticleHref } from "../helper/to-safe-article-href.helper";
import type { SeoArticleBlock, SeoArticleTextRun } from "../type/seo-article-block.type";
import type { SeoArticleSection } from "../type/seo-article-content.type";

export { toSafeArticleHref };

/** ผลการแปลง block เป็น section แบบเดิม */
export interface RenderBlocksToSectionsResult {
  sections: SeoArticleSection[]; // โครง section ที่ hurry-web ปัจจุบันอ่านได้
  warnings: string[]; // จุดที่แปลงแล้วเสียรายละเอียด (ใช้ log ตอน publish ไม่ block การ push)
}

/** ป้ายกำกับหน้ากล่อง callout — เว็บยังไม่มี component ของ callout จึงลดรูปเป็นย่อหน้าที่มีป้าย */
const CALLOUT_LABEL: Record<"tip" | "warn" | "info", string> = {
  tip: "เคล็ดลับ",
  warn: "ข้อควรระวัง",
  info: "หมายเหตุ",
};

/**
 * @description escape ข้อความ plain text ให้ปลอดภัยเมื่อฝังใน HTML string
 * @logic แทน & < > " ' ตามลำดับ (& ต้องมาก่อนเสมอ ไม่งั้น entity ที่เพิ่งสร้างจะโดน escape ซ้ำ)
 * @param text ข้อความดิบจาก run
 * @returns ข้อความที่ escape แล้ว
 * @used-by {@link renderBlocksToSections}
 */
export function escapeArticleHtml(text: string): string {
  return text
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

/** แปลง run เดียวเป็น inline HTML (strong / em / a ตามลำดับชั้นเดิม) */
function renderRun(run: SeoArticleTextRun): string {
  let html = escapeArticleHtml(run.text);
  if (html.length === 0) return "";
  if (run.bold) html = `<strong>${html}</strong>`;
  if (run.italic) html = `<em>${html}</em>`;
  const href = toSafeArticleHref(run.link);
  if (href) html = `<a href="${escapeArticleHtml(href)}">${html}</a>`;
  return html;
}

/** แปลง run ทั้งชุดเป็น inline HTML ก้อนเดียว (ไม่ใส่ตัวคั่น — run ถูกตัดตามการจัดรูปแบบ ไม่ใช่ตามคำ) */
function renderRuns(runs: SeoArticleTextRun[]): string {
  return runs.map(renderRun).join("");
}

/** section ที่กำลังประกอบอยู่ระหว่างวน block */
interface PendingSection {
  heading: string;
  htmlParts: string[];
  image?: { url: string; alt: string };
}

/**
 * @description แปลงบทความโครง block (v2) กลับเป็นโครง section + HTML string (v1) ที่เว็บ hurry-web อ่านได้
 * @logic
 * - เว็บ hurry-web ปัจจุบันกรองบทความด้วย `Array.isArray(article.sections)` (lib/content/blog.ts) และ
 *   `dynamicParams=false` → ไฟล์ที่ไม่มี `sections` จะหายจาก index + 404 เงียบ ๆ
 *   ไฟล์ที่ push จึงต้องมี `sections` เสมอจนกว่า renderer ฝั่งเว็บจะรู้จัก `blocks`
 * - heading level 2 = ขอบเขตของ section ใหม่ / level 3 ลดรูปเป็น `<h3>` ในเนื้อ html
 * - image block แรกของ section (ก่อนมีเนื้อหา) → `section.image` เพราะเว็บ render รูปไว้ใต้ heading พอดี
 *   รูปถัดไปจะเปิด section ใหม่ที่ heading ว่าง เพื่อคงลำดับรูป-เนื้อหาให้ตรงกับที่แอดมินจัด
 * - caption ของรูปไม่มีที่เก็บในโครงเก่า → ต่อท้ายเป็น `<p><em>...</em></p>`
 * - ข้อความทุกตัวถูก escape และ href ผ่าน toSafeArticleHref — HTML ที่ push ขึ้น repo จึงไม่มี tag จากผู้ใช้
 * @param blocks block ทั้งหมดของบทความ (โครง v2 ที่ผ่าน schema แล้ว)
 * @returns section สำหรับไฟล์ที่ push + warnings จุดที่เสียรายละเอียด
 * @used-by {@link publish-seo-article.action.ts}
 * @related {@link ../type/seo-article-block.type.ts}
 */
export function renderBlocksToSections(blocks: SeoArticleBlock[]): RenderBlocksToSectionsResult {
  const pending: PendingSection[] = [];
  const warnings: string[] = [];

  const currentSection = (): PendingSection | undefined => pending[pending.length - 1];

  const openSection = (heading: string): PendingSection => {
    const section: PendingSection = { heading, htmlParts: [] };
    pending.push(section);
    return section;
  };

  const ensureSection = (): PendingSection => {
    const current = currentSection();
    if (current) return current;
    warnings.push("มีเนื้อหาอยู่ก่อนหัวข้อแรก — ถูกใส่ในหัวข้อว่าง");
    return openSection("");
  };

  for (const block of blocks) {
    switch (block.type) {
      case "heading": {
        if (block.level === 2) {
          openSection(plainText(block.runs));
        } else {
          ensureSection().htmlParts.push(`<h3>${renderRuns(block.runs)}</h3>`);
          warnings.push("หัวข้อย่อย h3 ยังไม่มีสไตล์บนเว็บ");
        }
        break;
      }
      case "paragraph": {
        const inner = renderRuns(block.runs);
        if (inner.length > 0) ensureSection().htmlParts.push(`<p>${inner}</p>`);
        break;
      }
      case "quote": {
        ensureSection().htmlParts.push(`<blockquote><p>${renderRuns(block.runs)}</p></blockquote>`);
        warnings.push("blockquote ยังไม่มีสไตล์บนเว็บ");
        break;
      }
      case "callout": {
        ensureSection().htmlParts.push(
          `<p><strong>${escapeArticleHtml(CALLOUT_LABEL[block.variant])}:</strong> ${renderRuns(block.runs)}</p>`
        );
        break;
      }
      case "bulletList":
      case "numberedList": {
        const tag = block.type === "bulletList" ? "ul" : "ol";
        const items = block.items.map((item) => `<li>${renderRuns(item.runs)}</li>`).join("");
        if (items.length > 0) ensureSection().htmlParts.push(`<${tag}>${items}</${tag}>`);
        break;
      }
      case "table": {
        const rows = block.rows
          .map((row) => {
            const cells = row.cells
              .map((cell) => {
                const cellTag = cell.isHeader ? "th" : "td";
                return `<${cellTag}>${renderRuns(cell.runs)}</${cellTag}>`;
              })
              .join("");
            return `<tr>${cells}</tr>`;
          })
          .join("");
        if (rows.length > 0) {
          ensureSection().htmlParts.push(`<table>${rows}</table>`);
          warnings.push("ตารางยังไม่มีสไตล์บนเว็บ");
        }
        break;
      }
      case "divider": {
        ensureSection().htmlParts.push("<hr />");
        warnings.push("เส้นคั่นอาจไม่แสดงบนเว็บ (Tailwind preflight ตัดเส้นขอบ hr)");
        break;
      }
      case "image": {
        // รูปแรกของ section (ยังไม่มีเนื้อหาและยังไม่มีรูป) → section.image
        // รูปถัดไปต้องเปิด section ใหม่ที่หัวข้อว่าง ไม่งั้นลำดับรูป-เนื้อหาจะเพี้ยน
        const current = currentSection();
        const target =
          current && current.htmlParts.length === 0 && current.image === undefined ? current : openSection("");
        target.image = { url: block.url, alt: block.alt };
        if (block.caption) target.htmlParts.push(`<p><em>${escapeArticleHtml(block.caption)}</em></p>`);
        break;
      }
    }
  }

  const sections: SeoArticleSection[] = pending
    .filter((section) => section.htmlParts.length > 0 || section.image !== undefined || section.heading.length > 0)
    .map((section) => ({
      heading: section.heading,
      html: section.htmlParts.join("\n"),
      ...(section.image ? { image: section.image } : {}),
    }));

  return { sections, warnings: [...new Set(warnings)] };
}

/** ข้อความล้วนของ run ทั้งชุด — heading ของ section เก่าเป็น text ธรรมดา (เว็บ render ใน <h2> แบบ escape) */
function plainText(runs: SeoArticleTextRun[]): string {
  return runs.map((run) => run.text).join("");
}
