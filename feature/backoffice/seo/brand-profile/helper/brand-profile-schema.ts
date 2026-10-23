import { z } from "zod";
import { SEO_IMAGE_PUBLIC_BASE } from "../../shared/seo-image-base";
import { BRAND_REFERENCE_IMAGES } from "../../seo-article/server/article-image-style.constant";

/** @description รับเฉพาะรูปอ้างอิงเดิมหรือไฟล์อัปโหลดใน storage บริษัท @logic ปิด arbitrary URL fetch @used-by brandProfileInputSchema */
export const isBrandReferenceUrl = (value: string): boolean => {
  if (BRAND_REFERENCE_IMAGES.includes(value)) return true;
  try {
    const url = new URL(value);
    const bases = [new URL(SEO_IMAGE_PUBLIC_BASE)];
    return (
      url.protocol === "https:" &&
      !url.username &&
      !url.password &&
      !url.search &&
      !url.hash &&
      bases.some(
        (base) =>
          url.origin === base.origin &&
          url.pathname.startsWith(`${base.pathname.replace(/\/$/, "")}/site/brand-reference/`)
      ) &&
      /\.(png|jpe?g|webp)$/.test(url.pathname)
    );
  } catch {
    return false;
  }
};

/** @description ตรวจทั้ง metadata รูป, URL และจำนวน reference ก่อนบันทึกหรือเรียก AI */
export const brandProfileInputSchema = z.object({
  revision: z.number().int().min(0),
  systemPrompt: z.string().trim().min(10, "เขียนแนวทางอย่างน้อย 10 ตัวอักษร").max(6000),
  references: z
    .array(
      z.object({
        id: z.string().min(1).max(80),
        label: z.string().trim().min(1, "ระบุชื่อรูป").max(100),
        description: z.string().trim().min(5, "อธิบายสิ่งที่ AI ต้องยึดจากรูปอย่างน้อย 5 ตัวอักษร").max(1200),
        kind: z.enum(["uniform", "equipment", "style"]),
        url: z.string().refine(isBrandReferenceUrl, "กรุณาอัปโหลดรูปผ่านหน้าชุดอ้างอิงบริษัท"),
        enabled: z.boolean(),
      })
    )
    .max(16)
    .refine((items) => new Set(items.map((item) => item.id)).size === items.length, "รูปอ้างอิงมี ID ซ้ำ")
    .refine((items) => items.filter((item) => item.enabled).length <= 8, "เปิดใช้รูปอ้างอิงได้ไม่เกิน 8 รูป"),
});
