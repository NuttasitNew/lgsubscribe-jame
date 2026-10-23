"use client";

import { useQuery } from "@tanstack/react-query";
import { seoArticleKeys } from "./query-key";
import { findSeoArticleMetrics } from "../server/find-seo-article-metrics.action";

/**
 * @description ดึงผล GSC ของบทความ (target keyword position + top queries 28 วัน)
 * @page /super-admin/hurry-web/seo-article
 * @used-by {@link ../components/seo-article-metrics-panel.tsx}
 */
export const useFindSeoArticleMetrics = (seoArticleId: number | null, enabled: boolean) => {
  return useQuery({
    queryKey: seoArticleKeys.metrics(seoArticleId ?? -1),
    queryFn: async () => await findSeoArticleMetrics({ seoArticleId: seoArticleId as number }),
    enabled: enabled && seoArticleId != null,
    staleTime: 10 * 60 * 1000, // GSC sync วันละครั้ง — ไม่ต้อง refetch ถี่
  });
};
