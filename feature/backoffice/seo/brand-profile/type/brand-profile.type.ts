/** @description รูปอ้างอิงที่ AI ใช้ตามประเภทและสถานะเปิดใช้งาน */
export interface BrandReference {
  id: string;
  label: string;
  description: string;
  kind: "uniform" | "equipment" | "style";
  url: string;
  enabled: boolean;
}
/** @description ชุดแนวทางบริษัทพร้อม revision ป้องกันการเขียนทับ */
export interface BrandProfile {
  systemPrompt: string;
  references: BrandReference[];
  revision: number;
  updatedBy: string | null;
  updatedAt: string | null;
}
