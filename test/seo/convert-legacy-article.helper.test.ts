/**
 * Unit Tests สำหรับ convert-legacy-article.helper.ts
 *
 * @logic ที่ต้อง verify:
 *   (เทียบ text ก่อน/หลังแบบตัด whitespace + ตัวคั่นช่องตารางทิ้ง — ดู {@link onlyCharacters})
 * - ลำดับ block ต่อ section = heading(level 2) → image → เนื้อหาจาก html (ตรงกับที่เว็บ render อยู่)
 * - coverImage ต้องยังเป็น string ห้ามกลายเป็น object (ไม่งั้น og:image + JSON-LD ของบทความที่ Google index แล้วพัง)
 * - tag ที่ไม่รู้จัก degrade เป็น paragraph พร้อมมี warning ห้ามทิ้งเงียบ
 *
 * @related
 * - ทดสอบ: {@link @/feature/backoffice/seo/seo-article/helper/convert-legacy-article.helper.ts}
 * - ใช้ร่วม: {@link @/feature/backoffice/seo/seo-article/helper/serialize-blocks-to-text.helper.ts}
 */
import { describe, expect, it } from "vitest";
import {
  convertHtmlToBlocks,
  convertLegacyArticle,
} from "@/feature/backoffice/seo/seo-article/helper/convert-legacy-article.helper";
import { serializeBlocksToText } from "@/feature/backoffice/seo/seo-article/helper/serialize-blocks-to-text.helper";
import type { SeoArticleContent } from "@/feature/backoffice/seo/seo-article/type/seo-article-content.type";

/** id แบบเดาได้ เพื่อให้ผลลัพธ์ deterministic (ห้ามใช้ค่าสุ่มใน assertion) */
function createSequentialId(): () => string {
  let counter = 0;
  return () => {
    counter += 1;
    return `block-${counter}`;
  };
}

describe("convertLegacyArticle - โครงสร้างผลลัพธ์", () => {
  const legacy: SeoArticleContent = {
    coverImage: "https://cdn.example.com/cover.webp",
    category: "careTips",
    sections: [
      {
        heading: "หัวข้อแรก",
        html: "<p>ย่อหน้าแรก</p>",
        image: { url: "https://cdn.example.com/s1.webp", alt: "รูปประกอบ" },
      },
    ],
    faq: [{ question: "ถาม", answer: "ตอบ" }],
  };

  it("ลำดับ block คือ heading → image → เนื้อหา", () => {
    const { content } = convertLegacyArticle(legacy, { createId: createSequentialId() });

    expect(content.blocks.map((block) => block.type)).toEqual(["heading", "image", "paragraph"]);
    expect(content.blocks[0]).toEqual({ id: "block-1", type: "heading", level: 2, runs: [{ text: "หัวข้อแรก" }] });
  });

  it("รูปจาก section เก่าไม่ใส่ width/height เพราะไม่รู้ขนาดจริง", () => {
    const { content } = convertLegacyArticle(legacy, { createId: createSequentialId() });
    const imageBlock = content.blocks.find((block) => block.type === "image");

    expect(imageBlock).toEqual({
      id: "block-2",
      type: "image",
      url: "https://cdn.example.com/s1.webp",
      alt: "รูปประกอบ",
    });
    expect(imageBlock).not.toHaveProperty("width");
  });

  it("บทความที่ไม่มี coverImage ไม่สร้าง field coverImage เปล่า", () => {
    const { content } = convertLegacyArticle({ ...legacy, coverImage: undefined }, { createId: createSequentialId() });

    expect(content).not.toHaveProperty("coverImage");
  });

  it("section ว่างเปล่าไม่สร้าง block ขยะ", () => {
    const { content } = convertLegacyArticle(
      { ...legacy, sections: [{ heading: "", html: "" }] },
      { createId: createSequentialId() }
    );

    expect(content.blocks).toEqual([]);
  });

  it("sections ว่างได้ผลลัพธ์เป็นบทความเปล่าที่ยัง valid", () => {
    const { content } = convertLegacyArticle({ ...legacy, sections: [], faq: [] }, { createId: createSequentialId() });

    expect(content.blocks).toEqual([]);
    expect(content.version).toBe(2);
  });
});

describe("convertHtmlToBlocks - tag ที่ต้องรองรับ", () => {
  const convert = (html: string) => convertHtmlToBlocks(html, { createId: createSequentialId() });

  it("p → paragraph", () => {
    expect(convert("<p>สวัสดี</p>").blocks).toEqual([{ id: "block-1", type: "paragraph", runs: [{ text: "สวัสดี" }] }]);
  });

  it("strong/b → run ตัวหนา", () => {
    const { blocks } = convert("<p>ปกติ<strong>หนา</strong><b>หนาอีก</b></p>");

    expect(blocks[0]).toEqual({
      id: "block-1",
      type: "paragraph",
      runs: [
        { text: "ปกติ" },
        { text: "หนาหนาอีก", bold: true }, // run ที่ format เหมือนกันถูกรวมเป็นตัวเดียว
      ],
    });
  });

  it("em/i → run ตัวเอียง และซ้อนกับตัวหนาได้", () => {
    const { blocks } = convert("<p><strong><em>ทั้งหนาทั้งเอียง</em></strong></p>");

    expect(blocks[0]).toEqual({
      id: "block-1",
      type: "paragraph",
      runs: [{ text: "ทั้งหนาทั้งเอียง", bold: true, italic: true }],
    });
  });

  it("a → run ที่มี link", () => {
    const { blocks } = convert(`<p>ดู<a href="https://hurrycleanthailand.com/blog">บทความ</a></p>`);

    expect(blocks[0]).toEqual({
      id: "block-1",
      type: "paragraph",
      runs: [{ text: "ดู" }, { text: "บทความ", link: "https://hurrycleanthailand.com/blog" }],
    });
  });

  it("ul → bulletList, ol → numberedList", () => {
    const { blocks } = convert("<ul><li>จุดหนึ่ง</li><li>จุดสอง</li></ul><ol><li>ขั้นหนึ่ง</li></ol>");

    expect(blocks).toEqual([
      {
        id: "block-1",
        type: "bulletList",
        items: [{ runs: [{ text: "จุดหนึ่ง" }] }, { runs: [{ text: "จุดสอง" }] }],
      },
      { id: "block-2", type: "numberedList", items: [{ runs: [{ text: "ขั้นหนึ่ง" }] }] },
    ]);
  });

  it("li ที่มี strong ข้างในเก็บ format ครบ", () => {
    const { blocks } = convert("<ul><li><strong>หัวข้อ:</strong> คำอธิบาย</li></ul>");

    expect(blocks[0]).toEqual({
      id: "block-1",
      type: "bulletList",
      items: [{ runs: [{ text: "หัวข้อ:", bold: true }, { text: " คำอธิบาย" }] }],
    });
  });

  it("h3 → heading level 3 และ h2 → heading level 2", () => {
    const { blocks } = convert("<h2>ใหญ่</h2><h3>ย่อย</h3>");

    expect(blocks).toEqual([
      { id: "block-1", type: "heading", level: 2, runs: [{ text: "ใหญ่" }] },
      { id: "block-2", type: "heading", level: 3, runs: [{ text: "ย่อย" }] },
    ]);
  });

  it("table → block table พร้อมธง isHeader", () => {
    const { blocks } = convert(
      "<table><thead><tr><th>วิธี</th><th>ราคา</th></tr></thead><tbody><tr><td>ถึงบ้าน</td><td>สูงกว่า</td></tr></tbody></table>"
    );

    expect(blocks).toEqual([
      {
        id: "block-1",
        type: "table",
        rows: [
          {
            cells: [
              { runs: [{ text: "วิธี" }], isHeader: true },
              { runs: [{ text: "ราคา" }], isHeader: true },
            ],
          },
          { cells: [{ runs: [{ text: "ถึงบ้าน" }] }, { runs: [{ text: "สูงกว่า" }] }] },
        ],
      },
    ]);
  });

  it("blockquote → quote และ hr → divider", () => {
    const { blocks } = convert("<blockquote>คำพูด</blockquote><hr>");

    expect(blocks).toEqual([
      { id: "block-1", type: "quote", runs: [{ text: "คำพูด" }] },
      { id: "block-2", type: "divider" },
    ]);
  });

  it("img → image block พร้อมขนาดถ้ามีระบุไว้", () => {
    const { blocks } = convert(`<img src="/a.webp" alt="คำอธิบาย" width="1536" height="1024">`);

    expect(blocks).toEqual([
      { id: "block-1", type: "image", url: "/a.webp", alt: "คำอธิบาย", width: 1536, height: 1024 },
    ]);
  });

  it("img ที่ไม่บอกขนาดไม่ใส่ width/height (ห้ามเดา)", () => {
    const { blocks } = convert(`<img src="/a.webp" alt="ไม่รู้ขนาด">`);

    expect(blocks[0]).toEqual({ id: "block-1", type: "image", url: "/a.webp", alt: "ไม่รู้ขนาด" });
  });
});

describe("convertHtmlToBlocks - Degrade / Negative Cases", () => {
  const convert = (html: string) => convertHtmlToBlocks(html, { createId: createSequentialId() });

  it("tag ที่ไม่รู้จัก degrade เป็น paragraph และมี warning (ห้ามทิ้งเงียบ)", () => {
    const { blocks, warnings } = convert("<marquee>ข้อความในแท็กแปลก</marquee>");

    expect(blocks).toEqual([{ id: "block-1", type: "paragraph", runs: [{ text: "ข้อความในแท็กแปลก" }] }]);
    expect(warnings).toHaveLength(1);
    expect(warnings[0]).toContain("marquee");
  });

  it("tag ที่ไม่รู้จักซ้อนอยู่ในย่อหน้า ข้อความยังอยู่ครบ", () => {
    const { blocks, warnings } = convert("<p>ก่อน<weird>กลาง</weird>หลัง</p>");

    expect(serializeBlocksToText(blocks)).toBe("ก่อนกลางหลัง");
    expect(warnings.some((warning) => warning.includes("weird"))).toBe(true);
  });

  it("div ที่เป็นแค่กล่องครอบไม่สร้าง warning", () => {
    const { blocks, warnings } = convert("<div><p>ในกล่อง</p></div>");

    expect(blocks).toEqual([{ id: "block-1", type: "paragraph", runs: [{ text: "ในกล่อง" }] }]);
    expect(warnings).toEqual([]);
  });

  it("list ซ้อนใน li ถูกคลี่ออกมาเป็นรายการระดับเดียวกัน ไม่หาย", () => {
    const { blocks, warnings } = convert("<ul><li>แม่<ul><li>ลูก</li></ul></li></ul>");

    expect(blocks[0]).toEqual({
      id: "block-1",
      type: "bulletList",
      items: [{ runs: [{ text: "แม่" }] }, { runs: [{ text: "ลูก" }] }],
    });
    expect(warnings).toHaveLength(1);
  });

  it("ข้อความที่ลอยอยู่นอก tag ถูกเก็บเป็น paragraph", () => {
    const { blocks } = convert("ลอยอยู่<p>ในย่อหน้า</p>");

    expect(blocks).toEqual([
      { id: "block-1", type: "paragraph", runs: [{ text: "ลอยอยู่" }] },
      { id: "block-2", type: "paragraph", runs: [{ text: "ในย่อหน้า" }] },
    ]);
  });

  it("HTML ที่ tag ไม่ปิด ยังแปลงได้ไม่ throw", () => {
    expect(() => convert("<p>ไม่ปิด<ul><li>ค้าง")).not.toThrow();
    expect(serializeBlocksToText(convert("<p>ไม่ปิด<ul><li>ค้าง").blocks)).toContain("ค้าง");
  });

  it("string ว่างได้ block ว่าง ไม่ throw", () => {
    expect(convert("").blocks).toEqual([]);
    expect(convert("   ").blocks).toEqual([]);
  });

  it("ย่อหน้าที่มีแต่ whitespace ไม่กลายเป็น block เปล่า", () => {
    expect(convert("<p>   </p><p>\n\t</p>").blocks).toEqual([]);
  });

  it("&lt;script&gt; ที่หลุดมาถูก degrade เป็นข้อความ ไม่กลายเป็น HTML ที่ execute ได้", () => {
    const { blocks } = convert("<p>ปกติ</p><script>alert(1)</script>");
    const serialized = JSON.stringify(blocks);

    expect(serialized).not.toContain("<script");
    expect(serializeBlocksToText(blocks)).toContain("alert(1)");
  });
});
