import { SeoArticleStatus } from "@prisma/client";

/** พารามิเตอร์ที่ทำให้ผลลัพธ์ของ list ต่างกัน — ต้องอยู่ใน key ครบ ไม่งั้นสลับหน้า/ค้นหาแล้วได้ cache ของชุดอื่น */
export interface SeoArticleListKeyParams {
  status?: SeoArticleStatus;
  page?: number;
  pageSize?: number;
  search?: string;
}

/** ค่า default ของ list — ต้องตรงกับ findSeoArticles ไม่งั้น key ของ "ไม่ส่ง" กับ "ส่งค่า default" จะแยก cache กัน */
const DEFAULT_LIST_PAGE = 1;
const DEFAULT_LIST_PAGE_SIZE = 20;

/**
 * @description Query keys ของ feature SEO Article — single source of truth
 * @page /super-admin/hurry-web/seo-article
 * @logic
 * - ทุก key ขึ้นต้นด้วย prefix เดียว ["seo-article"] แล้วแตกเป็นทรี list / detail / overview / metrics
 *   → invalidate ทั้ง feature ใช้ `all()`, เฉพาะกลุ่มใช้ `lists()` / `details()` / `overview()`
 * - `list()` normalize ค่าก่อนใส่ใน key เสมอ (undefined → ค่า default) กัน cache แตกโดยไม่ตั้งใจ
 */
export const seoArticleKeys = {
  all: () => ["seo-article"] as const,

  lists: () => ["seo-article", "list"] as const, // invalidate ทุกหน้า/ทุก tab พร้อมกัน
  list: (params: SeoArticleListKeyParams = {}) =>
    [
      "seo-article",
      "list",
      {
        status: params.status ?? "ALL",
        page: params.page ?? DEFAULT_LIST_PAGE,
        pageSize: params.pageSize ?? DEFAULT_LIST_PAGE_SIZE,
        search: params.search?.trim() ?? "",
      },
    ] as const,

  details: () => ["seo-article", "detail"] as const, // invalidate บทความทุกเรื่องที่เปิดค้างไว้
  detail: (seoArticleId: number) => ["seo-article", "detail", seoArticleId] as const,

  overview: () => ["seo-article", "overview"] as const, // ตัวเลขสรุปหน้าภาพรวม

  allImages: () => ["seo-article", "images"] as const, // invalidate ทุกคลังรูป (วาดใบใหม่กระทบทั้งแท็บ "จากบทความอื่น" ของเรื่องอื่นด้วย)
  images: (seoArticleId: number, placement: string) => ["seo-article", "images", seoArticleId, placement] as const,

  allMetrics: () => ["seo-article", "metrics"] as const, // invalidate หลัง sync GSC (กระทบทุกบทความ)
  metrics: (seoArticleId: number) => ["seo-article", "metrics", seoArticleId] as const, // ผล GSC ต่อบทความ
  // ตารางผล GSC ของทุกบทความ (เรียงคลิก) — อยู่ใต้ prefix "metrics" เพื่อให้ allMetrics() ล้างทีเดียวหลัง sync
  metricsRanking: (page: number, pageSize: number) => ["seo-article", "metrics", "ranking", page, pageSize] as const,

  // mutationKey ของ "สั่ง AI วาดรูปทีละใบ" — ไม่ใช่ cache แต่ใช้ให้ทุกจุดที่สั่งวาด (บล็อกรูป/รูปปก)
  // อ้าง key ชุดเดียวกัน จะได้เช็คสถานะกำลังวาดข้าม component ได้ และไม่ต้อง hardcode string
  singleImageGeneration: () => ["seo-article", "single-image-generation"] as const,

  // mutationKey ของ "ลบบทความ" — ใช้เช็คสถานะกำลังลบเพื่อกันกดซ้ำระหว่างรอ push ซ่อนไฟล์บนเว็บ
  delete: () => ["seo-article", "delete"] as const,

  // หมวดหมู่บริการ + สถิติ (ไดอะล็อกสั่งเขียนบทความตามหมวด) — เปลี่ยนแทบไม่ได้เลย จึง cache ยาว
  serviceCategories: () => ["seo-article", "service-categories"] as const,

  // สถานะคิวเขียนบทความ — poll เฉพาะตอนมีงานค้าง
  jobs: () => ["seo-article", "jobs"] as const,
} as const;
