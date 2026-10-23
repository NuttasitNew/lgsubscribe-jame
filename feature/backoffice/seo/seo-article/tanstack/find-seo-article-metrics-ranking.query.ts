"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { seoArticleKeys } from "./query-key";
import { findSeoArticleMetricsRanking } from "../server/find-seo-article-metrics-ranking.action";

/**
 * @description ตารางผล GSC ของบทความที่เผยแพร่ทุกเรื่อง (เรียงคลิก → impressions) แบบแบ่งหน้า
 * @page /super-admin/hurry-web/seo-article
 * @used-by {@link ../components/seo-article-metrics-ranking-table.tsx}
 */
export const useFindSeoArticleMetricsRanking = (page: number, pageSize: number) => {
  return useQuery({
    queryKey: seoArticleKeys.metricsRanking(page, pageSize),
    queryFn: async () => await findSeoArticleMetricsRanking({ page, pageSize }),
    staleTime: 10 * 60 * 1000, // GSC sync วันละครั้ง — ไม่ต้อง refetch ถี่
    placeholderData: keepPreviousData, // สลับหน้าแล้วตารางไม่กระพริบเป็นหน้าว่าง
  });
};
