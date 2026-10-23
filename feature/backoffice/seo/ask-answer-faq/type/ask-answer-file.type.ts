/**
 * @description โครงไฟล์ content/ask-and-answer.json (และฉบับ en) บน repo hurry-web
 * @page /super-admin/hurry-web/seo-article?section=faq
 * @logic
 * - ต้องตรงกับ `lib/content/ask-and-answer.types.ts` ฝั่ง hurry-web เป๊ะ — ไฟล์นี้ถูก push ทับของจริง
 * - `id` **บังคับ** ต่างจาก type เดิมใน ask-and-answer/ ที่ลืมประกาศไว้: เว็บใช้เป็น React key
 *   + ค่า `defaultValue` ของ accordion และเป็นตัวจับคู่ข้อไทยกับข้อ en ข้ามไฟล์
 *   ข้อไหนไม่มี id = accordion ข้อแรกเปิดไม่ได้ และคำแปล en จะจับคู่ผิดข้อ
 * @related
 * - ผู้อ่าน/เขียน: {@link ../server/read-ask-answer-file.helper.ts}, {@link ../server/publish-ask-answer-faqs.action.ts}
 */
export interface AskAnswerFileFaq {
  /** id ถาวรของข้อ — ตรงกันระหว่างไฟล์ th/en */
  id: string;
  question: string;
  /** รองรับ `\n` (เว็บ split เป็นหลายบรรทัด) */
  answer: string;
}

/** ทั้งไฟล์ — headerLabel/imageUrl แก้ผ่าน preview editor เดิม ระบบนี้แตะแค่ `faqs` */
export interface AskAnswerFile {
  headerLabel: string;
  imageUrl: string;
  faqs: AskAnswerFileFaq[];
}

/** path ของไฟล์ทั้งสองภาษาบน repo hurry-web — รวมไว้ที่เดียวกันเพื่อไม่ให้พิมพ์ path หลุดกัน */
export const ASK_ANSWER_FILE_PATH = {
  th: "content/ask-and-answer.json",
  en: "content/en/ask-and-answer.json",
} as const;
