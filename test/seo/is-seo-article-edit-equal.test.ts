/**
 * @description Unit test สำหรับ isSeoArticleEditEqual — ตัวตัดสินว่าปุ่มบันทึกควรกดได้ไหม
 * @logic
 * - id ของ block และช่องว่างหัวท้าย "ไม่นับ" เป็นความต่าง (กันเคสเปิดแล้วปิด = deploy เว็บใหม่)
 * - ทุก field ที่มีผลกับไฟล์ที่ push ขึ้นเว็บ ต้องนับเป็นความต่าง
 * @related {@link helper/is-seo-article-edit-equal.ts}
 */
import { describe, it, expect } from "vitest";
import { isSeoArticleEditEqual, type SeoArticleEditSnapshot } from "@/lib/seo/helper/is-seo-article-edit-equal";
import type { SeoArticleBlockContent } from "@/feature/backoffice/seo/seo-article/type/seo-article-block.type";

const baseContent: SeoArticleBlockContent = {
  version: 2,
  coverImage: "https://x/cover.webp",
  category: "careTips",
  blocks: [
    { id: "b1", type: "heading", level: 2, runs: [{ text: "หัวข้อ" }] },
    { id: "b2", type: "paragraph", runs: [{ text: "เนื้อหา" }] },
  ],
  faq: [{ question: "ใช้เวลานานไหม?", answer: "1-2 ชั่วโมง" }],
};

const baseSnapshot: SeoArticleEditSnapshot = {
  title: "ซักที่นอน",
  slug: "mattress-cleaning",
  metaDescription: "วิธีซักที่นอน",
  keywords: ["ซักที่นอน", "คราบฉี่"],
  content: baseContent,
};

/** clone แบบลึกเพื่อไม่ให้เคสหนึ่งไปแก้ข้อมูลของอีกเคส */
const clone = (snapshot: SeoArticleEditSnapshot): SeoArticleEditSnapshot =>
  JSON.parse(JSON.stringify(snapshot)) as SeoArticleEditSnapshot;

describe("isSeoArticleEditEqual", () => {
  it("ของเดิมเป๊ะ → เท่ากัน", () => {
    expect(isSeoArticleEditEqual(baseSnapshot, clone(baseSnapshot))).toBe(true);
  });

  it("id ของ block เปลี่ยน แต่ตัวอักษรเหมือนเดิม → ยังถือว่าเท่ากัน", () => {
    const after = clone(baseSnapshot);
    after.content.blocks[0].id = "อีก-id";
    after.content.blocks[1].id = "id-ใหม่";
    expect(isSeoArticleEditEqual(baseSnapshot, after)).toBe(true);
  });

  it("ช่องว่างหัวท้ายของ title/slug/meta/keyword ไม่นับเป็นความต่าง", () => {
    const after = clone(baseSnapshot);
    after.title = "  ซักที่นอน  ";
    after.slug = " mattress-cleaning ";
    after.metaDescription = "วิธีซักที่นอน ";
    after.keywords = [" ซักที่นอน", "คราบฉี่ "];
    expect(isSeoArticleEditEqual(baseSnapshot, after)).toBe(true);
  });

  it("coverImage ไม่มีค่า vs เป็นสตริงว่าง → เท่ากัน", () => {
    const before = clone(baseSnapshot);
    const after = clone(baseSnapshot);
    delete before.content.coverImage;
    after.content.coverImage = "";
    expect(isSeoArticleEditEqual(before, after)).toBe(true);
  });

  it("FAQ ว่างเปล่าที่ผู้ใช้กดเพิ่มแล้วไม่ได้กรอก → ไม่นับเป็นความต่าง", () => {
    const after = clone(baseSnapshot);
    after.content.faq.push({ question: "", answer: "" });
    expect(isSeoArticleEditEqual(baseSnapshot, after)).toBe(true);
  });

  it("แก้ข้อความในบล็อก → ต่างกัน", () => {
    const after = clone(baseSnapshot);
    after.content.blocks[1] = { id: "b2", type: "paragraph", runs: [{ text: "เนื้อหาใหม่" }] };
    expect(isSeoArticleEditEqual(baseSnapshot, after)).toBe(false);
  });

  it("สลับลำดับบล็อก → ต่างกัน", () => {
    const after = clone(baseSnapshot);
    after.content.blocks.reverse();
    expect(isSeoArticleEditEqual(baseSnapshot, after)).toBe(false);
  });

  it("เปลี่ยน bold ของ run → ต่างกัน", () => {
    const after = clone(baseSnapshot);
    after.content.blocks[1] = { id: "b2", type: "paragraph", runs: [{ text: "เนื้อหา", bold: true }] };
    expect(isSeoArticleEditEqual(baseSnapshot, after)).toBe(false);
  });

  it("เปลี่ยน level ของ heading → ต่างกัน", () => {
    const after = clone(baseSnapshot);
    after.content.blocks[0] = { id: "b1", type: "heading", level: 3, runs: [{ text: "หัวข้อ" }] };
    expect(isSeoArticleEditEqual(baseSnapshot, after)).toBe(false);
  });

  it("เปลี่ยน alt ของรูป → ต่างกัน (alt มีผลกับ SEO)", () => {
    const before = clone(baseSnapshot);
    before.content.blocks.push({ id: "img", type: "image", url: "https://x/y.webp", alt: "เก่า" });
    const after = clone(before);
    after.content.blocks[2] = { id: "img", type: "image", url: "https://x/y.webp", alt: "ใหม่" };
    expect(isSeoArticleEditEqual(before, after)).toBe(false);
  });

  it("เปลี่ยนหัวตาราง (isHeader) → ต่างกัน", () => {
    const before = clone(baseSnapshot);
    before.content.blocks.push({ id: "t", type: "table", rows: [{ cells: [{ runs: [{ text: "a" }] }] }] });
    const after = clone(before);
    after.content.blocks[2] = {
      id: "t",
      type: "table",
      rows: [{ cells: [{ runs: [{ text: "a" }], isHeader: true }] }],
    };
    expect(isSeoArticleEditEqual(before, after)).toBe(false);
  });

  it("สลับลำดับ keywords → ต่างกัน (keywords[0] คือคำเป้าหมาย)", () => {
    const after = clone(baseSnapshot);
    after.keywords = ["คราบฉี่", "ซักที่นอน"];
    expect(isSeoArticleEditEqual(baseSnapshot, after)).toBe(false);
  });

  it("เปลี่ยนหมวดบทความ → ต่างกัน", () => {
    const after = clone(baseSnapshot);
    after.content.category = "services";
    expect(isSeoArticleEditEqual(baseSnapshot, after)).toBe(false);
  });

  it("เปลี่ยน slug → ต่างกัน", () => {
    const after = clone(baseSnapshot);
    after.slug = "mattress-cleaning-2";
    expect(isSeoArticleEditEqual(baseSnapshot, after)).toBe(false);
  });

  it("แก้คำตอบ FAQ → ต่างกัน", () => {
    const after = clone(baseSnapshot);
    after.content.faq[0].answer = "2-3 ชั่วโมง";
    expect(isSeoArticleEditEqual(baseSnapshot, after)).toBe(false);
  });
});

it("counts a changed target keyword as an edit", () => {
  expect(isSeoArticleEditEqual(baseSnapshot, { ...baseSnapshot, targetKeyword: "ซักที่นอน ราคา" })).toBe(false);
});
