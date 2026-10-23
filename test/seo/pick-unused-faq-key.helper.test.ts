import { describe, expect, it } from "vitest";
import { createFaqKey } from "@/feature/backoffice/seo/ask-answer-faq/helper/create-faq-key.helper";
import { pickUnusedFaqKey } from "@/feature/backoffice/seo/ask-answer-faq/helper/pick-unused-faq-key.helper";

describe("createFaqKey", () => {
  it("ได้รูปแบบเดียวกับข้อเดิมบนเว็บ (faqs-<8 ตัว hex>)", () => {
    expect(createFaqKey()).toMatch(/^faqs-[0-9a-f]{8}$/);
  });

  it("สุ่มไม่ซ้ำกันในการเรียกติด ๆ กัน 200 ครั้ง", () => {
    const keys = new Set(Array.from({ length: 200 }, () => createFaqKey()));
    expect(keys.size).toBe(200);
  });
});

describe("pickUnusedFaqKey", () => {
  it("คืน id ที่ยังไม่ถูกใช้", () => {
    expect(pickUnusedFaqKey(new Set(["faqs-aaaaaaaa"]), () => "faqs-bbbbbbbb")).toBe("faqs-bbbbbbbb");
  });

  it("สุ่มใหม่เมื่อชนกับ id ที่มีอยู่ — ไม่คืนตัวซ้ำเงียบ ๆ", () => {
    const sequence = ["faqs-aaaaaaaa", "faqs-aaaaaaaa", "faqs-cccccccc"];
    let call = 0;
    const generate = () => sequence[call++] ?? "faqs-zzzzzzzz";

    expect(pickUnusedFaqKey(new Set(["faqs-aaaaaaaa"]), generate)).toBe("faqs-cccccccc");
    expect(call).toBe(3);
  });

  it("ชนทุกครั้งจนครบ 10 รอบ → โยน error แทนคืน id ซ้ำ (id ซ้ำ = accordion บนเว็บพัง)", () => {
    expect(() => pickUnusedFaqKey(new Set(["faqs-aaaaaaaa"]), () => "faqs-aaaaaaaa")).toThrow("[FAQ-KEY-01]");
  });

  it("ชุด used ว่าง = คืนตัวแรกที่สุ่มได้เลย", () => {
    expect(pickUnusedFaqKey(new Set(), () => "faqs-11111111")).toBe("faqs-11111111");
  });
});
