import type { AskAnswerFaqStatus } from "@prisma/client";

/**
 * @description Query keys ของหมวด "หน้า ถาม-ตอบ" — single source of truth
 * @page /super-admin/hurry-web/seo-article?section=faq
 * @logic
 * - prefix แยกจาก `seo-article` เพราะเป็นคนละของ (หน้าเว็บ ไม่ใช่บทความ) — invalidate บทความ
 *   ไม่ควรลาก list นี้มาโหลดใหม่ด้วย
 * - list() normalize undefined → "ALL" กัน cache แตกระหว่าง "ไม่ส่งค่า" กับ "ส่งค่า default"
 */
export const askAnswerFaqKeys = {
  all: () => ["ask-answer-faq"] as const,

  lists: () => ["ask-answer-faq", "list"] as const, // invalidate ทุกตัวกรองพร้อมกัน
  list: (status?: AskAnswerFaqStatus) => ["ask-answer-faq", "list", status ?? "ALL"] as const,
} as const;
