/**
 * Unit Tests สำหรับ resolve-seo-article-slug.helper.ts
 *
 * @logic ที่ต้อง verify:
 * - บั๊กเดิม: เติม suffix ครั้งเดียวแล้วยิง create → ถ้า slug ที่เติมแล้วชนอีกจะระเบิดที่ @unique
 *   ตัวใหม่ต้องวนเติม -2 -3 -4 ... จนกว่าจะเจอช่องว่างจริง
 * - slug ที่ไม่ใช่ kebab-case ต้องถูกดัดก่อน (hurry-web 404 ถ้า slug ไม่ผ่าน regex)
 * - ต้องไม่วน infinite เมื่อ isTaken ตอบ true ตลอด
 *
 * @related
 * - ทดสอบ: {@link @/feature/backoffice/seo/seo-article/server/resolve-seo-article-slug.helper.ts}
 */
import { describe, expect, it, vi } from "vitest";
import {
  resolveSeoArticleSlug,
  toKebabSlug,
} from "@/feature/backoffice/seo/seo-article/server/resolve-seo-article-slug.helper";

/** จำลองตาราง SeoArticle ที่มี slug เหล่านี้อยู่แล้ว */
const takenSet = (slugs: string[]) => {
  const set = new Set(slugs);
  return vi.fn(async (slug: string) => set.has(slug));
};

describe("toKebabSlug", () => {
  it("ปล่อย slug ที่ถูกต้องอยู่แล้วผ่านโดยไม่แก้", () => {
    expect(toKebabSlug("curtain-mold-removal-guide")).toBe("curtain-mold-removal-guide");
  });

  it("ดัดตัวใหญ่ ช่องว่าง และ _ ให้เป็น kebab-case", () => {
    expect(toKebabSlug("Sofa Cleaning_Guide")).toBe("sofa-cleaning-guide");
  });

  it("ยุบขีดซ้ำและตัดขีดหัวท้ายทิ้ง", () => {
    expect(toKebabSlug("--sofa---cleaning--")).toBe("sofa-cleaning");
  });

  it("คืนสตริงว่างเมื่อไม่เหลืออักขระที่ใช้ได้ (ชื่อไทยล้วน)", () => {
    expect(toKebabSlug("วิธีซักโซฟา")).toBe("");
  });
});

describe("resolveSeoArticleSlug", () => {
  it("คืน slug เดิมเมื่อยังไม่มีใครใช้", async () => {
    const isTaken = takenSet([]);
    await expect(resolveSeoArticleSlug({ baseSlug: "sofa-cleaning", isTaken })).resolves.toBe("sofa-cleaning");
    expect(isTaken).toHaveBeenCalledTimes(1);
  });

  it("เติม -2 เมื่อ slug เดิมถูกใช้แล้ว", async () => {
    const isTaken = takenSet(["sofa-cleaning"]);
    await expect(resolveSeoArticleSlug({ baseSlug: "sofa-cleaning", isTaken })).resolves.toBe("sofa-cleaning-2");
  });

  it("[บั๊กเดิม] วนต่อเป็น -3 -4 เมื่อ suffix แรก ๆ ก็ชนอีก — ไม่ใช่เติมครั้งเดียวแล้วจบ", async () => {
    const isTaken = takenSet(["sofa-cleaning", "sofa-cleaning-2", "sofa-cleaning-3"]);
    await expect(resolveSeoArticleSlug({ baseSlug: "sofa-cleaning", isTaken })).resolves.toBe("sofa-cleaning-4");
  });

  it("ดัด slug ให้เป็น kebab-case ก่อนเช็คว่าชนไหม", async () => {
    const isTaken = takenSet([]);
    await expect(resolveSeoArticleSlug({ baseSlug: "Sofa Cleaning Guide", isTaken })).resolves.toBe(
      "sofa-cleaning-guide"
    );
    expect(isTaken).toHaveBeenCalledWith("sofa-cleaning-guide");
  });

  it("ใช้ slug สำรองเมื่อชื่อที่ได้มาแปลงแล้วเหลือว่าง (กัน slug ว่างชน @unique)", async () => {
    const isTaken = takenSet([]);
    await expect(resolveSeoArticleSlug({ baseSlug: "วิธีซักโซฟา", isTaken })).resolves.toBe("seo-article");
  });

  it("โยน [SEO-SLUG-01] แทนการวนไม่รู้จบ เมื่อหาช่องว่างไม่ได้", async () => {
    const isTaken = vi.fn(async () => true);
    await expect(resolveSeoArticleSlug({ baseSlug: "sofa-cleaning", isTaken, maxAttempts: 5 })).rejects.toThrow(
      /\[SEO-SLUG-01\]/
    );
    // เรียก 5 ครั้ง: base + suffix 2,3,4,5
    expect(isTaken).toHaveBeenCalledTimes(5);
  });
});
