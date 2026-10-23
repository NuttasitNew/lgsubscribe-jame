"use client";

import { useQuery } from "@tanstack/react-query";
import { seoArticleKeys } from "./query-key";
import { findSeoArticleDetail } from "../server/find-seo-article-detail.action";

/**
 * @description ดึงบทความ SEO เรื่องเดียวพร้อมเนื้อหาโครง block สำหรับหน้าแก้ไข
 * @page /super-admin/hurry-web/seo-article
 * @logic
 * - `enabled` ใช้ `!= null` เพราะ id เป็น number (id = 0 ต้องไม่ปิด query)
 * - `staleTime: 0` — หน้าแก้ไขต้องได้ updatedAt ล่าสุดเสมอ ไม่งั้น optimistic concurrency ชนตั้งแต่เซฟแรก
 * @related {@link save-seo-article.mutation.ts}
 */
export const useFindSeoArticleDetail = (seoArticleId: number | null) => {
  return useQuery({
    queryKey: seoArticleKeys.detail(seoArticleId ?? -1),
    queryFn: async () => await findSeoArticleDetail({ seoArticleId: seoArticleId as number }),
    enabled: seoArticleId != null,
    staleTime: 0,
  });
};
