/**
 * Unit Tests สำหรับ render-blocks-to-sections.helper.ts
 *
 * @logic ที่ต้อง verify:
 * - heading level 2 ตัด section ใหม่ / level 3 กลายเป็น <h3> ในเนื้อ html
 * - รูปแรกของ section ไปอยู่ที่ section.image (ตำแหน่งเดียวกับที่เว็บ render) รูปถัดไปเปิด section ใหม่
 * - ข้อความถูก escape เสมอ และ href อันตราย (javascript:) ถูกตัดทิ้ง
 * - ไฟล์ที่ push ต้องมี sections เสมอ (เว็บกรองด้วย Array.isArray(sections) — ไม่มี = 404 เงียบ)
 *
 * @related
 * - ทดสอบ: {@link @/feature/backoffice/seo/seo-article/server/render-blocks-to-sections.helper.ts}
 */
import { describe, expect, it } from "vitest";
import {
  escapeArticleHtml,
  renderBlocksToSections,
  toSafeArticleHref,
} from "@/feature/backoffice/seo/seo-article/server/render-blocks-to-sections.helper";
import type { SeoArticleBlock } from "@/feature/backoffice/seo/seo-article/type/seo-article-block.type";

const heading = (id: string, text: string, level: 2 | 3 = 2): SeoArticleBlock => ({
  id,
  type: "heading",
  level,
  runs: [{ text }],
});

const paragraph = (id: string, text: string): SeoArticleBlock => ({ id, type: "paragraph", runs: [{ text }] });

const image = (id: string, url: string, alt: string, caption?: string): SeoArticleBlock => ({
  id,
  type: "image",
  url,
  alt,
  ...(caption ? { caption } : {}),
});

describe("escapeArticleHtml", () => {
  it("escape อักขระ HTML ครบ และไม่ escape entity ซ้ำซ้อน", () => {
    expect(escapeArticleHtml("<script>a & b \"c\" 'd'</script>")).toBe(
      "&lt;script&gt;a &amp; b &quot;c&quot; &#39;d&#39;&lt;/script&gt;"
    );
  });

  it("ข้อความไทยธรรมดาไม่ถูกแตะ", () => {
    expect(escapeArticleHtml("ซักที่นอน")).toBe("ซักที่นอน");
  });
});

describe("toSafeArticleHref", () => {
  it("ยอมรับ http/https และ path ภายในเว็บ", () => {
    expect(toSafeArticleHref("https://hurrycleanthailand.com")).toBe("https://hurrycleanthailand.com");
    expect(toSafeArticleHref("/blog/abc")).toBe("/blog/abc");
  });

  it("ปฏิเสธ scheme อันตรายและ protocol-relative", () => {
    expect(toSafeArticleHref("javascript:alert(1)")).toBeNull();
    expect(toSafeArticleHref("data:text/html;base64,PHN2Zz4=")).toBeNull();
    expect(toSafeArticleHref("//evil.com")).toBeNull();
    expect(toSafeArticleHref(undefined)).toBeNull();
  });
});

describe("renderBlocksToSections - Happy Path", () => {
  it("heading level 2 ตัด section ใหม่ทุกครั้ง", () => {
    const { sections } = renderBlocksToSections([
      heading("h1", "หัวข้อแรก"),
      paragraph("p1", "เนื้อหาแรก"),
      heading("h2", "หัวข้อสอง"),
      paragraph("p2", "เนื้อหาสอง"),
    ]);

    expect(sections).toHaveLength(2);
    expect(sections[0]).toEqual({ heading: "หัวข้อแรก", html: "<p>เนื้อหาแรก</p>" });
    expect(sections[1]).toEqual({ heading: "หัวข้อสอง", html: "<p>เนื้อหาสอง</p>" });
  });

  it("list / quote / callout / divider แปลงเป็น tag ที่เว็บ render ได้", () => {
    const { sections } = renderBlocksToSections([
      heading("h1", "หัวข้อ"),
      { id: "b1", type: "bulletList", items: [{ runs: [{ text: "ข้อหนึ่ง" }] }, { runs: [{ text: "ข้อสอง" }] }] },
      { id: "n1", type: "numberedList", items: [{ runs: [{ text: "ขั้นแรก" }] }] },
      { id: "q1", type: "quote", runs: [{ text: "คำพูด" }] },
      { id: "c1", type: "callout", variant: "warn", runs: [{ text: "ห้ามใช้น้ำร้อน" }] },
      { id: "d1", type: "divider" },
    ]);

    expect(sections[0].html).toBe(
      [
        "<ul><li>ข้อหนึ่ง</li><li>ข้อสอง</li></ul>",
        "<ol><li>ขั้นแรก</li></ol>",
        "<blockquote><p>คำพูด</p></blockquote>",
        "<p><strong>ข้อควรระวัง:</strong> ห้ามใช้น้ำร้อน</p>",
        "<hr />",
      ].join("\n")
    );
  });

  it("bold / italic / link ออกมาเป็น strong / em / a", () => {
    const { sections } = renderBlocksToSections([
      heading("h1", "หัวข้อ"),
      {
        id: "p1",
        type: "paragraph",
        runs: [
          { text: "ข้อดี:", bold: true },
          { text: " ราคาถูก" },
          { text: "ดูราคา", link: "/price" },
          { text: "เอียง", italic: true },
        ],
      },
    ]);

    expect(sections[0].html).toBe('<p><strong>ข้อดี:</strong> ราคาถูก<a href="/price">ดูราคา</a><em>เอียง</em></p>');
  });

  it("ตารางแปลงเป็น table + th/td ตาม isHeader", () => {
    const { sections } = renderBlocksToSections([
      heading("h1", "เทียบราคา"),
      {
        id: "t1",
        type: "table",
        rows: [
          {
            cells: [
              { runs: [{ text: "แบบ" }], isHeader: true },
              { runs: [{ text: "ราคา" }], isHeader: true },
            ],
          },
          { cells: [{ runs: [{ text: "ถึงบ้าน" }] }, { runs: [{ text: "สูงกว่า" }] }] },
        ],
      },
    ]);

    expect(sections[0].html).toBe(
      "<table><tr><th>แบบ</th><th>ราคา</th></tr><tr><td>ถึงบ้าน</td><td>สูงกว่า</td></tr></table>"
    );
  });
});

describe("renderBlocksToSections - รูปภาพ", () => {
  it("รูปแรกใต้หัวข้อไปอยู่ที่ section.image", () => {
    const { sections } = renderBlocksToSections([
      heading("h1", "หัวข้อ"),
      image("i1", "https://cdn/a.webp", "รูป ก"),
      paragraph("p1", "เนื้อหา"),
    ]);

    expect(sections).toHaveLength(1);
    expect(sections[0].image).toEqual({ url: "https://cdn/a.webp", alt: "รูป ก" });
    expect(sections[0].html).toBe("<p>เนื้อหา</p>");
  });

  it("รูปใบที่สองในหัวข้อเดียวกันเปิด section ใหม่ ไม่หายและไม่สลับลำดับ", () => {
    const { sections } = renderBlocksToSections([
      heading("h1", "หัวข้อ"),
      image("i1", "https://cdn/a.webp", "รูป ก"),
      paragraph("p1", "เนื้อหา"),
      image("i2", "https://cdn/b.webp", "รูป ข"),
    ]);

    expect(sections).toHaveLength(2);
    expect(sections[0].image?.url).toBe("https://cdn/a.webp");
    expect(sections[1]).toEqual({ heading: "", html: "", image: { url: "https://cdn/b.webp", alt: "รูป ข" } });
  });

  it("caption ที่โครงเก่าไม่มีที่เก็บ ถูกต่อท้ายเป็นย่อหน้า ไม่ถูกทิ้ง", () => {
    const { sections } = renderBlocksToSections([
      heading("h1", "หัวข้อ"),
      image("i1", "https://cdn/a.webp", "รูป ก", "ก่อน-หลังซัก"),
    ]);

    expect(sections[0].html).toBe("<p><em>ก่อน-หลังซัก</em></p>");
  });
});

describe("renderBlocksToSections - Edge Cases", () => {
  it("blocks ว่าง = sections ว่าง (ผู้เรียกต้องกันไม่ให้ push ไฟล์แบบนี้)", () => {
    expect(renderBlocksToSections([]).sections).toEqual([]);
  });

  it("เนื้อหาก่อนหัวข้อแรกไม่หาย — ไปอยู่ใน section หัวข้อว่าง พร้อม warning", () => {
    const { sections, warnings } = renderBlocksToSections([paragraph("p1", "เกริ่นนำ"), heading("h1", "หัวข้อ")]);

    expect(sections[0]).toEqual({ heading: "", html: "<p>เกริ่นนำ</p>" });
    expect(sections[1].heading).toBe("หัวข้อ");
    expect(warnings.some((w) => w.includes("ก่อนหัวข้อแรก"))).toBe(true);
  });

  it("heading level 3 ไม่ตัด section ใหม่ แต่กลายเป็น h3 ในเนื้อ", () => {
    const { sections } = renderBlocksToSections([
      heading("h1", "หัวข้อหลัก"),
      heading("h2", "หัวข้อซ้อน", 3),
      paragraph("p1", "เนื้อหา"),
    ]);

    expect(sections).toHaveLength(1);
    expect(sections[0].html).toBe("<h3>หัวข้อซ้อน</h3>\n<p>เนื้อหา</p>");
  });

  it("ย่อหน้าว่างไม่สร้าง <p></p> เปล่า", () => {
    const { sections } = renderBlocksToSections([heading("h1", "หัวข้อ"), { id: "p1", type: "paragraph", runs: [] }]);

    expect(sections[0].html).toBe("");
  });

  it("HTML ในข้อความผู้ใช้ถูก escape ไม่หลุดเป็น tag จริงตอน push", () => {
    const { sections } = renderBlocksToSections([
      heading("h1", "<img src=x onerror=alert(1)>"),
      paragraph("p1", "<script>alert(1)</script>"),
    ]);

    expect(sections[0].heading).toBe("<img src=x onerror=alert(1)>"); // heading เว็บ render เป็น text (escape เอง)
    expect(sections[0].html).toBe("<p>&lt;script&gt;alert(1)&lt;/script&gt;</p>");
  });

  it("ลิงก์อันตรายถูกตัด href ทิ้งแต่ข้อความยังอยู่", () => {
    const { sections } = renderBlocksToSections([
      heading("h1", "หัวข้อ"),
      { id: "p1", type: "paragraph", runs: [{ text: "กดที่นี่", link: "javascript:alert(1)" }] },
    ]);

    expect(sections[0].html).toBe("<p>กดที่นี่</p>");
  });

  it("warning ไม่ซ้ำกันแม้ block ชนิดเดิมโผล่หลายครั้ง", () => {
    const { warnings } = renderBlocksToSections([
      heading("h1", "หัวข้อ"),
      { id: "d1", type: "divider" },
      { id: "d2", type: "divider" },
    ]);

    expect(warnings).toHaveLength(1);
  });
});
