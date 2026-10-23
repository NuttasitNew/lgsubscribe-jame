// @vitest-environment jsdom
/**
 * @description Integration test ของการแปลงเนื้อหาบทความผ่าน **instance จริงของ BlockNote**
 * @logic
 * - test ของ helper เทียบกับโครงที่เราสมมติเอง แต่ test นี้ยิงผ่าน editor จริง
 *   → จับกรณีที่ BlockNote normalize เอกสารไม่ตรงกับที่ converter คาด (เช่น รูปทรงของ cell ในตาราง,
 *     การเก็บ href ที่ node link, ย่อหน้าเปล่าที่ถูกเติมท้ายเอกสารอัตโนมัติ)
 * - ถ้า BlockNote เปลี่ยนโครงเอกสารตอนอัปเวอร์ชัน test นี้จะพังก่อนที่บทความจริงจะเสียหาย
 * @related
 * - {@link helper/convert-seo-blocks-to-editor.ts}, {@link helper/convert-editor-to-seo-blocks.ts}
 */
import { describe, it, expect } from "vitest";
import { BlockNoteEditor } from "@blocknote/core";
import { seoArticleEditorSchema } from "@/feature/backoffice/seo/seo-article/components/seo-article-editor-schema";
import { convertSeoBlocksToEditor, type EditorBlock } from "@/lib/seo/helper/convert-seo-blocks-to-editor";
import { convertEditorToSeoBlocks } from "@/lib/seo/helper/convert-editor-to-seo-blocks";
import type { SeoArticleBlock } from "@/feature/backoffice/seo/seo-article/type/seo-article-block.type";

/** สร้าง editor จริงจากบทความ แล้วอ่านเอกสารกลับออกมาเป็นบล็อกตามสเปก */
const roundTrip = (blocks: SeoArticleBlock[]): SeoArticleBlock[] => {
  const editor = BlockNoteEditor.create({
    schema: seoArticleEditorSchema,
    initialContent: convertSeoBlocksToEditor(blocks) as never,
  });

  return convertEditorToSeoBlocks(editor.document as unknown as EditorBlock[], { createId: () => "generated" });
};

describe("แปลงบทความผ่าน editor จริง แล้วแปลงกลับ", () => {
  it("ครบทั้ง 9 ชนิดบล็อก → ได้ของเดิมเป๊ะ ทั้ง id, รูปแบบตัวอักษร, ลิงก์ และหัวตาราง", () => {
    const original: SeoArticleBlock[] = [
      { id: "b1", type: "heading", level: 2, runs: [{ text: "ทำไมคราบฉี่กำจัดยาก" }] },
      {
        id: "b2",
        type: "paragraph",
        runs: [
          { text: "ข้อความปกติ " },
          { text: "ตัวหนา", bold: true },
          { text: "ตัวเอียง", italic: true },
          { text: "ลิงก์ไปหน้าบริการ", link: "/service" },
        ],
      },
      { id: "b3", type: "bulletList", items: [{ runs: [{ text: "ข้อ 1" }] }, { runs: [{ text: "ข้อ 2" }] }] },
      { id: "b4", type: "numberedList", items: [{ runs: [{ text: "ขั้นที่ 1" }] }] },
      {
        id: "b5",
        type: "image",
        url: "https://x/y.webp",
        alt: "ช่างกำลังซักที่นอน",
        caption: "หลังซักเสร็จ",
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

    expect(roundTrip(original)).toEqual(original);
  });

  it("บทความว่าง → editor มีย่อหน้าเปล่า แต่แปลงกลับแล้วต้องไม่มีบล็อกโผล่มาเอง", () => {
    // เคสนี้คือหัวใจของปุ่ม "บันทึก" ที่ปิดอยู่ตอนไม่มีอะไรเปลี่ยน — ถ้าย่อหน้าเปล่าหลุดออกมา
    // บทความทุกเรื่องจะถูกมองว่า "แก้แล้ว" ตั้งแต่เปิดหน้า และกดบันทึกทีคือ deploy เว็บใหม่ที
    expect(roundTrip([])).toEqual([]);
  });

  it("รูปที่ยังไม่มี alt ผ่าน editor จริงแล้วยังคงค่า url/ขนาดไว้ครบ", () => {
    const original: SeoArticleBlock[] = [
      { id: "img", type: "image", url: "https://x/y.webp", alt: "", width: 800, height: 600 },
    ];
    expect(roundTrip(original)).toEqual(original);
  });
});
