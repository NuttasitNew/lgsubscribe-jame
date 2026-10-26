import "server-only";
import { isOpenAiConfigured } from "@/lib/openai/generate-image";
import { generateAndUploadArticleImage } from "./generate-and-upload-article-image.helper";
import { COVER_SHOT, IMAGE_STYLE, NO_PRODUCT_TOPIC_LOCK, SECTION_SHOTS } from "./article-image-style.constant";
import {
  countArticleImageBlocks,
  insertArticleImageBlocks,
  MAX_ARTICLE_IMAGE_BLOCKS,
  planArticleImageSlots,
  type ResolvedArticleImage,
} from "./article-image-blocks.helper";
import { withTechnicianReferenceHint } from "./with-technician-reference-hint.helper";
import type { SeoArticleBlockContent } from "../type/seo-article-block.type";

export interface GenerateArticleImagesResult {
  content: SeoArticleBlockContent;
  /** จำนวนรูปที่ gen สำเร็จรอบนี้ */
  generated: number;
  /** จำนวนรูปที่ "ข้าม" เพราะมีอยู่แล้ว — ไม่ใช่ความผิดพลาด */
  skipped: number;
  errors: string[];
}

/**
 * @description gen รูปปก + รูปแทรกบทความด้วย gpt-image-2.5-sunburst แล้ว upload ขึ้น R2 — คืน contentJson โครงบล็อกที่ใส่รูปแล้ว
 * @logic
 * 1. ปก: prompt จาก title ขนาด 1536x1024 — เก็บเป็น `coverImage` (string) + `coverImageAlt`
 * 2. รูปแทรก: planArticleImageSlots เลือกตำแหน่งใต้หัวข้อ (เว้นหัวข้อสุดท้ายที่เป็น CTA) สูงสุด 2 ใบ
 *    แล้ว insertArticleImageBlocks แทรกเป็นบล็อก image — แทนกลไกเดิมที่เขียนทับ `section.image` ซึ่งไม่มีแล้ว
 * 3. gen ทุกรูปขนานกัน (Promise.allSettled) → upload R2 category "seo-article"
 * - **กันสร้างรูปซ้ำ**: มี coverImage อยู่แล้ว = ไม่ gen ปกใหม่, หัวข้อที่มีรูปอยู่แล้ว = ไม่ gen ซ้ำ
 *   และถ้ารูปครบโควตาแล้วจะไม่ยิง API เลย (คืน skipped) — ไม่งั้นทุกครั้งที่เรียกจะเผาค่า API ใหม่ทั้งชุด
 *   ผู้เรียกที่ต้องการรูปชุดใหม่จริง ๆ ต้องล้างรูปเดิมออกก่อน (removeArticleImageBlocks + coverImage = undefined)
 * - alt ถูกเซ็ตทุกใบเสมอ: ปกใช้ title, รูปแทรกใช้ข้อความหัวข้อที่มันประกอบ (ว่างเมื่อไหร่ fallback เป็น title)
 * - env ไม่ครบ / รูปใดพัง → คืน content เท่าที่ได้ พร้อม errors (บทความไม่มีรูปดีกว่าไม่มีบทความ)
 * @param params slug/title ใช้ตั้งชื่อไฟล์กับเขียน prompt, content = บทความโครงบล็อก, createId = inject เพื่อ test
 * @returns content ที่ใส่รูปแล้ว + จำนวนที่ gen/ข้าม + errors
 * @used-by {@link ./generate-seo-article-drafts.helper.ts}, {@link ./generate-seo-article-images.action.ts}
 * @related
 * - {@link ./article-image-blocks.helper.ts}
 * - โทนภาพ/ล็อกแบรนด์ที่ใช้ร่วมกับ flow วาดทีละใบ: {@link ./article-image-style.constant.ts}
 * - ตัว gen+upload ที่ใช้ร่วมกัน: {@link ./generate-and-upload-article-image.helper.ts}
 */
export const generateArticleImages = async (params: {
  slug: string;
  title: string;
  content: SeoArticleBlockContent;
  maxImages?: number;
  createId?: () => string;
  /** URL รูปสินค้าจริงจากเว็บเรา (public/images/products) — มีค่า = ให้ภาพประกอบใช้สินค้าจริงตัวนี้ */
  productImageUrls?: string[];
}): Promise<GenerateArticleImagesResult> => {
  const { slug, title, content, maxImages, createId } = params;
  const productImageUrls = params.productImageUrls?.filter(Boolean) ?? [];
  // ไม่มีรุ่นให้ยึด → บอกให้วาดสถานการณ์ของหัวข้อ แทนการเดาเครื่องสักชนิดมาตั้งกลางภาพ
  const topicLock = productImageUrls.length ? "" : ` ${NO_PRODUCT_TOPIC_LOCK}`;

  const needCover = !content.coverImage || content.coverImage.trim().length === 0;
  const slots = planArticleImageSlots(content.blocks, { maxImages: maxImages ?? MAX_ARTICLE_IMAGE_BLOCKS });
  // นับ "รูปที่มีอยู่แล้วเลยไม่ต้อง gen ซ้ำ" — ปก + รูปในเนื้อบทความ
  const skipped = (needCover ? 0 : 1) + countArticleImageBlocks(content.blocks);

  // มีรูปครบแล้ว → ไม่ยิง API เลย (กันเผาค่า gpt-image-2.5-sunburst ทุกครั้งที่เรียก)
  if (!needCover && slots.length === 0) {
    return { content, generated: 0, skipped, errors: [] };
  }

  if (!isOpenAiConfigured()) {
    return { content, generated: 0, skipped, errors: ["CHATGPT_API_KEY ไม่ถูกตั้งค่า — ข้ามการ gen รูป"] };
  }

  const jobs: {
    kind: "cover" | "block";
    slotIndex: number;
    prompt: string;
    filename: string;
    alt: string;
    referenceTopic: string;
  }[] = [
    ...(needCover
      ? [
          {
            kind: "cover" as const,
            slotIndex: -1,
            prompt: `Blog cover image for a Thai LG Subscribe (monthly LG appliance subscription) article titled "${title}". Read the Thai title and work out what the article is about — if it is about an appliance, that appliance must be the clear focus of the photo. ${COVER_SHOT} ${IMAGE_STYLE}${topicLock}`,
            filename: `${slug}-cover`,
            alt: title,
            referenceTopic: title,
          },
        ]
      : []),
    ...slots.map((slot, order) => ({
      kind: "block" as const,
      slotIndex: order,
      prompt: `Illustration photo for one section of a Thai LG Subscribe (monthly LG appliance subscription) blog article. Article title: "${title}". Section topic: "${slot.heading}". Read that Thai section topic and picture what it is actually describing — the photo must match THAT topic, not the article in general. ${SECTION_SHOTS[order % SECTION_SHOTS.length]} ${IMAGE_STYLE}${topicLock}`,
      filename: `${slug}-section-${order + 1}`,
      // alt ต้องมีทุกใบ — หัวข้อว่างเมื่อไหร่ใช้ชื่อบทความแทน ห้ามปล่อยว่าง
      alt: slot.heading.trim().length > 0 ? slot.heading : title,
      referenceTopic: slot.heading,
    })),
  ];

  const results = await Promise.allSettled(
    jobs.map((job) =>
      generateAndUploadArticleImage(job.prompt, job.filename, {
        referenceDescription: withTechnicianReferenceHint(job.referenceTopic),
        ...(productImageUrls.length ? { productReferenceUrls: productImageUrls } : {}),
      })
    )
  );

  const errors: string[] = [];
  const insertions: ResolvedArticleImage[] = [];
  let generated = 0;
  let coverImage = content.coverImage;
  let coverImageAlt = content.coverImageAlt;

  results.forEach((result, index) => {
    const job = jobs[index];
    const label = job.kind === "cover" ? "ปก" : `รูปแทรกที่ ${job.slotIndex + 1}`;
    if (result.status === "rejected") {
      errors.push(`${label}: ${result.reason instanceof Error ? result.reason.message : "Unknown"}`);
      return;
    }
    generated += 1;
    if (job.kind === "cover") {
      coverImage = result.value;
      coverImageAlt = job.alt;
      return;
    }
    insertions.push({ insertAt: slots[job.slotIndex].insertAt, url: result.value, alt: job.alt });
  });

  return {
    content: {
      ...content,
      ...(coverImage ? { coverImage } : {}),
      ...(coverImageAlt ? { coverImageAlt } : {}),
      blocks: insertArticleImageBlocks(content.blocks, insertions, { createId }),
    },
    generated,
    skipped,
    errors,
  };
};
