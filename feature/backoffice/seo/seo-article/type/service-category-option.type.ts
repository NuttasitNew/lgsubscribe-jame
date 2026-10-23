/**
 * @description หมวดหมู่บริการ 1 หมวด พร้อมตัวเลขจริงจากฐานข้อมูล — ใช้เป็นตัวเลือกในไดอะล็อกสั่งเขียนบทความ
 * @page /super-admin/hurry-web/seo-article
 * @related
 * - action: {@link ../server/find-service-categories.action.ts}
 * - ที่มา: model ServiceCategoryDescription + ServiceCode + OrderService
 */
export interface ServiceCategoryOption {
  /** รหัสหมวด เช่น "F" (PK ของ ServiceCategoryDescription) */
  categoryCode: string;
  /** ชื่อหมวดภาษาไทย เช่น "เฟอร์นิเจอร์" */
  categoryName: string;
  /** จำนวนรายการบริการในหมวด (นับจาก ServiceCode) */
  serviceCount: number;
  /** จำนวนออเดอร์ที่เคยมีบริการในหมวดนี้ — ใช้เรียงหมวดที่ธุรกิจทำจริงบ่อยขึ้นก่อน */
  orderCount: number;
  /** ราคาต่ำสุดในหมวด (บาท) — null = ทั้งหมวดเป็นราคาเหมา ไม่มีราคาป้าย */
  minPrice: number | null;
  /** ราคาสูงสุดในหมวด (บาท) — null = ทั้งหมวดเป็นราคาเหมา */
  maxPrice: number | null;
  /** กลุ่มบริการย่อยที่มี ServiceCode จริงในหมวดนี้ เรียงตามจำนวนออเดอร์ */
  subcategories: ServiceSubcategoryOption[];
}
/**
 * @description กลุ่มบริการย่อยภายใต้หมวดหลัก พร้อมสถิติจริงจาก ServiceCode/OrderService
 * @page /super-admin/hurry-web/seo-article
 * @related {@link ../helper/service-subcategory.helper.ts}
 */
export interface ServiceSubcategoryOption {
  /** ชื่อกลุ่ม เช่น โซฟา, บริเวณที่นอน, ผ้าม่าน */
  subcategoryName: string;
  /** จำนวน ServiceCode ที่จัดอยู่ในกลุ่มนี้ */
  serviceCount: number;
  /** จำนวนออเดอร์ที่เคยมีบริการในกลุ่มนี้ */
  orderCount: number;
  /** ราคาป้ายต่ำสุด; null = ไม่มีราคาป้าย */
  minPrice: number | null;
  /** ราคาป้ายสูงสุด; null = ไม่มีราคาป้าย */
  maxPrice: number | null;
}
