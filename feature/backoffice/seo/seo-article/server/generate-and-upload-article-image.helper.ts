import "server-only";
import { generateImage } from "@/lib/openai/generate-image";
import { uploadMediaBuffer } from "@/lib/r2/media-upload";
import { reencodeImageBuffer } from "@/lib/seo/helper/reencode-image-buffer";
import { readBrandProfile } from "../../brand-profile/server/read-brand-profile";
import { buildBrandImageContext } from "../../brand-profile/helper/build-brand-image-context";
import { selectBrandReferenceKinds } from "../../brand-profile/helper/select-brand-reference-kinds.helper";
import { PRODUCT_REFERENCE_LOCK } from "./article-image-style.constant";

/** ขนาดรูปมาตรฐานของภาพประกอบบทความ (landscape) — เว็บใช้สัดส่วนนี้ทั้งปกและรูปแทรก */
export const ARTICLE_IMAGE_SIZE = { width: 1536, height: 1024 } as const;

/**
 * คุณภาพของ gpt-image-2.5-sunburst สำหรับภาพบทความ — high เพราะต้องคงรายละเอียดสินค้าจริง (ทรง แผงหน้า โลโก้)
 * ตามรูปอ้างอิงให้ได้ ; xhigh/max แพงขึ้นมากแต่ภาพบนเว็บถูกย่อเหลือ ~800px อยู่ดี
 */
const ARTICLE_IMAGE_QUALITY = "high" as const;

interface GenerateAndUploadOptions {
  /** บรีฟเฉพาะภาพสำหรับเลือกรูปอ้างอิง; ไม่ใช้บริบทบทความที่อาจกล่าวถึงเครื่องคนละงาน */
  referenceDescription?: string;
  /**
   * แนบรูปอ้างอิงแบรนด์ไหม (ไม่ส่ง = แนบ)
   *
   * ⚠️ ต้องส่ง false สำหรับอินโฟกราฟิก — รูปอ้างอิงเป็น**ภาพถ่าย**ยูนิฟอร์มกับเครื่องจริง
   * แนบไปเมื่อไหร่จะดึงผลลัพธ์ให้ออกมาเป็นภาพเหมือนจริงแทนที่จะเป็นแผนภาพแบน ๆ
   * (และการแนบยังบังคับให้ไปทาง /v1/images/edits ซึ่งเป็นโหมดแก้ภาพ ไม่ใช่วาดใหม่จากศูนย์)
   */
  withBrandReference?: boolean;
  /** รูปสินค้าจริงจากเว็บเรา — ต่อท้ายรูปอ้างอิงแบรนด์ เพราะ prompt แบรนด์อ้างรูปด้วยลำดับ "Image 1, 2, ..." */
  productReferenceUrls?: string[];
}

/**
 * @description gen รูป 1 ใบด้วย gpt-image-2.5-sunburst แล้วอัปขึ้น R2 — คืน url
 * @logic
 * - ภาพถ่าย: แนบเฉพาะรูปอ้างอิงที่ตรงกับบรีฟ → ไปทาง /v1/images/edits เมื่อมีรูปอ้างอิง
 *   ไม่มีรูปอ้างอิงจะวาดใหม่ผ่าน generations
 * - อินโฟกราฟิก: ไม่แนบ → วาดใหม่จากศูนย์ (ดูเหตุผลที่ withBrandReference)
 * - ขนาด 1536x1024 quality high ({@link ARTICLE_IMAGE_QUALITY}) — ที่เก็บเดียวกันทุกใบ: R2 category "seo-article"
 * - มีรูปสินค้าจริงแนบ → ต่อ PRODUCT_REFERENCE_LOCK ท้ายสุด ให้ AI คงเครื่องรุ่นนั้นตามรูป
 * - **บีบไฟล์ก่อนอัปเสมอ**: output ดิบจาก gpt-image-2.5-sunburst ~1.5 MB/ใบ เพราะไม่เคย re-encode
 *   ผ่าน reencodeImageBuffer เหลือ ~0.4 MB (ขนาดภาพเท่าเดิม ไม่ crop)
 *   บีบพลาด → แจ้งข้อผิดพลาด ไม่อัปต้นฉบับโดยระบุชนิดไฟล์ผิด
 * - อัปไม่สำเร็จ → throw เพื่อให้ผู้เรียกจัดการ (ยกชุดใช้ Promise.allSettled, ทีละใบ return error ให้ผู้ใช้)
 * @param prompt คำสั่งวาดฉบับเต็ม (ประกอบมาแล้วจากผู้เรียก)
 * @param filename ชื่อไฟล์ตั้งต้น (service จะเติม timestamp + นามสกุลให้เอง)
 * @param options บรีฟสำหรับเลือกรูปอ้างอิง และตัวเลือกไม่แนบรูปสำหรับอินโฟกราฟิก
 * @returns url ของรูปบน R2
 * @used-by {@link ./generate-article-images.helper.ts}, {@link ./generate-single-article-image.action.ts}
 * @related {@link @/lib/openai/generate-image}
 */
export const generateAndUploadArticleImage = async (
  prompt: string,
  filename: string,
  options: GenerateAndUploadOptions = {}
): Promise<string> => {
  const brand =
    options.withBrandReference === false
      ? null
      : buildBrandImageContext(
          await readBrandProfile(),
          "auto",
          selectBrandReferenceKinds(options.referenceDescription ?? prompt)
        );
  const productReferenceUrls = options.productReferenceUrls ?? [];
  const referenceImageUrls = [...(brand?.referenceImageUrls ?? []), ...productReferenceUrls].slice(0, 8);
  // กติการูปสินค้าต้องอยู่ท้ายสุด — มันยกเว้นข้อ "ห้ามมีโลโก้/ตัวหนังสือ" ของโทนภาพกับโปรไฟล์แบรนด์ที่มาก่อนหน้า
  const buffer = await generateImage({
    prompt: [prompt, brand?.prompt, productReferenceUrls.length ? PRODUCT_REFERENCE_LOCK : null].filter(Boolean).join("\n"),
    quality: ARTICLE_IMAGE_QUALITY,
    ...(referenceImageUrls.length ? { referenceImageUrls } : {}),
  });
  const compressed = await reencodeImageBuffer(buffer, { maxWidth: ARTICLE_IMAGE_SIZE.width });
  const uploaded = await uploadMediaBuffer(compressed, {
    filename,
    contentType: "image/webp",
    category: "seo-article",
  });
  if (!uploaded.success || !uploaded.url) throw new Error(`upload ไม่สำเร็จ (${uploaded.error ?? "unknown"})`);
  return uploaded.url;
};
