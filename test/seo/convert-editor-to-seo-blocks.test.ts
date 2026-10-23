/**
 * @description Unit test สำหรับ convertEditorToSeoBlocks — document ของ BlockNote → บทความโครง block (v2)
 * @logic
 * - ครอบขากลับทุกชนิด block + เคสขอบที่ทำให้ dirty-check เพี้ยน (ย่อหน้าเปล่าท้ายเอกสารของ BlockNote)
 * - มี round-trip test: block → editor → block ต้องได้ของเดิมเป๊ะทั้ง id และเนื้อหา
 * @related {@link helper/convert-editor-to-seo-blocks.ts}
 */
import { describe, it, expect } from "vitest";
import { convertEditorToSeoBlocks, convertInlineContentToRuns } from "@/lib/seo/helper/convert-editor-to-seo-blocks";
import {
  convertSeoBlocksToEditor,
  SEO_EDITOR_CALLOUT_BLOCK,
  SEO_EDITOR_IMAGE_BLOCK,
  type EditorBlock,
} from "@/lib/seo/helper/convert-seo-blocks-to-editor";
import type { SeoArticleBlock } from "@/feature/backoffice/seo/seo-article/type/seo-article-block.type";

/** ตัวสร้าง id แบบเดาได้ เพื่อให้ผลลัพธ์เทียบตรงได้ */
const makeCreateId = () => {
  let counter = 0;
  return () => `new-${(counter += 1)}`;
};

const text = (value: string, styles: Record<string, true> = {}) => ({
  type: "text" as const,
  text: value,
  styles,
});

describe("convertInlineContentToRuns", () => {
  it("text node → run ที่ไม่มี flag false ติดมา", () => {
    expect(convertInlineContentToRuns([text("สวัสดี")])).toEqual([{ text: "สวัสดี" }]);
  });

  it("link node ถูกคลี่เป็น run ที่มี link ต่อชิ้น", () => {
    expect(
      convertInlineContentToRuns([{ type: "link", href: "/book", content: [text("จองคิว", { bold: true })] }])
    ).toEqual([{ text: "จองคิว", bold: true, link: "/book" }]);
  });

  it("run ที่ format เหมือนกันติดกัน → รวมเป็น run เดียว (ตามสเปก)", () => {
    expect(convertInlineContentToRuns([text("ห้าม"), text("ทำ")])).toEqual([{ text: "ห้ามทำ" }]);
  });

  it("run ที่ format ต่างกัน → ไม่รวม", () => {
    expect(convertInlineContentToRuns([text("ข้อดี:", { bold: true }), text(" ราคาถูกกว่า")])).toEqual([
      { text: "ข้อดี:", bold: true },
      { text: " ราคาถูกกว่า" },
    ]);
  });

  it("content ที่ไม่ใช่ array → คืนรายการว่าง ไม่ throw", () => {
    expect(convertInlineContentToRuns(undefined)).toEqual([]);
  });
});

describe("convertEditorToSeoBlocks", () => {
  it("ย่อหน้าเปล่าท้ายเอกสารของ BlockNote ถูกตัดทิ้ง (ไม่งั้นแค่เปิดดูก็นับว่าแก้ไข)", () => {
    const doc: EditorBlock[] = [
      { id: "p1", type: "paragraph", content: [text("เนื้อหา")] },
      { id: "p2", type: "paragraph", content: [] },
    ];
    const result = convertEditorToSeoBlocks(doc, { createId: makeCreateId() });

    expect(result).toEqual([{ id: "p1", type: "paragraph", runs: [{ text: "เนื้อหา" }] }]);
  });

  it("bulletListItem ที่ติดกัน → รวมกลับเป็น bulletList ก้อนเดียว โดยยืม id ของ item แรก", () => {
    const doc: EditorBlock[] = [
      { id: "i1", type: "bulletListItem", content: [text("ข้อ 1")] },
      { id: "i2", type: "bulletListItem", content: [text("ข้อ 2")] },
    ];
    expect(convertEditorToSeoBlocks(doc, { createId: makeCreateId() })).toEqual([
      { id: "i1", type: "bulletList", items: [{ runs: [{ text: "ข้อ 1" }] }, { runs: [{ text: "ข้อ 2" }] }] },
    ]);
  });

  it("list คนละชนิดติดกัน → แยกเป็นคนละก้อน", () => {
    const doc: EditorBlock[] = [
      { id: "i1", type: "bulletListItem", content: [text("จุด")] },
      { id: "i2", type: "numberedListItem", content: [text("เลข")] },
    ];
    const result = convertEditorToSeoBlocks(doc, { createId: makeCreateId() });
    expect(result.map((block) => block.type)).toEqual(["bulletList", "numberedList"]);
  });

  it("ย่อหน้าคั่นกลาง → list ถูกตัดเป็นสองก้อน", () => {
    const doc: EditorBlock[] = [
      { id: "i1", type: "bulletListItem", content: [text("ก่อน")] },
      { id: "p", type: "paragraph", content: [text("คั่น")] },
      { id: "i2", type: "bulletListItem", content: [text("หลัง")] },
    ];
    const result = convertEditorToSeoBlocks(doc, { createId: makeCreateId() });
    expect(result.map((block) => block.type)).toEqual(["bulletList", "paragraph", "bulletList"]);
  });

  it("list ซ้อนชั้น (children) ถูกคลี่เป็นรายการระดับเดียวกัน", () => {
    const doc: EditorBlock[] = [
      {
        id: "i1",
        type: "bulletListItem",
        content: [text("แม่")],
        children: [{ id: "i2", type: "bulletListItem", content: [text("ลูก")] }],
      },
    ];
    const result = convertEditorToSeoBlocks(doc, { createId: makeCreateId() });

    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({ type: "bulletList" });
  });

  it("หัวข้อระดับ 1 ถูกบีบเป็น 2 และระดับ 4-6 บีบเป็น 3 (สเปกมีแค่ h2/h3)", () => {
    const doc: EditorBlock[] = [
      { id: "h1", type: "heading", props: { level: 1 }, content: [text("ใหญ่")] },
      { id: "h5", type: "heading", props: { level: 5 }, content: [text("เล็ก")] },
    ];
    const result = convertEditorToSeoBlocks(doc, { createId: makeCreateId() });
    expect(result).toEqual([
      { id: "h1", type: "heading", level: 2, runs: [{ text: "ใหญ่" }] },
      { id: "h5", type: "heading", level: 3, runs: [{ text: "เล็ก" }] },
    ]);
  });

  it("callout ที่ variant แปลกปลอม → ตกกลับเป็น tip", () => {
    const doc: EditorBlock[] = [
      { id: "c", type: SEO_EDITOR_CALLOUT_BLOCK, props: { variant: "danger" }, content: [text("เนื้อ")] },
    ];
    expect(convertEditorToSeoBlocks(doc, { createId: makeCreateId() })[0]).toMatchObject({ variant: "tip" });
  });

  it("รูปที่ยังไม่ได้อัป (url ว่าง) ถูกตัดทิ้ง", () => {
    const doc: EditorBlock[] = [{ id: "img", type: SEO_EDITOR_IMAGE_BLOCK, props: { url: "", alt: "" } }];
    expect(convertEditorToSeoBlocks(doc, { createId: makeCreateId() })).toEqual([]);
  });

  it("รูปที่มี url แต่ยังไม่กรอก alt ยังถูกเก็บ (ตัวบังคับ alt อยู่ที่ปุ่มบันทึก ไม่ใช่ converter)", () => {
    const doc: EditorBlock[] = [
      { id: "img", type: SEO_EDITOR_IMAGE_BLOCK, props: { url: "https://x/y.webp", alt: "", width: 0, height: 0 } },
    ];
    expect(convertEditorToSeoBlocks(doc, { createId: makeCreateId() })).toEqual([
      { id: "img", type: "image", url: "https://x/y.webp", alt: "" },
    ]);
  });

  it("รูปที่มีขนาด/คำบรรยาย → ใส่ field optional ครบ", () => {
    const doc: EditorBlock[] = [
      {
        id: "img",
        type: SEO_EDITOR_IMAGE_BLOCK,
        props: { url: "https://x/y.webp", alt: "ที่นอน", caption: "ก่อนซัก", width: 1536, height: 1024 },
      },
    ];
    expect(convertEditorToSeoBlocks(doc, { createId: makeCreateId() })[0]).toEqual({
      id: "img",
      type: "image",
      url: "https://x/y.webp",
      alt: "ที่นอน",
      caption: "ก่อนซัก",
      width: 1536,
      height: 1024,
    });
  });

  it("ตาราง: headerRows ถูกแปลงกลับเป็น isHeader รายช่อง", () => {
    const doc: EditorBlock[] = [
      {
        id: "t",
        type: "table",
        content: {
          type: "tableContent",
          headerRows: 1,
          rows: [{ cells: [[text("หัว")]] }, { cells: [[text("ค่า")]] }],
        },
      },
    ];
    const result = convertEditorToSeoBlocks(doc, { createId: makeCreateId() })[0];

    expect(result).toEqual({
      id: "t",
      type: "table",
      rows: [{ cells: [{ runs: [{ text: "หัว" }], isHeader: true }] }, { cells: [{ runs: [{ text: "ค่า" }] }] }],
    });
  });

  it("ตาราง: cell แบบ object (tableCell) อ่านได้เหมือน cell แบบ array", () => {
    const doc: EditorBlock[] = [
      {
        id: "t",
        type: "table",
        content: {
          type: "tableContent",
          rows: [{ cells: [{ type: "tableCell", props: {}, content: [text("ค่า")] }] }],
        },
      },
    ];
    expect(convertEditorToSeoBlocks(doc, { createId: makeCreateId() })[0]).toEqual({
      id: "t",
      type: "table",
      rows: [{ cells: [{ runs: [{ text: "ค่า" }] }] }],
    });
  });

  it("block ที่ไม่มี id → สร้าง id ใหม่ให้", () => {
    const doc: EditorBlock[] = [{ type: "paragraph", content: [text("ไม่มี id")] }];
    expect(convertEditorToSeoBlocks(doc, { createId: makeCreateId() })[0].id).toBe("new-1");
  });

  it("block ชนิดที่ไม่รู้จัก (paste ของแปลก) ถูกข้าม ไม่ทำให้บทความพัง", () => {
    const doc: EditorBlock[] = [
      { id: "x", type: "codeBlock", content: [text("console.log()")] },
      { id: "p", type: "paragraph", content: [text("ปกติ")] },
    ];
    const result = convertEditorToSeoBlocks(doc, { createId: makeCreateId() });
    expect(result).toEqual([{ id: "p", type: "paragraph", runs: [{ text: "ปกติ" }] }]);
  });
});

describe("round-trip block → editor → block", () => {
  it("ได้ของเดิมเป๊ะทั้ง id และเนื้อหา ครบทุกชนิด block", () => {
    const original: SeoArticleBlock[] = [
      { id: "b1", type: "heading", level: 2, runs: [{ text: "ทำไมคราบฉี่กำจัดยาก" }] },
      {
        id: "b2",
        type: "paragraph",
        runs: [
          { text: "คราบซึมลึกกว่าที่ตาเห็น " },
          { text: "ห้ามใช้น้ำร้อน", bold: true },
          { text: " ดูวิธีที่ ", italic: true },
          { text: "หน้าบริการ", link: "/service" },
        ],
      },
      { id: "b3", type: "bulletList", items: [{ runs: [{ text: "ข้อ 1" }] }, { runs: [{ text: "ข้อ 2" }] }] },
      { id: "b4", type: "numberedList", items: [{ runs: [{ text: "ขั้นที่ 1" }] }] },
      {
        id: "b5",
        type: "image",
        url: "https://x/y.webp",
        alt: "ที่นอน",
        caption: "หลังซัก",
        width: 1536,
        height: 1024,
      },
      {
        id: "b6",
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
      { id: "b7", type: "quote", runs: [{ text: "ลูกค้าบอกว่าไม่มีกลิ่นแล้ว" }] },
      { id: "b8", type: "divider" },
      { id: "b9", type: "callout", variant: "warn", runs: [{ text: "ห้ามใช้ไดร์เป่าใกล้" }] },
    ];

    const roundTripped = convertEditorToSeoBlocks(convertSeoBlocksToEditor(original), { createId: makeCreateId() });

    expect(roundTripped).toEqual(original);
  });

  it("บทความว่าง → editor ได้ย่อหน้าเปล่า → แปลงกลับได้บทความว่างเหมือนเดิม", () => {
    expect(convertEditorToSeoBlocks(convertSeoBlocksToEditor([]), { createId: makeCreateId() })).toEqual([]);
  });
});
