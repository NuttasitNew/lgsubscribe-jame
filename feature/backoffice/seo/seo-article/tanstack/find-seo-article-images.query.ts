"use client";

import { useQuery } from "@tanstack/react-query";
import { SeoArticleImagePlacement } from "@prisma/client";
import { seoArticleKeys } from "./query-key";
import { findSeoArticleImages } from "../server/find-seo-article-images.action";

/**
 * @description ดึงคลังรูปที่ AI เคยวาด (ของบทความนี้ + ของบทความอื่น) สำหรับแถบ "รูปที่เคยวาด"
 * @page /super-admin/hurry-web/seo-article?edit=<id>
 * @logic
 * - `enabled` ให้ยิงเฉพาะตอนผู้ใช้กางแถบคลังรูปจริง ๆ — ไม่มีใครเปิดหน้าแก้ไขเพื่อดูรูปเก่าทุกครั้ง
 * - staleTime สั้น (1 นาที) เพราะวาดรูปใบใหม่เสร็จแล้วต้องเห็นในคลังทันทีที่กางดูรอบหน้า
 * @related {@link ../server/find-seo-article-images.action.ts}
 */
export const useFindSeoArticleImages = (params: {
  seoArticleId: number | null;
  placement: SeoArticleImagePlacement;
  enabled: boolean;
}) => {
  return useQuery({
    queryKey: seoArticleKeys.images(params.seoArticleId ?? 0, params.placement),
    queryFn: async () =>
      await findSeoArticleImages({ seoArticleId: params.seoArticleId as number, placement: params.placement }),
    enabled: params.enabled && params.seoArticleId != null,
    staleTime: 60 * 1000,
  });
};
