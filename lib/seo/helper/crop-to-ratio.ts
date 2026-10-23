import sharp from "sharp";

/**
 * @description ขนาดยืดหยุ่นของ GPT Image 2.5; ผู้เรียกต้องใช้ขนาดตามข้อจำกัดของ Images API
 */
export type GenerationSize = `${number}x${number}`;

/**
 * @description แปลง "1536x1024" เป็นตัวเลข px
 * @param size ขนาดที่ model วาด
 * @returns { width, height }
 */
export const parseGenerationSize = (size: GenerationSize): { width: number; height: number } => {
  const [width, height] = size.split("x").map(Number);
  return { width, height };
};

/**
 * @description เลือกขนาดที่จะสั่ง model วาด ให้ "ใกล้" อัตราส่วนปลายทางที่สุด แล้วค่อย crop ส่วนเกินทิ้ง
 * @logic
 * - ขอบหาร 16 ลงตัว อัตราส่วนไม่เกิน 3:1 ตาม Images API
 * - คงงบพิกเซลไม่เกิน 1536×1024; ขอบสั้นไม่เกิน 1024 ขอบยาวไม่เกิน 1536
 * - ได้อย่างน้อย 786432 pixels จึงผ่านขั้นต่ำ 655360; ขนาดเกิน 3:1 ให้ผู้ใช้ crop ต่อ
 * @see https://developers.openai.com/api/docs/guides/image-generation#size-and-quality-options
 * @param targetRatio อัตราส่วนปลายทาง (กว้าง/สูง) เช่น 1420/481
 * @returns ขนาดที่ควรสั่งวาด
 * @throws [IMG-CR-01] targetRatio ไม่ใช่จำนวนบวก
 * @used-by {@link @/feature/backoffice/seo/preview/server/generate-hurry-web-image.action.ts}
 */
export const pickGenerationSize = (targetRatio: number): GenerationSize => {
  if (!Number.isFinite(targetRatio) || targetRatio <= 0) {
    throw new Error("[IMG-CR-01] targetRatio ต้องเป็นจำนวนบวก");
  }

  const ratio = Math.min(3, Math.max(targetRatio, 1 / targetRatio));
  const longEdge = Math.min(1536, Math.round((1024 * ratio) / 16) * 16);
  const shortEdge = Math.min(1024, Math.ceil(longEdge / ratio / 16) * 16);
  return targetRatio >= 1 ? `${longEdge}x${shortEdge}` : `${shortEdge}x${longEdge}`;
};

/** กรอบที่จะตัดออกมาจากรูปต้นฉบับ */
export interface CenterCropBox {
  left: number;
  top: number;
  width: number;
  height: number;
}

/**
 * @description คำนวณกรอบ crop กลางภาพให้ได้อัตราส่วนที่ต้องการ — pure function ไม่แตะไฟล์
 * @logic
 * - ต้นฉบับ "กว้างกว่า" เป้าหมาย → ตัดซ้าย-ขวาเท่า ๆ กัน (คงความสูงเต็ม)
 * - ต้นฉบับ "สูงกว่า" เป้าหมาย → ตัดบน-ล่างเท่า ๆ กัน (คงความกว้างเต็ม) — เคส hero 2.95:1 จาก 1536x1024
 * - ปัดเป็นจำนวนเต็ม px เสมอ และ clamp ไม่ให้เกินขอบต้นฉบับ (sharp จะ throw ถ้ากรอบล้น)
 * @param sourceWidth ความกว้างต้นฉบับ (px)
 * @param sourceHeight ความสูงต้นฉบับ (px)
 * @param targetRatio อัตราส่วนปลายทาง (กว้าง/สูง)
 * @returns กรอบ crop ที่กึ่งกลางภาพ
 * @throws [IMG-CR-02] ขนาดต้นฉบับหรืออัตราส่วนไม่ถูกต้อง
 * @used-by {@link ./crop-to-ratio.ts} (cropBufferToRatio)
 */
export const computeCenterCropBox = (sourceWidth: number, sourceHeight: number, targetRatio: number): CenterCropBox => {
  if (
    !Number.isFinite(sourceWidth) ||
    !Number.isFinite(sourceHeight) ||
    sourceWidth <= 0 ||
    sourceHeight <= 0 ||
    !Number.isFinite(targetRatio) ||
    targetRatio <= 0
  ) {
    throw new Error("[IMG-CR-02] ขนาดต้นฉบับ/อัตราส่วนไม่ถูกต้อง");
  }

  const sourceRatio = sourceWidth / sourceHeight;

  // ต้นฉบับแบนกว่าเป้าหมาย → ความสูงคือด้านที่ใช้ได้เต็ม แล้วตัดความกว้าง
  const cropWidth = sourceRatio > targetRatio ? Math.round(sourceHeight * targetRatio) : sourceWidth;
  const cropHeight = sourceRatio > targetRatio ? sourceHeight : Math.round(sourceWidth / targetRatio);

  const width = Math.min(cropWidth, sourceWidth);
  const height = Math.min(cropHeight, sourceHeight);

  return {
    left: Math.max(0, Math.floor((sourceWidth - width) / 2)),
    top: Math.max(0, Math.floor((sourceHeight - height) / 2)),
    width,
    height,
  };
};

export interface CropToRatioOptions {
  /** อัตราส่วนปลายทาง (กว้าง/สูง) */
  targetRatio: number;
  /** ความกว้าง output สุดท้าย — ไม่ส่ง = ใช้ขนาดหลัง crop ตามจริง */
  outputWidth?: number;
  /** ความสูง output สุดท้าย — ไม่ส่ง = คำนวณจาก outputWidth / targetRatio */
  outputHeight?: number;
  /** คุณภาพ webp 1-100 (default 82) */
  quality?: number;
}

/**
 * @description crop รูปกลางภาพให้ได้อัตราส่วนที่เว็บต้องการ แล้ว resize เป็นขนาดจริง — คืน Buffer webp
 * @logic
 * - ตัดส่วนเกินให้พอดีช่องเว็บ หลังสร้างภาพในขนาดที่ API รองรับ
 * - ไม่ขยายภาพเกินต้นฉบับ (`withoutEnlargement`) — ยืดแล้วเบลอเสียของ
 * - **ไม่บีบซ้ำที่นี่** ผู้เรียกส่งต่อให้ reencodeImageBuffer อีกชั้นตามมาตรฐานเดิมของโปรเจกต์
 * @param input Buffer รูปที่ model วาดมา
 * @param options อัตราส่วน + ขนาด output
 * @returns Buffer webp ที่ crop แล้ว
 * @throws [IMG-CR-03] buffer ว่าง | [IMG-CR-04] อ่านขนาดรูปไม่ได้ | [IMG-CR-05] crop ไม่สำเร็จ
 * @used-by {@link @/feature/backoffice/seo/preview/server/generate-hurry-web-image.action.ts}
 * @related {@link @/lib/seo/helper/reencode-image-buffer.ts}
 */
export const cropBufferToRatio = async (input: Buffer, options: CropToRatioOptions): Promise<Buffer> => {
  if (!input || input.length === 0) throw new Error("[IMG-CR-03] buffer ว่าง — ไม่มีรูปให้ crop");

  const quality = options.quality ?? 82;

  let metadata;
  try {
    metadata = await sharp(input).metadata();
  } catch (error) {
    throw new Error(`[IMG-CR-04] อ่านขนาดรูปไม่ได้: ${error instanceof Error ? error.message : String(error)}`);
  }

  const sourceWidth = metadata.width ?? 0;
  const sourceHeight = metadata.height ?? 0;
  if (sourceWidth <= 0 || sourceHeight <= 0) throw new Error("[IMG-CR-04] อ่านขนาดรูปไม่ได้");

  const box = computeCenterCropBox(sourceWidth, sourceHeight, options.targetRatio);

  const outputWidth = options.outputWidth ?? box.width;
  const outputHeight = options.outputHeight ?? Math.round(outputWidth / options.targetRatio);

  try {
    return await sharp(input)
      .extract(box)
      .resize({ width: outputWidth, height: outputHeight, fit: "cover", withoutEnlargement: true })
      .webp({ quality })
      .toBuffer();
  } catch (error) {
    throw new Error(`[IMG-CR-05] crop ไม่สำเร็จ: ${error instanceof Error ? error.message : String(error)}`);
  }
};
