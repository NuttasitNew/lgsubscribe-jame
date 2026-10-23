import type { SeoArticleCategory } from "./seo-article-content.type";
import type { AskAnswerFaqWritePayload } from "../../ask-answer-faq/type/ask-answer-faq-job-payload.type";

/**
 * @description พารามิเตอร์ของงานในคิวที่คอลัมน์ปกติของ SeoArticleJob ไม่ครอบคลุม — เก็บใน `payload` (Json)
 * @logic
 * - แยก union ตาม jobType เพราะแต่ละชนิดต้องการ input คนละชุด และ worker จะอ่านเฉพาะก้อนของตัวเอง
 * - WRITE_CATEGORY ใช้ payload เฉพาะเมื่อเลือกกลุ่มบริการย่อย ส่วนหมวดหลัก/topic/tone ยังอยู่ในคอลัมน์ปกติ
 * - TRANSLATE_EN ไม่มี payload — input อยู่ใน seoArticleId
 * @related {@link ./seo-article-job-result.type.ts}, {@link ../server/queue-seo-article-job.action.ts}
 */

/** งาน WRITE_CATEGORY — จำกัดแฟ้มข้อมูลจริงและเนื้อหาให้อยู่ในกลุ่มบริการย่อยที่เลือก */
export interface SeoArticleWriteCategoryPayload {
  /** กลุ่มบริการย่อย เช่น ["โซฟา", "ผ้าม่าน"]; ไม่มี payload = ใช้ทั้งหมวดหลัก */
  subcategoryNames?: string[];
  /** รองรับงานที่เข้าคิวด้วย payload รุ่นเลือกได้กลุ่มเดียวก่อนเปลี่ยนเป็น multi-select */
  subcategoryName?: string;
}

/** งาน GENERATE_IMAGES — วาดรูปปก + รูปแทรกยกชุดให้บทความที่บันทึกแล้ว */
export interface SeoArticleGenerateImagesPayload {
  /**
   * วาดรูปเสร็จแล้วให้ต่อคิวงานแปล EN เองเลยไหม
   * ใช้ตอนสร้างบทความใหม่: ต้องแปล **หลัง** รูปลงเนื้อหาแล้ว ไม่งั้นฉบับ EN จะไม่มีบล็อกรูปและ hash ไม่ตรงทันที
   */
  translateAfter?: boolean;
}

/** งาน WRITE_NOW — เขียนบทความทันที (ไม่มี promptBrief = ดูดหัวข้อจากแชทเมื่อวานเหมือน cron) */
export interface SeoArticleWriteNowPayload {
  /** โจทย์ที่พิมพ์เอง — มีค่า = โหมด MANUAL, ไม่มี = ดูดจากแชทเมื่อวาน */
  promptBrief?: string;
  /** primary keyword ที่อยากให้ติดอันดับ */
  targetKeyword?: string;
  /** หมวดบทความบนเว็บ */
  category?: SeoArticleCategory;
}

/** งาน SINGLE_IMAGE — วาดรูปประกอบทีละใบจากหน้าแก้ไข */
export interface SeoArticleSingleImagePayload {
  /** คำสั่งวาดที่ผู้ใช้พิมพ์ — **ว่างได้** ว่าง = ให้ Claude อ่านบทความแล้วคิดคำสั่งเอง */
  description?: string;
  /** หัวข้อที่บล็อกรูปอยู่ใกล้ที่สุด — ช่วยให้ภาพเข้ากับหัวข้อนั้น */
  nearbyHeading?: string;
  /** เนื้อความรอบจุดที่จะแทรกรูป (จากร่างในหน้าแก้ไข) — บริบทตอนให้ Claude คิดคำสั่งเอง */
  nearbyText?: string;
  /** cover = รูปปกหัวบทความ, inline = รูปแทรกในเนื้อหา */
  placement: "cover" | "inline";
  /** ไม่ส่ง = ภาพถ่าย */
  style?: "photo" | "infographic";
}

/**
 * payload ของงานในคิว — แยกตาม jobType
 *
 * รวม payload ของงานหน้า /ask-and-answer ไว้ด้วย เพราะใช้ตาราง SeoArticleJob ใบเดียวกัน
 * (type ตัวจริงอยู่ที่ feature ของมันเอง ที่นี่แค่ประกาศว่าคิวรับค่าชนิดนี้ได้)
 */
export type SeoArticleJobPayload =
  | SeoArticleWriteCategoryPayload
  | SeoArticleWriteNowPayload
  | SeoArticleSingleImagePayload
  | SeoArticleGenerateImagesPayload
  | AskAnswerFaqWritePayload;
