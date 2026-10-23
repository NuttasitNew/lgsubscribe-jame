"use client";

import { useQuery } from "@tanstack/react-query";
import type { AskAnswerFaqStatus } from "@prisma/client";
import { askAnswerFaqKeys } from "./query-key";
import { findAskAnswerFaqs } from "../server/find-ask-answer-faqs.action";

/**
 * @description ดึงรายการข้อถาม-ตอบที่ AI เสนอ (กรองตามสถานะได้)
 * @page /super-admin/hurry-web/seo-article?section=faq
 * @logic staleTime สั้น (30 วิ) เพราะงาน WRITE_FAQ ในคิวเขียนแถวใหม่เข้ามาเบื้องหลัง
 *        — useWatchSeoArticleJobs เป็นคน invalidate ตอนงานจบ ค่านี้เป็นแค่ตาข่ายรอง
 */
export const useFindAskAnswerFaqs = (status?: AskAnswerFaqStatus) => {
  return useQuery({
    queryKey: askAnswerFaqKeys.list(status),
    queryFn: async () => await findAskAnswerFaqs(status ? { status } : {}),
    staleTime: 30 * 1000,
  });
};
