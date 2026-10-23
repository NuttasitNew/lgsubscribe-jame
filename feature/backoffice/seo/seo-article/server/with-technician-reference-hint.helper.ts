/**
 * @description เติมคำว่า "ช่าง" ให้บรีฟที่ใช้เลือกรูปอ้างอิง เพื่อให้ภาพถ่ายบทความล็อกชุดช่างเหมือนรูปปก
 * @logic ต่อท้ายเท่านั้น ไม่แก้บรีฟจริงที่ส่งให้ AI; บรีฟที่ระบุว่าไม่มีคนยังไม่แนบยูนิฟอร์ม (ตัวเลือกรูปอ้างอิงตัดสินเอง)
 *   รูปเครื่องใช้ไฟฟ้า LG แนบเมื่อบรีฟพูดถึงชนิดเครื่องเองเท่านั้น
 * @used-by {@link ./generate-article-images.helper.ts}, {@link ./run-single-image-job.helper.ts}
 * @related {@link ../../brand-profile/helper/select-brand-reference-kinds.helper.ts}
 * @param description บรีฟของภาพหรือหัวข้อที่ใช้เลือกรูปอ้างอิง
 * @returns ข้อความสำหรับ `referenceDescription`
 */
export const withTechnicianReferenceHint = (description: string): string => `${description} ช่าง`;
