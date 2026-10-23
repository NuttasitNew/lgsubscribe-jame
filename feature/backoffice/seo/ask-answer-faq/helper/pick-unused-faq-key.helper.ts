import { createFaqKey } from "./create-faq-key.helper";

/** สุ่มกี่ครั้งก่อนยอมแพ้ — 8 ตัว hex ชนกันจริงแทบเป็นไปไม่ได้ ครบ 10 ครั้งแปลว่าตัวสุ่มเสีย ไม่ใช่ดวงไม่ดี */
const MAX_ATTEMPTS = 10;

/**
 * @description หา id ของข้อ FAQ ที่ยังไม่ถูกใช้ — สุ่มใหม่จนกว่าจะไม่ชนกับชุดที่มีอยู่
 * @logic
 * - id ซ้ำกับข้อเดิมบนเว็บ = accordion 2 ข้อใช้ค่าเดียวกัน กดข้อหนึ่งอีกข้อเปิดตาม
 *   และตอนแปล en จะจับคู่ผิดข้อถาวร → ต้องกันซ้ำ ไม่ใช่หวังว่าสุ่มไม่ชน
 * - `used` ต้องรวม **ทั้ง id ในไฟล์บนเว็บและ id ในฐาน** ผู้เรียกเป็นคนรวมให้
 * - เปิดให้ inject ตัวสุ่มเพื่อให้ test deterministic (ตัวจริงไม่ pure)
 * - ครบ MAX_ATTEMPTS แล้วยังชน = โยน error ดีกว่าคืน id ซ้ำเงียบ ๆ
 * @param used id ที่ใช้ไปแล้ว
 * @param generate ตัวสร้าง id (default {@link createFaqKey})
 * @returns id ที่ยังว่าง
 * @used-by {@link ../server/run-write-faq-job.helper.ts}
 */
export const pickUnusedFaqKey = (used: ReadonlySet<string>, generate: () => string = createFaqKey): string => {
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt += 1) {
    const candidate = generate();
    if (!used.has(candidate)) return candidate;
  }
  throw new Error(`[FAQ-KEY-01] สุ่ม id ของข้อถาม-ตอบไม่ได้ภายใน ${MAX_ATTEMPTS} ครั้ง`);
};
