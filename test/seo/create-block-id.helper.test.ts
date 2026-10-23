/**
 * Unit Tests สำหรับ create-block-id.helper.ts
 *
 * @logic ที่ต้อง verify:
 * - id ยาวคงที่ 12 ตัว และเป็นอักขระ URL-safe
 * - สุ่มแล้วไม่ชนกันในปริมาณที่บทความจริงใช้
 *
 * @related
 * - ทดสอบ: {@link @/feature/backoffice/seo/seo-article/helper/create-block-id.helper.ts}
 */
import { describe, expect, it } from "vitest";
import { createBlockId } from "@/feature/backoffice/seo/seo-article/helper/create-block-id.helper";

describe("createBlockId", () => {
  it("ยาว 12 ตัวและใช้เฉพาะอักขระ URL-safe", () => {
    const id = createBlockId();

    expect(id).toHaveLength(12);
    expect(id).toMatch(/^[A-Za-z0-9]{12}$/);
  });

  it("สุ่ม 10,000 ครั้งไม่ชนกันเลย", () => {
    const ids = new Set(Array.from({ length: 10_000 }, () => createBlockId()));

    expect(ids.size).toBe(10_000);
  });
});
