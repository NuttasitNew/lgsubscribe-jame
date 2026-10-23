/**
 * @description พารามิเตอร์ของงานคิว FAQ ที่คอลัมน์ปกติของ SeoArticleJob ไม่ครอบคลุม — เก็บใน `payload` (Json)
 * @logic
 * - แยกไฟล์จาก seo-article-job-payload.type.ts เพราะเป็นคนละ feature (หน้า ถาม-ตอบ ไม่ใช่บทความ)
 *   แต่ใช้ตารางคิวเดียวกัน — worker เดียว แถบสถานะเดียว ไม่ต้องมีระบบคิวที่สอง
 * - TRANSLATE_FAQ_EN ไม่มี payload: input คือ "ไฟล์ไทยทั้งใบบนเว็บ" ไม่มีอะไรให้เลือก
 * @related {@link ../server/run-write-faq-job.helper.ts}
 */

/** งาน WRITE_FAQ — คิดข้อถาม-ตอบใหม่ */
export interface AskAnswerFaqWritePayload {
  /** อยากได้กี่ข้อ — ไม่ส่ง = ค่าเริ่มต้นใน write-ask-answer-faqs.helper.ts */
  count?: number;
}
