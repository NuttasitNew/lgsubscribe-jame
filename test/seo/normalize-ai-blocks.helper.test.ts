/**
 * Unit Tests สำหรับ normalize-ai-blocks.helper.ts
 *
 * @logic ที่ต้อง verify:
 * - AI พ่นบล็อกโครงแบนมา → ต้องกลายเป็น SeoArticleBlock ตามสเปก v2 พร้อม id ที่เราสร้างเอง
 * - heading ต้องเริ่มที่ level 2 เสมอ (h1 สงวนให้ชื่อบทความ) — level เพี้ยนต้องถูกดัด ไม่ใช่ทิ้ง
 * - บล็อกเสียต้องถูกทิ้ง "พร้อม warning" ห้ามหายเงียบ เพราะคนรีวิวต้องรู้ว่า AI พ่นของเสียมา
 * - run ต้องเป็น plain text + ห้ามมี `bold: false` + ลิงก์ javascript: ต้องถูกตัด (เนื้อหานี้ขึ้นเว็บจริง)
 * - schema ที่ส่งเข้า Anthropic ห้ามมี minItems > 1 (structured output ไม่รองรับ)
 *
 * @related
 * - ทดสอบ: {@link @/feature/backoffice/seo/seo-article/server/normalize-ai-blocks.helper.ts}
 */
import { describe, expect, it } from "vitest";
import { z } from "zod";
import {
  aiArticleBlockSchema,
  normalizeAiBlocks,
  normalizeAiRuns,
} from "@/feature/backoffice/seo/seo-article/server/normalize-ai-blocks.helper";

/** id แบบเดาได้ เพื่อให้ assertion deterministic */
function createSequentialId(): () => string {
  let counter = 0;
  return () => {
    counter += 1;
    return `blk-${counter}`;
  };
}

const normalize = (blocks: unknown) => normalizeAiBlocks(blocks, { createId: createSequentialId() });

describe("normalizeAiRuns", () => {
  it("เก็บ flag เฉพาะตอนเป็น true — ห้ามมี bold: false ใน JSON", () => {
    const runs = normalizeAiRuns([{ text: "ปกติ", bold: false, italic: false }]);
    expect(runs).toEqual([{ text: "ปกติ" }]);
    expect(runs[0]).not.toHaveProperty("bold");
  });

  it("รวม run ที่ติดกันและจัดรูปแบบเหมือนกันเป็นตัวเดียว", () => {
    expect(
      normalizeAiRuns([{ text: "ห้าม", bold: true }, { text: "ใช้น้ำร้อน", bold: true }, { text: " เด็ดขาด" }])
    ).toEqual([{ text: "ห้ามใช้น้ำร้อน", bold: true }, { text: " เด็ดขาด" }]);
  });

  it("เก็บ run ที่เป็นช่องว่างล้วนไว้ (เป็นตัวคั่นคำจริง) แต่ทิ้ง text ว่าง", () => {
    expect(
      normalizeAiRuns([{ text: "ก", bold: true }, { text: " " }, { text: "" }, { text: "ข", bold: true }])
    ).toEqual([{ text: "ก", bold: true }, { text: " " }, { text: "ข", bold: true }]);
  });

  it("ตัดลิงก์ที่ไม่ใช่ http/https หรือ path ภายในทิ้ง (กัน XSS ผ่าน javascript:)", () => {
    expect(normalizeAiRuns([{ text: "กดที่นี่", link: "javascript:alert(1)" }])).toEqual([{ text: "กดที่นี่" }]);
    expect(normalizeAiRuns([{ text: "ลิงก์", link: "https://hurryclean.com" }])).toEqual([
      { text: "ลิงก์", link: "https://hurryclean.com" },
    ]);
    expect(normalizeAiRuns([{ text: "ในเว็บ", link: "/blog/abc" }])).toEqual([{ text: "ในเว็บ", link: "/blog/abc" }]);
  });

  it("คืน [] เมื่อ input ไม่ใช่ array หรือมีของแปลกปน", () => {
    expect(normalizeAiRuns(undefined)).toEqual([]);
    expect(normalizeAiRuns([null, "ข้อความลอย", { text: 5 }])).toEqual([]);
  });
});

describe("normalizeAiBlocks", () => {
  it("ใส่ id ให้ทุกบล็อกฝั่งเรา (ไม่ให้ AI ตั้งเอง)", () => {
    const { blocks } = normalize([
      { type: "heading", level: 2, runs: [{ text: "หัวข้อ" }] },
      { type: "paragraph", runs: [{ text: "ย่อหน้า" }] },
      { type: "divider" },
    ]);

    expect(blocks.map((block) => block.id)).toEqual(["blk-1", "blk-2", "blk-3"]);
    expect(blocks[2]).toEqual({ id: "blk-3", type: "divider" });
  });

  it("id ที่ AI ส่งมาเองถูกทับด้วยของเรา", () => {
    const { blocks } = normalize([{ id: "ai-ตั้งเอง", type: "paragraph", runs: [{ text: "ข้อความ" }] }]);
    expect(blocks[0].id).toBe("blk-1");
  });

  it("แปลง list / table / callout ครบตามสเปก", () => {
    const { blocks } = normalize([
      { type: "bulletList", items: [{ runs: [{ text: "ข้อหนึ่ง" }] }, { runs: [{ text: "ข้อสอง" }] }] },
      { type: "callout", variant: "warn", runs: [{ text: "ห้ามใช้น้ำร้อน" }] },
      {
        type: "table",
        rows: [
          {
            cells: [
              { runs: [{ text: "วิธี" }], isHeader: true },
              { runs: [{ text: "ราคา" }], isHeader: true },
            ],
          },
          { cells: [{ runs: [{ text: "ซักเอง" }] }, { runs: [{ text: "ถูกกว่า" }] }] },
        ],
      },
    ]);

    expect(blocks[0]).toEqual({
      id: "blk-1",
      type: "bulletList",
      items: [{ runs: [{ text: "ข้อหนึ่ง" }] }, { runs: [{ text: "ข้อสอง" }] }],
    });
    expect(blocks[1]).toEqual({ id: "blk-2", type: "callout", variant: "warn", runs: [{ text: "ห้ามใช้น้ำร้อน" }] });
    expect(blocks[2]).toMatchObject({ type: "table" });
    expect(blocks[2]).toHaveProperty("rows[0].cells[0].isHeader", true);
    // cell ปกติต้องไม่มี key isHeader ติดมา
    expect(blocks[2]).not.toHaveProperty("rows[1].cells[0].isHeader");
  });

  it("callout ที่ไม่ระบุ variant (หรือระบุมั่ว) ตกเป็น info", () => {
    const { blocks } = normalize([
      { type: "callout", runs: [{ text: "ข้อมูลเสริม" }] },
      { type: "callout", variant: "danger", runs: [{ text: "อีกกล่อง" }] },
    ]);
    expect(blocks[0]).toMatchObject({ variant: "info" });
    expect(blocks[1]).toMatchObject({ variant: "info" });
  });

  describe("heading level", () => {
    it("ดัด level ที่ไม่ใช่ 2/3 ให้เป็น 2 พร้อม warning", () => {
      const { blocks, warnings } = normalize([{ type: "heading", level: 1, runs: [{ text: "หัวข้อ" }] }]);
      expect(blocks[0]).toMatchObject({ level: 2 });
      expect(warnings[0]).toContain("level=1");
    });

    it("เลื่อน h3 ที่มาก่อน h2 ขึ้นเป็น h2 (บทความต้องเริ่มที่ level 2)", () => {
      const { blocks, warnings } = normalize([
        { type: "heading", level: 3, runs: [{ text: "มาก่อน" }] },
        { type: "heading", level: 3, runs: [{ text: "ซ้อนได้แล้ว" }] },
      ]);
      expect(blocks[0]).toMatchObject({ level: 2 });
      expect(blocks[1]).toMatchObject({ level: 3 });
      expect(warnings.some((warning) => warning.includes("h3 มาก่อน h2"))).toBe(true);
    });

    it("เก็บ level 3 ไว้ตามเดิมเมื่อมี h2 นำมาก่อนแล้ว", () => {
      const { blocks, warnings } = normalize([
        { type: "heading", level: 2, runs: [{ text: "หลัก" }] },
        { type: "heading", level: 3, runs: [{ text: "ซ้อน" }] },
      ]);
      expect(blocks.map((block) => (block.type === "heading" ? block.level : null))).toEqual([2, 3]);
      expect(warnings).toEqual([]);
    });
  });

  describe("ของเสียต้องถูกทิ้งพร้อม warning", () => {
    it("ทิ้งบล็อกข้อความที่ไม่มีตัวอักษรจริง", () => {
      const { blocks, warnings } = normalize([
        { type: "paragraph", runs: [{ text: "   " }] },
        { type: "heading", level: 2, runs: [] },
      ]);
      expect(blocks).toEqual([]);
      expect(warnings).toHaveLength(2);
    });

    it("ทิ้ง list ที่ทุกรายการว่าง และ table ที่ไม่มีแถว", () => {
      const { blocks, warnings } = normalize([
        { type: "numberedList", items: [{ runs: [{ text: "  " }] }] },
        { type: "table", rows: [] },
      ]);
      expect(blocks).toEqual([]);
      expect(warnings.some((warning) => warning.includes("numberedList"))).toBe(true);
      expect(warnings.some((warning) => warning.includes("table"))).toBe(true);
    });

    it("ทิ้งบล็อก image ที่ AI ไม่ควรพ่นมา (รูปเป็นหน้าที่ของระบบ) พร้อม warning", () => {
      const { blocks, warnings } = normalize([
        { type: "image", url: "https://ai-แต่งเอง/a.png", alt: "รูป" },
        { type: "paragraph", runs: [{ text: "ย่อหน้าจริง" }] },
      ]);
      expect(blocks).toHaveLength(1);
      expect(blocks[0].type).toBe("paragraph");
      expect(warnings[0]).toContain("image");
    });

    it("ทิ้ง type ที่ไม่รู้จักและของที่ไม่ใช่ object", () => {
      const { blocks, warnings } = normalize([{ type: "video" }, "ข้อความลอย", null]);
      expect(blocks).toEqual([]);
      expect(warnings).toHaveLength(3);
    });

    it("คืน warning เมื่อ AI ไม่ได้ส่ง blocks เป็น array", () => {
      const { blocks, warnings } = normalize(undefined);
      expect(blocks).toEqual([]);
      expect(warnings).toEqual(["AI ไม่ได้ส่ง blocks กลับมาเป็น array"]);
    });
  });
});

describe("aiArticleBlockSchema (ข้อจำกัด Anthropic)", () => {
  it("ไม่มี minItems > 1 ที่ไหนเลยใน JSON Schema", () => {
    const jsonSchema = JSON.stringify(z.toJSONSchema(aiArticleBlockSchema));
    const minItems = [...jsonSchema.matchAll(/"minItems":\s*(\d+)/g)].map((match) => Number(match[1]));
    expect(minItems.every((value) => value <= 1)).toBe(true);
  });

  it("ไม่เปิดให้ AI ส่ง type image (ระบบแทรกรูปเอง)", () => {
    expect(aiArticleBlockSchema.safeParse({ type: "image" }).success).toBe(false);
    expect(aiArticleBlockSchema.safeParse({ type: "paragraph", runs: [{ text: "ok" }] }).success).toBe(true);
  });
});
