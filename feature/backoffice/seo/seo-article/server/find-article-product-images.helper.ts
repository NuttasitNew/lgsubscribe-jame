import "server-only";

import { allProducts } from "@/lib/catalog-products";
import { siteConfig } from "@/lib/site";

/** แนบรูปสินค้าได้กี่ใบต่อภาพ — มากกว่านี้ AI มักยัดเครื่องหลายรุ่นลงฉากเดียว */
const MAX_PRODUCT_REFERENCES = 2;

/**
 * @description หารูปสินค้าจริง (packshot ทางการใน public/) ของรุ่นที่บทความพูดถึง เพื่อแนบให้ gpt-image-2.5-sunburst วาดเครื่องรุ่นนั้นจริง
 * @access server-only
 * @logic
 * - อ่านจาก JSON ของบทความทั้งก้อน (บล็อก + ตาราง + FAQ) ไม่ผูกกับโครงบล็อก
 * - ลิงก์ `/products/<slug>` ชี้รุ่นชัดที่สุด จึงมาก่อน ; ตามด้วยรหัสรุ่นที่โผล่ในเนื้อ (เช่น WD516AN, SAQ13A)
 *   รหัสรุ่นต้องยาว 5 ตัวขึ้นไปและเทียบเป็นคำเต็ม กันรหัสสั้นไปชนคำอื่น
 * - เรียงตามจำนวนครั้งที่ถูกพูดถึง (รุ่นหลักของบทความก่อน) แล้วตัดเหลือ {@link MAX_PRODUCT_REFERENCES}
 * - คืน URL เต็มบนเว็บจริง เพราะ OpenAI ต้องโหลดรูปจาก URL (บน Vercel ไฟล์ public ไม่อยู่ใน function)
 * @param content contentJson ของบทความ (รูปแบบใดก็ได้)
 * @returns URL รูปสินค้า (ว่าง = บทความไม่ได้พูดถึงรุ่นใดในแคตตาล็อก)
 * @used-by {@link ./run-generate-images-job.helper.ts}, {@link ./run-single-image-job.helper.ts}
 */
export const findArticleProductImageUrls = (content: unknown): string[] => {
  const json = JSON.stringify(content ?? "");
  const scored = allProducts
    .map((product) => {
      const linkHits = json.split(`/products/${product.slug}`).length - 1;
      const model = (product.model ?? "").trim();
      const modelHits =
        model.length >= 5
          ? (json.match(new RegExp(`(?<![A-Za-z0-9])${model.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(?![A-Za-z0-9])`, "gi")) ?? [])
              .length
          : 0;
      return { image: product.image, score: linkHits * 10 + modelHits };
    })
    .filter((item) => item.score > 0 && item.image?.startsWith("/"))
    .sort((a, b) => b.score - a.score);

  const images = [...new Set(scored.map((item) => item.image))].slice(0, MAX_PRODUCT_REFERENCES);
  return images.map((path) => `${siteConfig.url}${path}`);
};
