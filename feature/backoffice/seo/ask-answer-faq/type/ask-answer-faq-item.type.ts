import type { AskAnswerFaqStatus } from "@prisma/client";

/**
 * @description 1 ข้อถาม-ตอบตามที่หน้าจอรีวิวต้องใช้ — ตัดคอลัมน์ที่ UI ไม่ได้ใช้ออก
 * @page /super-admin/hurry-web/seo-article?section=faq
 * @logic
 * - `hasEn` คำนวณที่ server ไม่ใช่ให้ UI เดาจาก questionEn != null — ฉบับ EN นับว่ามีก็ต่อเมื่อ
 *   **ครบทั้งคำถามและคำตอบ** (มีครึ่งเดียวแล้ว push ขึ้นเว็บ = หน้า en ได้คำถามอังกฤษ คำตอบไทย)
 * @related ผู้สร้าง: {@link ../server/find-ask-answer-faqs.action.ts}
 */
export interface AskAnswerFaqItem {
  askAnswerFaqId: number;
  faqKey: string;
  question: string;
  answer: string;
  questionEn: string | null;
  answerEn: string | null;
  /** มีฉบับ EN ครบคู่ไหม — ไม่ครบ = ตอนเผยแพร่ไฟล์ en จะใช้ข้อความไทยไปพลาง */
  hasEn: boolean;
  status: AskAnswerFaqStatus;
  targetKeyword: string | null;
  /** เหตุผลที่ AI เสนอข้อนี้ (ไม่ขึ้นเว็บ) */
  reason: string | null;
  /** ตัวเลข/หลักฐานที่ถูกอ้างในคำตอบ (ไม่ขึ้นเว็บ) — ใช้ตรวจว่าคำอวดอ้างมีของรองรับ */
  proofNote: string | null;
  relatedSlug: string | null;
  requestedBy: string;
  publishedAt: string | null;
  rejectedReason: string | null;
  createdAt: string;
}
