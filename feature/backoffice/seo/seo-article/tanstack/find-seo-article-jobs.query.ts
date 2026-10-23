"use client";

import { useQuery } from "@tanstack/react-query";
import { seoArticleKeys } from "./query-key";
import { findSeoArticleJobs } from "../server/find-seo-article-jobs.action";

/** ถี่แค่ไหนตอนมีงานค้าง — เขียน 1 เรื่องใช้ ~1-2 นาที ทุก 8 วินาทีจึงละเอียดพอโดยไม่ถล่ม DB */
const ACTIVE_POLL_MS = 8000;

/**
 * @description ดึงสถานะคิวเขียนบทความสำหรับแถบ "กำลังเขียน N เรื่อง" บนหน้า hub
 * @page /super-admin/hurry-web/seo-article
 * @logic
 * - poll เฉพาะตอนมีงานค้างจริง (activeCount > 0) — งานจบหมดแล้วหยุดยิง query ทิ้ง
 * - สถานะมาจาก DB ไม่ใช่ state ของหน้า → ผู้ใช้เปลี่ยนหน้าไปทำอย่างอื่นแล้วกลับมาก็ยังเห็นงานที่ค้างอยู่
 * @related action: {@link ../server/find-seo-article-jobs.action.ts}
 */
export const useFindSeoArticleJobs = () => {
  return useQuery({
    queryKey: seoArticleKeys.jobs(),
    queryFn: async () => await findSeoArticleJobs(),
    refetchInterval: (query) => {
      const result = query.state.data;
      const activeCount = result?.status === "ok" ? (result.data?.activeCount ?? 0) : 0;
      return activeCount > 0 ? ACTIVE_POLL_MS : false;
    },
    refetchOnWindowFocus: true, // กลับมาที่แท็บนี้ = อยากรู้ทันทีว่าเขียนเสร็จหรือยัง
  });
};
