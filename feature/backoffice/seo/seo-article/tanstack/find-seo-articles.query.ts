"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { SeoArticleStatus } from "@prisma/client";
import { seoArticleKeys } from "./query-key";
import { findSeoArticles } from "../server/find-seo-articles.action";

export interface UseFindSeoArticlesParams {
  status?: SeoArticleStatus; // ไม่ส่ง = ทุกสถานะ
  page?: number; // เริ่มที่ 1
  pageSize?: number; // ไม่ส่ง = 20
  search?: string; // ค้นจาก title / slug (ค้นฝั่ง server)
}

/**
 * @description ดึงรายการบทความ SEO แบบแบ่งหน้า (ไม่มี contentJson — หน้าแก้ไขโหลดเนื้อหาเองผ่าน useFindSeoArticleDetail)
 * @page /super-admin/hurry-web/seo-article
 * @logic `placeholderData: keepPreviousData` — เปลี่ยนหน้าแล้วรายการเดิมค้างไว้ก่อน ไม่กระพริบเป็นหน้าว่าง
 * @related {@link find-seo-article-detail.query.ts}
 */
export const useFindSeoArticles = (params: UseFindSeoArticlesParams = {}) => {
  return useQuery({
    queryKey: seoArticleKeys.list(params),
    queryFn: async () => await findSeoArticles(params),
    staleTime: 60 * 1000,
    placeholderData: keepPreviousData,
  });
};
