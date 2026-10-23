"use client";

import { useQuery } from "@tanstack/react-query";
import { seoArticleKeys } from "./query-key";
import { findServiceCategories } from "../server/find-service-categories.action";

/** หมวดหมู่บริการเปลี่ยนแทบไม่ได้เลย (เพิ่มหมวดใหม่นาน ๆ ที) — cache ยาวได้ */
const STALE_TIME = 30 * 60 * 1000;

/**
 * @description ดึงหมวดหมู่บริการพร้อมตัวเลขจริง สำหรับให้เลือกในไดอะล็อกสั่งเขียนบทความ
 * @page /super-admin/hurry-web/seo-article
 * @related action: {@link ../server/find-service-categories.action.ts}
 */
export const useFindServiceCategories = (enabled: boolean) => {
  return useQuery({
    queryKey: seoArticleKeys.serviceCategories(),
    queryFn: async () => await findServiceCategories(),
    enabled, // ยิงเฉพาะตอนเปิดไดอะล็อก — ไม่ต้องโหลดตั้งแต่เข้าหน้า
    staleTime: STALE_TIME,
  });
};
