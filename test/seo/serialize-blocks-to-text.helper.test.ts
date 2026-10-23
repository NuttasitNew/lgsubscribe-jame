/**
 * Unit Tests สำหรับ serialize-blocks-to-text.helper.ts
 *
 * @logic ที่ต้อง verify:
 * - run ต่อกันตรง ๆ ไม่แทรกช่องว่าง (`<strong>ห้าม</strong>ซัก` → "ห้ามซัก")
 * - block คั่นด้วย `\n\n`, รายการใน list คั่นด้วย `\n`, ช่องตารางคั่นด้วย " | "
 * - divider ไม่มีข้อความ / image ข้ามโดย default
 *
 * @related
 * - ทดสอบ: {@link @/feature/backoffice/seo/seo-article/helper/serialize-blocks-to-text.helper.ts}
 */
import { describe, expect, it } from "vitest";
import {
  serializeBlocksToText,
  serializeRunsToText,
} from "@/feature/backoffice/seo/seo-article/helper/serialize-blocks-to-text.helper";
import type { SeoArticleBlock } from "@/feature/backoffice/seo/seo-article/type/seo-article-block.type";

describe("serializeRunsToText", () => {
  it("ต่อ run ตรง ๆ ไม่แทรกช่องว่างระหว่าง run", () => {
    expect(serializeRunsToText([{ text: "ห้าม", bold: true }, { text: "ซัก" }])).toBe("ห้ามซัก");
  });

  it("runs ว่างได้ string ว่าง", () => {
    expect(serializeRunsToText([])).toBe("");
  });
});

describe("serializeBlocksToText - Happy Path", () => {
  it("block คั่นด้วยบรรทัดว่าง", () => {
    const blocks: SeoArticleBlock[] = [
      { id: "1", type: "heading", level: 2, runs: [{ text: "หัวข้อ" }] },
      { id: "2", type: "paragraph", runs: [{ text: "เนื้อหา" }] },
    ];

    expect(serializeBlocksToText(blocks)).toBe("หัวข้อ\n\nเนื้อหา");
  });

  it("รายการใน list คั่นด้วยขึ้นบรรทัดใหม่", () => {
    const blocks: SeoArticleBlock[] = [
      {
        id: "1",
        type: "bulletList",
        items: [{ runs: [{ text: "หนึ่ง" }] }, { runs: [{ text: "สอง" }] }],
      },
    ];

    expect(serializeBlocksToText(blocks)).toBe("หนึ่ง\nสอง");
  });

  it("ช่องตารางคั่นด้วย pipe และแถวคั่นด้วยบรรทัดใหม่", () => {
    const blocks: SeoArticleBlock[] = [
      {
        id: "1",
        type: "table",
        rows: [
          {
            cells: [
              { runs: [{ text: "วิธี" }], isHeader: true },
              { runs: [{ text: "ราคา" }], isHeader: true },
            ],
          },
          { cells: [{ runs: [{ text: "ถึงบ้าน" }] }, { runs: [{ text: "สูง" }] }] },
        ],
      },
    ];

    expect(serializeBlocksToText(blocks)).toBe("วิธี | ราคา\nถึงบ้าน | สูง");
  });

  it("quote และ callout ถูกรวมเป็นข้อความด้วย", () => {
    const blocks: SeoArticleBlock[] = [
      { id: "1", type: "quote", runs: [{ text: "คำพูด" }] },
      { id: "2", type: "callout", variant: "warn", runs: [{ text: "คำเตือน" }] },
    ];

    expect(serializeBlocksToText(blocks)).toBe("คำพูด\n\nคำเตือน");
  });
});

describe("serializeBlocksToText - Edge Cases", () => {
  it("divider ไม่ทิ้งบรรทัดว่างเกิน", () => {
    const blocks: SeoArticleBlock[] = [
      { id: "1", type: "paragraph", runs: [{ text: "บน" }] },
      { id: "2", type: "divider" },
      { id: "3", type: "paragraph", runs: [{ text: "ล่าง" }] },
    ];

    expect(serializeBlocksToText(blocks)).toBe("บน\n\nล่าง");
  });

  it("image ถูกข้ามโดย default", () => {
    const blocks: SeoArticleBlock[] = [
      { id: "1", type: "image", url: "/a.webp", alt: "คำอธิบายรูป", caption: "ใต้รูป" },
      { id: "2", type: "paragraph", runs: [{ text: "เนื้อหา" }] },
    ];

    expect(serializeBlocksToText(blocks)).toBe("เนื้อหา");
  });

  it("เปิด includeImageText แล้วได้ alt + caption", () => {
    const blocks: SeoArticleBlock[] = [
      { id: "1", type: "image", url: "/a.webp", alt: "คำอธิบายรูป", caption: "ใต้รูป" },
    ];

    expect(serializeBlocksToText(blocks, { includeImageText: true })).toBe("คำอธิบายรูป ใต้รูป");
  });

  it("block ที่ข้อความว่างไม่สร้างบรรทัดว่างซ้อน", () => {
    const blocks: SeoArticleBlock[] = [
      { id: "1", type: "paragraph", runs: [] },
      { id: "2", type: "paragraph", runs: [{ text: "มีเนื้อหา" }] },
    ];

    expect(serializeBlocksToText(blocks)).toBe("มีเนื้อหา");
  });

  it("array ว่างได้ string ว่าง", () => {
    expect(serializeBlocksToText([])).toBe("");
  });
});
