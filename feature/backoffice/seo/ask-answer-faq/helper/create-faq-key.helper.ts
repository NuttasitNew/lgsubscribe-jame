/** ความยาวส่วนสุ่มของ id — ตรงกับข้อเดิมบนเว็บที่เป็น `faqs-<8 ตัว>` */
const RANDOM_LENGTH = 8;
const HEX_ALPHABET = "0123456789abcdef";

/**
 * @description สร้าง id ของข้อถาม-ตอบใหม่ในรูปแบบเดียวกับข้อเดิมบนเว็บ (`faqs-b116d09a`)
 * @logic
 * - รูปแบบต้องเหมือนของเดิมเพราะ id นี้ไปเป็น `AccordionItem value` บนหน้าเว็บจริง
 *   และเป็นตัวจับคู่ข้อไทยกับข้อ en ข้ามไฟล์ — เปลี่ยนรูปแบบ = ข้อเก่ากับข้อใหม่ดูเป็นคนละระบบ
 * - ใช้ `crypto.getRandomValues` ถ้ามี fallback `Math.random` (ค่านี้ไม่ใช่ค่าความปลอดภัย เป็นแค่ key)
 * - 8 ตัว hex = 4 พันล้านค่า สำหรับหน้าที่มีหลักสิบข้อถือว่าชนกันไม่ได้ในทางปฏิบัติ
 *   แต่ผู้เรียกยังต้องกันซ้ำกับ id ที่มีอยู่จริงอีกชั้น (ดู {@link ./pick-unused-faq-key.helper.ts})
 * @returns id เช่น "faqs-1a2b3c4d"
 * @used-by {@link ./pick-unused-faq-key.helper.ts}
 */
export const createFaqKey = (): string => {
  const bytes = new Uint8Array(RANDOM_LENGTH);
  const webCrypto = typeof globalThis !== "undefined" ? globalThis.crypto : undefined;

  if (webCrypto && typeof webCrypto.getRandomValues === "function") {
    webCrypto.getRandomValues(bytes);
  } else {
    for (let index = 0; index < RANDOM_LENGTH; index += 1) {
      bytes[index] = Math.floor(Math.random() * 256);
    }
  }

  let key = "";
  for (let index = 0; index < RANDOM_LENGTH; index += 1) {
    key += HEX_ALPHABET[(bytes[index] ?? 0) % HEX_ALPHABET.length];
  }
  return `faqs-${key}`;
};
