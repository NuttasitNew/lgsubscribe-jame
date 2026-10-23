import type { GeneratedSingleImage } from "./generated-single-image.type";

/**
 * @description ผลลัพธ์ที่หน้าจอต้องเอาไปใช้ต่อเมื่องานในคิวจบ — เก็บใน `SeoArticleJob.resultJson` (Json)
 * @logic
 * - มีเฉพาะงานที่ผลลัพธ์ **ไม่ได้อยู่ในฐานข้อมูลที่ query อื่นดึงได้อยู่แล้ว**
 *   งานเขียน/gen รูปยกชุด/แปล EN เขียนลง SeoArticle ตรง ๆ หน้าจอ refetch เอาเองได้ จึงไม่ต้องมี result
 *   ส่วน SINGLE_IMAGE ตั้งใจไม่แตะ contentJson (ร่างเป็นของหน้าแก้ไข) ผลจึงต้องเดินทางกลับผ่าน field นี้
 * @related {@link ./seo-article-job-payload.type.ts}, {@link ../server/run-single-image-job.helper.ts}
 */

/**
 * ผลของงาน SINGLE_IMAGE — รูปที่วาดเสร็จ
 * หน้าแก้ไขจับคู่ผลกับคำสั่งด้วย **เลข job ที่ตัวเองสั่ง** (ไม่ต้องมี id ของบล็อกในนี้)
 * ช่องสั่งวาดจำเลข job ไว้ตอนกด แล้วรอจนใบนั้นเป็น DONE ค่อยหยิบรูปไปวาง
 */
export type SeoArticleSingleImageResult = GeneratedSingleImage;

/** resultJson ของงานในคิว — แยกตาม jobType */
export type SeoArticleJobResult = SeoArticleSingleImageResult;
