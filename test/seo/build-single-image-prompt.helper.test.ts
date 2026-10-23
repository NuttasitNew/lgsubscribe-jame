/**
 * Unit Tests สำหรับ build-single-image-prompt.helper.ts
 *
 * @logic ที่ต้อง verify:
 * - คำอธิบายว่าง/มีแต่ช่องว่าง → [SEO-IMG-GEN-02]
 * - คำอธิบายยาวเกิน MAX_IMAGE_DESCRIPTION_LENGTH (นับหลังยุบช่องว่าง) → [SEO-IMG-GEN-03]
 * - prompt มีคำสั่งผู้ใช้และบริบท; แนวทางภาพถ่ายบริษัทเติมใน generation service
 * - cover กับ inline ต้องได้บรีฟมุมภาพคนละแบบ
 * - alt ที่เสนอ = คำอธิบายที่ยุบช่องว่างแล้ว ตัดที่ท้ายคำไม่เกิน MAX_SUGGESTED_ALT_LENGTH
 *
 * @related
 * - ทดสอบ: {@link @/feature/backoffice/seo/seo-article/server/build-single-image-prompt.helper.ts}
 * - ผู้เรียก: {@link @/feature/backoffice/seo/seo-article/server/generate-single-article-image.action.ts}
 */

import { describe, it, expect } from "vitest";
import {
  buildSingleImagePrompt,
  MAX_IMAGE_DESCRIPTION_LENGTH,
  MAX_SUGGESTED_ALT_LENGTH,
} from "@/feature/backoffice/seo/seo-article/server/build-single-image-prompt.helper";
import {
  BRAND_LOCK,
  IMAGE_STYLE,
} from "@/feature/backoffice/seo/seo-article/server/article-image-style.constant";

/** ชุดค่าตั้งต้นที่ใช้ซ้ำ — fix ไว้ทั้งหมดเพื่อให้ผลลัพธ์ deterministic */
const BASE = {
  articleTitle: "วิธีซักที่นอนให้สะอาดหมดจด",
  placement: "inline" as const,
};

describe("buildSingleImagePrompt - Negative Cases", () => {
  it("คำอธิบายว่าง → ไม่ผ่าน พร้อมโค้ด SEO-IMG-GEN-02", () => {
    const result = buildSingleImagePrompt({ ...BASE, description: "" });

    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("ต้องไม่ผ่าน");
    expect(result.code).toBe("SEO-IMG-GEN-02");
    expect(result.message).toContain("[SEO-IMG-GEN-02]");
  });

  it("คำอธิบายมีแต่ช่องว่าง/ขึ้นบรรทัดใหม่ → ไม่ผ่านเหมือนกัน", () => {
    const result = buildSingleImagePrompt({ ...BASE, description: "   \n\t  " });

    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("ต้องไม่ผ่าน");
    expect(result.code).toBe("SEO-IMG-GEN-02");
  });

  it("คำอธิบายยาวเกินเพดาน → ไม่ผ่าน พร้อมโค้ด SEO-IMG-GEN-03", () => {
    const result = buildSingleImagePrompt({
      ...BASE,
      description: "ก".repeat(MAX_IMAGE_DESCRIPTION_LENGTH + 1),
    });

    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("ต้องไม่ผ่าน");
    expect(result.code).toBe("SEO-IMG-GEN-03");
    expect(result.message).toContain(`${MAX_IMAGE_DESCRIPTION_LENGTH + 1}/${MAX_IMAGE_DESCRIPTION_LENGTH}`);
  });
});

describe("buildSingleImagePrompt - Boundary Values", () => {
  it("ยาวเท่าเพดานพอดี → ผ่าน (ไม่ใช่ off-by-one)", () => {
    const result = buildSingleImagePrompt({
      ...BASE,
      description: "ก".repeat(MAX_IMAGE_DESCRIPTION_LENGTH),
    });

    expect(result.ok).toBe(true);
  });

  it("คำอธิบาย 1 ตัวอักษร → ผ่าน และ alt เท่ากับตัวอักษรนั้น", () => {
    const result = buildSingleImagePrompt({ ...BASE, description: "ก" });

    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error("ต้องผ่าน");
    expect(result.alt).toBe("ก");
  });

  it("นับความยาวหลังยุบช่องว่างแล้ว — เว้นบรรทัดเยอะ ๆ ต้องไม่ทำให้เกินเพดาน", () => {
    // 400 ตัวอักษรจริง แต่คั่นด้วยช่องว่างซ้อนกันเป็นร้อยตัว → ยุบแล้วต้องยังไม่เกิน
    const description = `${"ก".repeat(200)}${" ".repeat(300)}${"ข".repeat(199)}`;
    const result = buildSingleImagePrompt({ ...BASE, description });

    expect(result.ok).toBe(true); // 200 + 1(ช่องว่างที่ยุบเหลือ 1) + 199 = 400 พอดี
  });
});

describe("buildSingleImagePrompt - Happy Path", () => {
  it("prompt ประกอบด้วยคำสั่งผู้ใช้ + ชื่อบทความ + หัวข้อ + ล็อกแบรนด์ + โทนภาพ", () => {
    const result = buildSingleImagePrompt({
      description: "ภาพใกล้ ๆ ของคราบเหลืองบนที่นอน",
      articleTitle: "วิธีซักที่นอนให้สะอาดหมดจด",
      nearbyHeading: "คราบเหลืองเกิดจากอะไร",
      placement: "inline",
    });

    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error("ต้องผ่าน");
    expect(result.prompt).toContain("ภาพใกล้ ๆ ของคราบเหลืองบนที่นอน");
    expect(result.prompt).toContain("วิธีซักที่นอนให้สะอาดหมดจด");
    expect(result.prompt).toContain("คราบเหลืองเกิดจากอะไร");
    expect(result.prompt).not.toContain(BRAND_LOCK); // live brand context is attached by the generation service
    expect(result.prompt).not.toContain(IMAGE_STYLE); // photo style comes from the saved profile
  });

  it("ไม่ส่งหัวข้อใกล้เคียงมา → prompt ยังใช้ได้ ไม่มีคำว่า section ค้างเปล่า ๆ", () => {
    const result = buildSingleImagePrompt({ ...BASE, description: "ห้องนอนสว่าง ๆ หลังทำความสะอาด" });

    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error("ต้องผ่าน");
    expect(result.prompt).not.toContain("The image sits under the section");
    expect(result.prompt).toContain("ห้องนอนสว่าง ๆ หลังทำความสะอาด");
  });

  it("ชื่อบทความว่าง → prompt ยังประกอบได้ (ไม่มีประโยคชื่อบทความค้าง)", () => {
    const result = buildSingleImagePrompt({ description: "โซฟาสะอาด", articleTitle: "", placement: "inline" });

    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error("ต้องผ่าน");
    expect(result.prompt).not.toContain("The article is titled");
  });

  it("placement=cover ได้บรีฟรูปปก ส่วน inline ได้บรีฟรูปแทรก (คนละแบบกัน)", () => {
    const cover = buildSingleImagePrompt({ ...BASE, placement: "cover", description: "ห้องนอนสว่าง" });
    const inline = buildSingleImagePrompt({ ...BASE, placement: "inline", description: "ห้องนอนสว่าง" });

    if (!cover.ok || !inline.ok) throw new Error("ต้องผ่านทั้งคู่");
    expect(cover.prompt).toContain("This is the cover image of the article");
    expect(inline.prompt).toContain("NOT the cover");
    expect(cover.prompt).not.toBe(inline.prompt);
  });
});

describe("buildSingleImagePrompt - alt ที่เสนอ", () => {
  it("ยุบช่องว่างซ้ำ/ขึ้นบรรทัดใหม่ให้เหลือเว้นวรรคเดียว", () => {
    const result = buildSingleImagePrompt({ ...BASE, description: "  ที่นอน   สะอาด \n\n มาก  " });

    if (!result.ok) throw new Error("ต้องผ่าน");
    expect(result.alt).toBe("ที่นอน สะอาด มาก");
  });

  it("คำอธิบายยาวกว่าเพดาน alt → ตัดที่ท้ายคำ ไม่ตัดกลางคำ และไม่เกินเพดาน", () => {
    // 30 คำ คำละ 5 ตัวอักษร + เว้นวรรค = ยาวเกิน 120 แน่นอน
    const description = Array.from({ length: 30 }, () => "คำคำคำคำคำ").join(" ");
    const result = buildSingleImagePrompt({ ...BASE, description });

    if (!result.ok) throw new Error("ต้องผ่าน");
    expect(result.alt.length).toBeLessThanOrEqual(MAX_SUGGESTED_ALT_LENGTH);
    expect(result.alt.endsWith(" ")).toBe(false);
    // ตัดที่ขอบคำ → คำสุดท้ายต้องเป็นคำเต็ม
    expect(result.alt.split(" ").pop()).toBe("คำคำคำคำคำ");
  });

  it("คำเดียวยาวเกินเพดาน (ไม่มีช่องว่างให้ตัด) → ตัดตรง ๆ ไม่คืนค่าว่าง", () => {
    const result = buildSingleImagePrompt({ ...BASE, description: "ก".repeat(200) });

    if (!result.ok) throw new Error("ต้องผ่าน");
    expect(result.alt).toBe("ก".repeat(MAX_SUGGESTED_ALT_LENGTH));
  });
});
