import { createBlockId } from "../helper/create-block-id.helper";
import { serializeRunsToText } from "../helper/serialize-blocks-to-text.helper";
import type { SeoArticleBlock, SeoArticleHeadingBlock } from "../type/seo-article-block.type";

/** จำนวนรูปแทรกในเนื้อบทความสูงสุด (ไม่นับรูปปก) — คุมต้นทุน gpt-image-2.5-sunburst */
export const MAX_ARTICLE_IMAGE_BLOCKS = 2;

/** ตำแหน่งที่จะแทรกรูป 1 ใบ */
export interface ArticleImageSlot {
  /** index ใน blocks ที่จะ splice รูปเข้าไป (= index ของ heading + 1) */
  insertAt: number;
  /** ข้อความหัวข้อที่รูปนี้ประกอบ — ใช้ทั้งเป็น alt และเป็นบรีฟให้ AI วาดรูป */
  heading: string;
}

/** รูปที่ gen เสร็จแล้ว พร้อมแทรกกลับเข้าบทความ */
export interface ResolvedArticleImage {
  insertAt: number;
  url: string;
  alt: string;
  caption?: string;
}

/**
 * @description นับรูปที่บทความมีอยู่แล้ว (เฉพาะบล็อก image ที่มี url จริง)
 * @logic บล็อก image ที่ url ว่างถือว่ายังไม่มีรูป — ไม่นับ เพื่อให้ gen ทดแทนได้
 * @param blocks บล็อกทั้งบทความ
 * @returns จำนวนรูปในเนื้อบทความ
 * @used-by {@link ./generate-article-images.helper.ts}
 */
export const countArticleImageBlocks = (blocks: SeoArticleBlock[]): number =>
  blocks.filter((block) => block.type === "image" && block.url.trim().length > 0).length;

/**
 * @description ลบบล็อกรูปออกจากบทความทั้งหมด — ใช้ตอนกด "สร้างรูปใหม่ทั้งชุด"
 * @param blocks บล็อกทั้งบทความ
 * @returns บล็อกที่ไม่มี image เหลืออยู่ (ไม่แก้ของเดิม)
 * @used-by {@link ./generate-seo-article-images.action.ts}
 */
export const removeArticleImageBlocks = (blocks: SeoArticleBlock[]): SeoArticleBlock[] =>
  blocks.filter((block) => block.type !== "image");

/**
 * @description เลือกตำแหน่งแทรกรูปในบทความโครงบล็อก — แทนกลไกเดิมที่ผูกกับ section.image (ซึ่งไม่มีแล้ว)
 * @logic
 * - รูปแทรกใต้หัวข้อ (heading level 2) เสมอ — ให้รูปอยู่ต้นเรื่องของหัวข้อนั้น ตรงกับที่เว็บ render
 * - เว้นหัวข้อสุดท้ายไว้ (เป็น CTA ขายบริการ ไม่ต้องมีรูป) ถ้ามีหัวข้อมากกว่า 1 อัน
 * - **กันสร้างรูปซ้ำ**: หัวข้อที่มีบล็อก image ต่อท้ายอยู่แล้วจะไม่ถูกเลือก และโควตาถูกหักด้วย
 *   จำนวนรูปที่มีอยู่แล้ว — ถ้ารูปครบแล้วคืน [] (ไม่ยิง API ซ้ำ = ไม่เผาเงินทุกรอบ)
 * - เลือกหัวข้อแรก + หัวข้อกลาง เพื่อให้รูปกระจายทั้งบทความ ไม่กระจุกอยู่ต้นเรื่อง
 * @param blocks บล็อกทั้งบทความ
 * @param options maxImages = เพดานรูปในเนื้อบทความ (default MAX_ARTICLE_IMAGE_BLOCKS)
 * @returns ตำแหน่งที่ควรแทรกรูป เรียงจากบนลงล่าง (ว่าง = ไม่ต้อง gen เพิ่ม)
 * @used-by {@link ./generate-article-images.helper.ts}
 */
export const planArticleImageSlots = (
  blocks: SeoArticleBlock[],
  options: { maxImages?: number } = {}
): ArticleImageSlot[] => {
  const maxImages = options.maxImages ?? MAX_ARTICLE_IMAGE_BLOCKS;
  const remaining = maxImages - countArticleImageBlocks(blocks);
  if (remaining <= 0) return [];

  const headingIndexes = blocks.reduce<number[]>((acc, block, index) => {
    if (block.type === "heading" && block.level === 2) acc.push(index);
    return acc;
  }, []);

  // หัวข้อสุดท้าย = section ปิดท้ายที่เชื่อมเข้าบริการ — ไม่แทรกรูป
  const candidates = headingIndexes.length > 1 ? headingIndexes.slice(0, -1) : headingIndexes;

  // ข้ามหัวข้อที่มีรูปอยู่ใต้หัวข้ออยู่แล้ว (กัน gen ซ้ำที่เดิม)
  const usable = candidates.filter((index) => blocks[index + 1]?.type !== "image");
  if (usable.length === 0) return [];

  const picked = [...new Set([usable[0], usable[Math.floor(usable.length / 2)]])].slice(0, remaining);

  return picked
    .sort((a, b) => a - b)
    .map((index) => ({
      insertAt: index + 1,
      heading: serializeRunsToText((blocks[index] as SeoArticleHeadingBlock).runs),
    }));
};

/**
 * @description แทรกบล็อกรูปที่ gen เสร็จแล้วกลับเข้าบทความตามตำแหน่งที่ planArticleImageSlots วางไว้
 * @logic
 * - แทรกจากตำแหน่งท้ายไปหน้า (เรียง insertAt มาก→น้อย) เพื่อไม่ให้ index ของตำแหน่งถัดไปเลื่อน
 * - alt ต้องมีทุกใบ — ถ้าส่ง alt ว่างมาจะไม่แทรกรูปนั้น (รูปไม่มี alt = เสีย SEO + ผิด a11y)
 * - insertAt ที่เกินช่วงถูก clamp ให้อยู่ใน [0, length] แทนที่จะ throw (รูปหลุดตำแหน่งดีกว่าบทความพัง)
 * @param blocks บล็อกทั้งบทความ
 * @param images รูปที่ gen เสร็จแล้ว
 * @param options inject createId เพื่อให้ test deterministic
 * @returns บทความที่มีบล็อกรูปแทรกแล้ว (ไม่แก้ของเดิม)
 * @used-by {@link ./generate-article-images.helper.ts}
 */
export const insertArticleImageBlocks = (
  blocks: SeoArticleBlock[],
  images: ResolvedArticleImage[],
  options: { createId?: () => string } = {}
): SeoArticleBlock[] => {
  const createId = options.createId ?? createBlockId;
  const next = [...blocks];

  [...images]
    .filter((image) => image.url.trim().length > 0 && image.alt.trim().length > 0)
    .sort((a, b) => b.insertAt - a.insertAt)
    .forEach((image) => {
      const at = Math.max(0, Math.min(image.insertAt, next.length));
      next.splice(at, 0, {
        id: createId(),
        type: "image",
        url: image.url,
        alt: image.alt,
        ...(image.caption ? { caption: image.caption } : {}),
      });
    });

  return next;
};
