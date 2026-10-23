/**
 * @description ระดับความต้องการของบริการ — ใช้บังคับให้ AI เสนอหัวข้อครบทุกระดับ ไม่กระจุกที่ของขายดีอย่างเดียว
 * @page /super-admin/hurry-web/seo-article
 * @logic
 * - ปัญหาที่แก้: เดิม AI เห็นแต่ "บริการที่จ้างบ่อยที่สุด 15 อันดับ" หัวข้อที่เสนอจึงวนอยู่กับ
 *   โซฟา/ที่นอนตลอด — บริการราคาแพงหรือของที่ยังไม่มีใครรู้ว่าเรารับ ไม่เคยถูกเสนอเลยสักครั้ง
 * - 4 ระดับนี้ **วัดจากงานจริงในระบบเรา** ไม่ใช่วัดจากความนิยมทั่วโลก
 *   UNTAPPED จึงแปลว่า "เรายังไม่เคยขายของชิ้นนี้" ไม่ได้แปลว่า "ไม่มีคนต้องการ"
 *   → ตัวตัดสินว่าคุ้มเขียนไหมของ UNTAPPED คือ **ยอดค้นหาบน Google** ไม่ใช่ยอดขาย (ดู searchDemand ใน grounding)
 * @related {@link ../helper/classify-service-demand.helper.ts}
 */
export const SEO_DEMAND_TIERS = ["HIGH", "MEDIUM", "LOW", "UNTAPPED"] as const;

export type SeoDemandTier = (typeof SEO_DEMAND_TIERS)[number];

/** ชื่อไทย + คำอธิบายของแต่ละระดับ — ใช้ทั้งใน prompt และบนหน้าจอ ให้พูดตรงกัน */
export const SEO_DEMAND_TIER_LABEL: Record<SeoDemandTier, { label: string; description: string }> = {
  HIGH: { label: "ถามเยอะ", description: "บริการที่ลูกค้าจ้างบ่อยที่สุด — เขียนแล้วมีคนอ่านแน่" },
  MEDIUM: { label: "ถามปานกลาง", description: "มีงานสม่ำเสมอแต่ยังไม่ใช่ตัวหลัก — ดันได้อีก" },
  LOW: { label: "ถามน้อย", description: "นาน ๆ มีงานที — คนยังไม่รู้ว่าเรารับ" },
  UNTAPPED: { label: "ยังไม่มีใครถาม", description: "ไม่มีงานเลยในรอบปี — ตัดสินจากยอดค้นหาบน Google แทน" },
};

/**
 * โควตาหัวข้อต่อระดับที่เป็นค่าเริ่มต้น — รวม 6 หัวข้อ
 *
 * ตั้งใจให้ครึ่งหนึ่งเป็นของที่ "ยังไม่ขายดี" (LOW + UNTAPPED) เพราะของขายดีมีบทความคลุมไปเยอะแล้ว
 * ส่วนที่ยังว่างคือของแพง/ของเฉพาะทางที่ยังไม่มีหน้าไหนรองรับ
 */
export const SEO_DEMAND_TIER_DEFAULT_QUOTA: Record<SeoDemandTier, number> = {
  HIGH: 2,
  MEDIUM: 1,
  LOW: 1,
  UNTAPPED: 2,
};

/** เพดานหัวข้อต่อระดับต่อครั้ง — มากกว่านี้คนตรวจไม่ไหวและคุณภาพต่อหัวข้อจะตก */
export const SEO_DEMAND_TIER_MAX_PER_TIER = 5;
