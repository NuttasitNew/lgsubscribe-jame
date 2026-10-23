"use client";

import { useQuery } from "@tanstack/react-query";
import { seoArticleKeys } from "./query-key";
import { findSeoArticleOverview } from "../server/find-seo-article-overview.action";

/**
 * @description ดึงตัวเลขสรุปหน้าภาพรวมบทความ SEO (นับด้วย groupBy ฝั่ง DB ไม่โหลดทุกแถว)
 * @page /super-admin/hurry-web/seo-article
 */
export const useFindSeoArticleOverview = () => {
  return useQuery({
    queryKey: seoArticleKeys.overview(),
    queryFn: async () => await findSeoArticleOverview(),
    staleTime: 60 * 1000,
  });
};
