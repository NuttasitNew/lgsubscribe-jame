/**
 * @description Unit test สำหรับ convertSeoBlocksToEditor — บทความโครง block (v2) → document ของ BlockNote
 * @logic
 * - ครอบทุกชนิด block ในสเปก + เคสขอบ (บทความว่าง, list ว่าง, run ว่าง, ตารางหัวแถว)
 * @related {@link helper/convert-seo-blocks-to-editor.ts}
 */
import { describe, it, expect } from "vitest";
import {
  convertRunsToInlineContent,
  convertSeoBlocksToEditor,
  SEO_EDITOR_CALLOUT_BLOCK,
  SEO_EDITOR_IMAGE_BLOCK,
  type EditorInlineContent,
  type EditorTableContent,
} from "@/lib/seo/helper/convert-seo-blocks-to-editor";
import type { SeoArticleBlock } from "@/feature/backoffice/seo/seo-article/type/seo-article-block.type";

describe("convertRunsToInlineContent", () => {
  it("ข้อความธรรมดา → text node ที่ styles ว่าง (ไม่ใส่ bold:false)", () => {
    expect(convertRunsToInlineContent([{ text: "สวัสดี" }])).toEqual([{ type: "text", text: "สวัสดี", styles: {} }]);
  });

  it("bold/italic → ใส่เฉพาะ flag ที่เป็น true", () => {
    expect(convertRunsToInlineContent([{ text: "เน้น", bold: true, italic: true }])).toEqual([
      { type: "text", text: "เน้น", styles: { bold: true, italic: true } },
    ]);
  });

  it("run ที่มีลิงก์ → ห่อด้วย node ชนิด link", () => {
    expect(convertRunsToInlineContent([{ text: "จองคิว", link: "https://hurrycleanthailand.com" }])).toEqual([
      {
        type: "link",
        href: "https://hurrycleanthailand.com",
        content: [{ type: "text", text: "จองคิว", styles: {} }],
      },
    ]);
  });

  it("run ลิงก์เดียวกันติดกัน → รวมอยู่ใน link node เดียว", () => {
    const result = convertRunsToInlineContent([
      { text: "จอง", link: "/book" },
      { text: "คิว", link: "/book", bold: true },
    ]) as EditorInlineContent[];

    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({ type: "link", href: "/book" });
  });

  it("run ที่ข้อความว่าง → ถูกตัดทิ้ง (ProseMirror ไม่มี text node ว่าง)", () => {
    expect(convertRunsToInlineContent([{ text: "" }, { text: "มีจริง" }])).toEqual([
      { type: "text", text: "มีจริง", styles: {} },
    ]);
  });
});

describe("convertSeoBlocksToEditor", () => {
  it("บทความว่าง → คืนย่อหน้าเปล่า 1 อัน (BlockNote ต้องมีอย่างน้อย 1 block)", () => {
    expect(convertSeoBlocksToEditor([])).toEqual([{ type: "paragraph", props: {}, content: [] }]);
  });

  it("heading เก็บ level ไว้ที่ props", () => {
    const blocks: SeoArticleBlock[] = [{ id: "b1", type: "heading", level: 3, runs: [{ text: "หัวข้อย่อย" }] }];
    const result = convertSeoBlocksToEditor(blocks);
    expect(result[0]).toMatchObject({ id: "b1", type: "heading", props: { level: 3 } });
  });

  it("bulletList 1 ก้อน → หลาย block ใน editor และ item แรกได้ id ของก้อน", () => {
    const blocks: SeoArticleBlock[] = [
      { id: "list-1", type: "bulletList", items: [{ runs: [{ text: "ข้อ 1" }] }, { runs: [{ text: "ข้อ 2" }] }] },
    ];
    const result = convertSeoBlocksToEditor(blocks);

    expect(result).toHaveLength(2);
    expect(result[0]).toMatchObject({ id: "list-1", type: "bulletListItem" });
    expect(result[1].id).toBeUndefined();
    expect(result[1].type).toBe("bulletListItem");
  });

  it("numberedList ใช้ block ชนิด numberedListItem", () => {
    const blocks: SeoArticleBlock[] = [{ id: "l", type: "numberedList", items: [{ runs: [{ text: "หนึ่ง" }] }] }];
    expect(convertSeoBlocksToEditor(blocks)[0].type).toBe("numberedListItem");
  });

  it("list ที่ไม่มี item เลย → ไม่สร้าง block ค้างไว้ใน editor", () => {
    const blocks: SeoArticleBlock[] = [
      { id: "empty", type: "bulletList", items: [] },
      { id: "p", type: "paragraph", runs: [{ text: "ย่อหน้า" }] },
    ];
    const result = convertSeoBlocksToEditor(blocks);
    expect(result).toHaveLength(1);
    expect(result[0].type).toBe("paragraph");
  });

  it("รูปใช้ block กำหนดเอง seoImage และแปลง optional ที่ไม่มีค่าเป็นค่าว่างของ props", () => {
    const blocks: SeoArticleBlock[] = [{ id: "img", type: "image", url: "https://x/y.webp", alt: "ที่นอน" }];
    expect(convertSeoBlocksToEditor(blocks)[0]).toEqual({
      id: "img",
      type: SEO_EDITOR_IMAGE_BLOCK,
      props: { url: "https://x/y.webp", alt: "ที่นอน", caption: "", width: 0, height: 0 },
    });
  });

  it("callout เก็บ variant ไว้ที่ props", () => {
    const blocks: SeoArticleBlock[] = [{ id: "c", type: "callout", variant: "warn", runs: [{ text: "ระวัง" }] }];
    expect(convertSeoBlocksToEditor(blocks)[0]).toMatchObject({
      type: SEO_EDITOR_CALLOUT_BLOCK,
      props: { variant: "warn" },
    });
  });

  it("ตาราง: แถวบนสุดที่ทุกช่องเป็น header → headerRows = 1", () => {
    const blocks: SeoArticleBlock[] = [
      {
        id: "t",
        type: "table",
        rows: [
          {
            cells: [
              { runs: [{ text: "หัว 1" }], isHeader: true },
              { runs: [{ text: "หัว 2" }], isHeader: true },
            ],
          },
          { cells: [{ runs: [{ text: "ค่า 1" }] }, { runs: [{ text: "ค่า 2" }] }] },
        ],
      },
    ];
    const content = convertSeoBlocksToEditor(blocks)[0].content as EditorTableContent;

    expect(content.type).toBe("tableContent");
    expect(content.headerRows).toBe(1);
    expect(content.columnWidths).toHaveLength(2);
    expect(content.rows).toHaveLength(2);
  });

  it("ตารางที่ไม่มีหัวแถว → ไม่ใส่ headerRows", () => {
    const blocks: SeoArticleBlock[] = [{ id: "t", type: "table", rows: [{ cells: [{ runs: [{ text: "a" }] }] }] }];
    const content = convertSeoBlocksToEditor(blocks)[0].content as EditorTableContent;
    expect(content.headerRows).toBeUndefined();
  });

  it("divider ไม่มี content", () => {
    expect(convertSeoBlocksToEditor([{ id: "d", type: "divider" }])[0]).toEqual({
      id: "d",
      type: "divider",
      props: {},
    });
  });
});
