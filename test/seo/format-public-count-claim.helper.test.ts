import { describe, expect, it } from "vitest";
import { formatPublicCountClaim } from "@/feature/backoffice/seo/ask-answer-faq/helper/format-public-count-claim.helper";

/**
 * Unit Tests สำหรับ format-public-count-claim.helper.ts
 *
 * @logic ที่ต้อง verify:
 * - ปัดยอดลงตามช่วงโดยไม่อ้างเกินข้อมูลจริง
 * - จำนวนที่ตรง threshold ใช้ "อย่างน้อย" แทน "มากกว่า"
 * - ยอดต่ำกว่า 10 และค่าผิดรูปแบบไม่ถูกนำไปใช้เป็น social proof
 * @related
 * - ทดสอบ: {@link @/feature/backoffice/seo/ask-answer-faq/helper/format-public-count-claim.helper.ts}
 */

describe("formatPublicCountClaim", () => {
  it.each([
    [67, "มากกว่า 60 ชิ้น"],
    [358, "มากกว่า 300 ชิ้น"],
    [669, "มากกว่า 600 ชิ้น"],
    [1_475, "มากกว่า 1,000 ชิ้น"],
    [4_221, "มากกว่า 4,000 ชิ้น"],
    [12_876, "มากกว่า 12,000 ชิ้น"],
  ])("แปลง %i เป็น claim กว้าง %s", (count, expected) => {
    expect(formatPublicCountClaim(count, "ชิ้น")).toBe(expected);
  });

  it("ใช้คำว่าอย่างน้อยเมื่อยอดตรง threshold พอดี", () => {
    expect(formatPublicCountClaim(300, "ชิ้นงาน")).toBe("อย่างน้อย 300 ชิ้นงาน");
    expect(formatPublicCountClaim(1_500, "คิว")).toBe("อย่างน้อย 1,500 คิว");
  });

  it.each([
    [10, "อย่างน้อย 10 ชิ้น"],
    [99, "มากกว่า 90 ชิ้น"],
    [100, "อย่างน้อย 100 ชิ้น"],
    [999, "มากกว่า 900 ชิ้น"],
    [1_000, "อย่างน้อย 1,000 ชิ้น"],
    [9_999, "มากกว่า 9,500 ชิ้น"],
    [10_000, "อย่างน้อย 10,000 ชิ้น"],
    [358.9, "มากกว่า 300 ชิ้น"],
  ])("คุมค่ารอยต่อ %s โดยไม่อ้างเกินยอดจริง", (count, expected) => {
    expect(formatPublicCountClaim(count, "ชิ้น")).toBe(expected);
  });

  it("ไม่ใช้ยอดต่ำกว่า 10 หรือค่าที่ไม่ใช่จำนวนจริงเป็น social proof", () => {
    expect(formatPublicCountClaim(9, "ชิ้น")).toBeNull();
    expect(formatPublicCountClaim(0, "ชิ้น")).toBeNull();
    expect(formatPublicCountClaim(-10, "ชิ้น")).toBeNull();
    expect(formatPublicCountClaim(Number.NaN, "ชิ้น")).toBeNull();
    expect(formatPublicCountClaim(Number.POSITIVE_INFINITY, "ชิ้น")).toBeNull();
  });
});
