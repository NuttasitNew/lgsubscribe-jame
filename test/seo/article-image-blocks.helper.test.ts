/**
 * Unit Tests สำหรับ article-image-blocks.helper.ts
 *
 * @logic ที่ต้อง verify:
 * - กลไกแทรกรูปใหม่ (แทน section.image ที่ไม่มีแล้ว) ต้องวางรูปใต้หัวข้อ level 2 และเว้นหัวข้อสุดท้าย (CTA)
 * - **กันสร้างรูปซ้ำ**: หัวข้อที่มีรูปอยู่แล้วต้องไม่ถูกเลือก และรูปครบโควตา = ไม่มี slot เลย
 *   (ถ้าพลาดข้อนี้ = ยิง gpt-image-2 ใหม่ทุกรอบ = เผาค่า API)
 * - แทรกหลายใบพร้อมกันแล้ว index ต้องไม่เลื่อนจนรูปไปผิดตำแหน่ง
 * - รูปที่ไม่มี alt ต้องไม่ถูกแทรก (เสีย SEO + ผิด a11y)
 *
 * @related
 * - ทดสอบ: {@link @/feature/backoffice/seo/seo-article/server/article-image-blocks.helper.ts}
 */
import { describe, expect, it } from "vitest";
import {
  countArticleImageBlocks,
  insertArticleImageBlocks,
  planArticleImageSlots,
  removeArticleImageBlocks,
} from "@/feature/backoffice/seo/seo-article/server/article-image-blocks.helper";
import type {
  SeoArticleBlock,
  SeoArticleHeadingLevel,
} from "@/feature/backoffice/seo/seo-article/type/seo-article-block.type";

/** id แบบเดาได้ เพื่อให้ assertion deterministic */
function createSequentialId(): () => string {
  let counter = 0;
  return () => {
    counter += 1;
    return `img-${counter}`;
  };
}

const heading = (id: string, text: string, level: SeoArticleHeadingLevel = 2): SeoArticleBlock => ({
  id,
  type: "heading",
  level,
  runs: [{ text }],
});

const paragraph = (id: string, text: string): SeoArticleBlock => ({ id, type: "paragraph", runs: [{ text }] });

const image = (id: string, url: string): SeoArticleBlock => ({ id, type: "image", url, alt: "รูปเดิม" });

/** บทความมาตรฐาน 3 หัวข้อ (หัวข้อที่ 3 = CTA ปิดท้าย) */
const buildArticle = (): SeoArticleBlock[] => [
  heading("h1", "คราบฉี่บนที่นอนกำจัดยากเพราะอะไร"),
  paragraph("p1", "เนื้อหาหัวข้อแรก"),
  heading("h2", "ขั้นตอนทำความสะอาดด้วยตัวเอง"),
  paragraph("p2", "เนื้อหาหัวข้อสอง"),
  heading("h3", "ให้ Hurryclean ช่วยดูแล"),
  paragraph("p3", "ทักมาทาง LINE"),
];

describe("countArticleImageBlocks", () => {
  it("นับเฉพาะบล็อก image ที่มี url จริง", () => {
    const blocks: SeoArticleBlock[] = [
      image("i1", "https://cdn/a.webp"),
      { id: "i2", type: "image", url: "   ", alt: "ว่าง" },
      paragraph("p1", "ข้อความ"),
    ];
    expect(countArticleImageBlocks(blocks)).toBe(1);
  });
});

describe("removeArticleImageBlocks", () => {
  it("ลบบล็อกรูปออกหมดโดยไม่แตะบล็อกอื่นและไม่แก้ array เดิม", () => {
    const blocks = [...buildArticle(), image("i1", "https://cdn/a.webp")];
    const result = removeArticleImageBlocks(blocks);

    expect(result).toHaveLength(blocks.length - 1);
    expect(result.some((block) => block.type === "image")).toBe(false);
    expect(blocks).toHaveLength(7); // ของเดิมไม่ถูกแก้
  });
});

describe("planArticleImageSlots", () => {
  it("วางรูปใต้หัวข้อ level 2 และเว้นหัวข้อสุดท้ายที่เป็น CTA", () => {
    const slots = planArticleImageSlots(buildArticle());

    // หัวข้อที่ใช้ได้คือ index 0 กับ 2 → แทรกที่ 1 กับ 3, หัวข้อ index 4 (CTA) ถูกเว้น
    expect(slots).toEqual([
      { insertAt: 1, heading: "คราบฉี่บนที่นอนกำจัดยากเพราะอะไร" },
      { insertAt: 3, heading: "ขั้นตอนทำความสะอาดด้วยตัวเอง" },
    ]);
  });

  it("ไม่นับหัวข้อ level 3 เป็นตำแหน่งวางรูป", () => {
    const blocks: SeoArticleBlock[] = [
      heading("h1", "หัวข้อหลัก"),
      heading("h2", "หัวข้อซ้อน", 3),
      paragraph("p1", "เนื้อหา"),
      heading("h3", "ปิดท้าย"),
    ];
    expect(planArticleImageSlots(blocks)).toEqual([{ insertAt: 1, heading: "หัวข้อหลัก" }]);
  });

  it("[กันซ้ำ] ข้ามหัวข้อที่มีรูปอยู่ใต้หัวข้ออยู่แล้ว", () => {
    const blocks: SeoArticleBlock[] = [
      heading("h1", "หัวข้อหนึ่ง"),
      image("i1", "https://cdn/a.webp"),
      paragraph("p1", "เนื้อหา"),
      heading("h2", "หัวข้อสอง"),
      paragraph("p2", "เนื้อหา"),
      heading("h3", "ปิดท้าย"),
      paragraph("p3", "CTA"),
    ];

    // โควตา 2 ใบ มีอยู่แล้ว 1 → เหลือ 1 และต้องเป็นหัวข้อสองเท่านั้น
    expect(planArticleImageSlots(blocks)).toEqual([{ insertAt: 4, heading: "หัวข้อสอง" }]);
  });

  it("[กันซ้ำ] คืน [] เมื่อรูปครบโควตาแล้ว — ไม่ยิง API ซ้ำ", () => {
    const blocks: SeoArticleBlock[] = [
      heading("h1", "หัวข้อหนึ่ง"),
      image("i1", "https://cdn/a.webp"),
      heading("h2", "หัวข้อสอง"),
      image("i2", "https://cdn/b.webp"),
      heading("h3", "ปิดท้าย"),
    ];
    expect(planArticleImageSlots(blocks)).toEqual([]);
  });

  it("คืน [] เมื่อบทความไม่มีหัวข้อเลย", () => {
    expect(planArticleImageSlots([paragraph("p1", "ข้อความล้วน")])).toEqual([]);
  });

  it("บทความหัวข้อเดียวยังได้รูป 1 ใบ (ไม่ถูกเว้นเพราะเป็นหัวข้อสุดท้าย)", () => {
    const blocks: SeoArticleBlock[] = [heading("h1", "หัวข้อเดียว"), paragraph("p1", "เนื้อหา")];
    expect(planArticleImageSlots(blocks)).toEqual([{ insertAt: 1, heading: "หัวข้อเดียว" }]);
  });

  it("เคารพ maxImages ที่ส่งเข้ามา", () => {
    expect(planArticleImageSlots(buildArticle(), { maxImages: 1 })).toHaveLength(1);
    expect(planArticleImageSlots(buildArticle(), { maxImages: 0 })).toEqual([]);
  });
});

describe("insertArticleImageBlocks", () => {
  it("แทรกหลายใบแล้วทุกใบยังอยู่ใต้หัวข้อที่ตั้งใจ (index ไม่เลื่อน)", () => {
    const blocks = buildArticle();
    const slots = planArticleImageSlots(blocks);

    const result = insertArticleImageBlocks(
      blocks,
      slots.map((slot, index) => ({ insertAt: slot.insertAt, url: `https://cdn/${index}.webp`, alt: slot.heading })),
      { createId: createSequentialId() }
    );

    expect(result.map((block) => block.type)).toEqual([
      "heading",
      "image",
      "paragraph",
      "heading",
      "image",
      "paragraph",
      "heading",
      "paragraph",
    ]);
    expect(result[1]).toEqual({
      id: "img-2",
      type: "image",
      url: "https://cdn/0.webp",
      alt: "คราบฉี่บนที่นอนกำจัดยากเพราะอะไร",
    });
    expect(result[4]).toMatchObject({ url: "https://cdn/1.webp", alt: "ขั้นตอนทำความสะอาดด้วยตัวเอง" });
  });

  it("ใส่ caption เฉพาะตอนมีค่า", () => {
    const result = insertArticleImageBlocks(
      [paragraph("p1", "ข้อความ")],
      [{ insertAt: 0, url: "https://cdn/a.webp", alt: "คำอธิบาย", caption: "ใต้รูป" }],
      { createId: createSequentialId() }
    );
    expect(result[0]).toEqual({
      id: "img-1",
      type: "image",
      url: "https://cdn/a.webp",
      alt: "คำอธิบาย",
      caption: "ใต้รูป",
    });
    expect(result[0]).not.toHaveProperty("caption", undefined);
  });

  it("ไม่แทรกรูปที่ไม่มี alt หรือไม่มี url", () => {
    const blocks = [paragraph("p1", "ข้อความ")];
    const result = insertArticleImageBlocks(
      blocks,
      [
        { insertAt: 0, url: "https://cdn/a.webp", alt: "   " },
        { insertAt: 0, url: "", alt: "มี alt แต่ไม่มีรูป" },
      ],
      { createId: createSequentialId() }
    );
    expect(result).toEqual(blocks);
  });

  it("clamp ตำแหน่งที่เกินช่วงแทนการพัง", () => {
    const blocks = [paragraph("p1", "ข้อความ")];
    const result = insertArticleImageBlocks(blocks, [{ insertAt: 99, url: "https://cdn/a.webp", alt: "รูป" }], {
      createId: createSequentialId(),
    });
    expect(result).toHaveLength(2);
    expect(result[1].type).toBe("image");
  });

  it("ไม่แก้ array เดิม", () => {
    const blocks = buildArticle();
    insertArticleImageBlocks(blocks, [{ insertAt: 1, url: "https://cdn/a.webp", alt: "รูป" }]);
    expect(blocks).toHaveLength(6);
  });
});
