import sharp from "sharp";

/** ค่าเริ่มต้นของการบีบรูป — คุณภาพพอสำหรับภาพประกอบเว็บ, กว้างสุดเท่าภาพปกบทความ (1536px) */
const DEFAULT_QUALITY = 80;
const DEFAULT_MAX_WIDTH = 1536;

export interface ReencodeImageOptions {
  /** คุณภาพ webp 1-100 (default 80) */
  quality?: number;
  /** ความกว้างสูงสุด px — กว้างกว่านี้จะย่อลงโดยคงสัดส่วนเดิม (default 1536) */
  maxWidth?: number;
}

/**
 * @description บีบ Buffer รูปให้เป็น webp ขนาดเล็กลง ก่อนอัปขึ้น storage
 * @logic
 * - output ดิบจาก image model เป็น webp ที่ไม่เคย optimize (วัดจริง ~1.5 MB/ใบ ที่ 1536x1024)
 *   ผ่าน sharp.webp() อีกรอบเหลือ ~0.4 MB (เล็กลง ~70%) โดยตาแทบไม่เห็นความต่าง
 * - ย่อเฉพาะเมื่อกว้างเกิน maxWidth และใช้ `withoutEnlargement` — รูปเล็กกว่าเดิมจะไม่ถูกขยาย
 * - **ไม่ crop / ไม่แตะ aspect ratio** — คงสัดส่วนเดิมเสมอ
 * - กันเคส edge: ถ้าบีบแล้วได้ไฟล์ใหญ่กว่าต้นฉบับ (เช่นต้นฉบับ optimize มาดีอยู่แล้ว) คืนต้นฉบับเฉพาะ WebP ที่ขนาดและ orientation ถูกต้องแล้ว
 * @param input Buffer รูปต้นฉบับ
 * @param options quality / maxWidth
 * @returns Buffer webp ที่บีบแล้ว หรือ Buffer ต้นฉบับเฉพาะ WebP ที่ไม่ต้องย่อและบีบแล้วไม่เล็กลง
 * @throws [IMG-RE-01] buffer ว่าง | [IMG-RE-02] decode ไม่ได้ (ไม่ใช่ไฟล์รูป)
 * @related {@link @/lib/image/compress-image-server.ts}
 * @used-by {@link @/feature/backoffice/seo/seo-article/server/generate-and-upload-article-image.helper.ts}
 */
export const reencodeImageBuffer = async (input: Buffer, options: ReencodeImageOptions = {}): Promise<Buffer> => {
  if (!input || input.length === 0) throw new Error("[IMG-RE-01] buffer ว่าง — ไม่มีรูปให้บีบ");

  const quality = options.quality ?? DEFAULT_QUALITY;
  const maxWidth = options.maxWidth ?? DEFAULT_MAX_WIDTH;

  let output: Buffer;
  let canKeepOriginal = false;
  try {
    const metadata = await sharp(input).metadata();
    canKeepOriginal =
      metadata.format === "webp" &&
      Boolean(metadata.width && metadata.width <= maxWidth) &&
      (!metadata.orientation || metadata.orientation === 1);
    output = await sharp(input)
      .rotate()
      .resize({ width: maxWidth, withoutEnlargement: true })
      .webp({ quality, effort: 6 })
      .toBuffer();
  } catch (error) {
    throw new Error(`[IMG-RE-02] บีบรูปไม่สำเร็จ: ${error instanceof Error ? error.message : String(error)}`);
  }

  return canKeepOriginal && output.length >= input.length ? input : output;
};
