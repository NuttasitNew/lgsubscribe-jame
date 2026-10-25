"use server";

import { cookies } from "next/headers";
import { verifyByToken } from "@/lib/seo/auth";
import { ResponsePattern, ResponsePatternType } from "@/lib/seo/helper/response-pattern";
import prisma from "@/lib/seo/prisma";
import { SeoArticleJob, SeoArticleJobStatus } from "@prisma/client";
import { failStaleSeoArticleJobs } from "./fail-stale-seo-article-jobs.helper";

/** ย้อนหลังกี่ชั่วโมงที่ยังถือว่า "เพิ่งเกิด" และควรโชว์บนแถบสถานะ */
const RECENT_WINDOW_HOURS = 12;
/** จำนวนงานสูงสุดที่ส่งกลับ — แถบสถานะไม่ได้เป็นหน้าประวัติเต็ม */
const MAX_JOBS = 20;

/** งานที่ยังไม่จบ — แถบสถานะต้อง poll ต่อเมื่อมีสถานะเหล่านี้อยู่ */
const ACTIVE_STATUSES: SeoArticleJobStatus[] = [SeoArticleJobStatus.QUEUED, SeoArticleJobStatus.RUNNING];

export type SeoArticleJobItem = Pick<
  SeoArticleJob,
  | "seoArticleJobId"
  | "jobType"
  | "status"
  | "categoryName"
  | "topic"
  | "resultJson"
  | "targetKeyword"
  | "seoArticleId"
  | "errorMessage"
  | "requestedBy"
  | "createdAt"
  | "finishedAt"
>;

export interface SeoArticleJobsResult {
  /** งานที่กำลังทำ + งานที่เพิ่งจบใน 12 ชม. เรียงใหม่→เก่า */
  jobs: SeoArticleJobItem[];
  /** จำนวนงานที่ยังไม่จบ — > 0 เมื่อไหร่ ฝั่ง UI ต้อง poll ต่อ */
  activeCount: number;
}

/**
 * @description ดึงสถานะคิวงาน AI ทั้งหน้า — งานที่กำลังทำ + งานที่เพิ่งจบ สำหรับแถบสถานะ hub และปุ่มในหน้าแก้ไข
 * @page /super-admin/hurry-web/seo-article
 * @access super-admin
 * @logic
 * - รวมงานที่ยังไม่จบ (ไม่จำกัดเวลา — ค้างมาข้ามวันก็ต้องเห็น) กับงานที่จบแล้วภายใน 12 ชม.
 *   งานที่จบนานแล้วไม่ต้องรก เพราะผลลัพธ์ไปโผล่ในรายการบทความ/คลังรูปแล้ว
 * - ส่งกลับ **ทุกชนิดงาน** ในก้อนเดียว ฝั่ง UI กรองเอาเองตาม jobType/seoArticleId
 *   (query เดียว poll เดียว ดีกว่าให้แต่ละปุ่มยิง query ของตัวเองแล้วถล่ม DB ตอนเปิดหลายหน้า)
 * - `resultJson` ติดมาด้วยเพราะงานวาดรูปทีละใบส่งรูปกลับหน้าแก้ไขทางนี้ทางเดียว
 * - `activeCount` ให้ฝั่ง UI ตัดสินใจว่าจะ poll ต่อไหม — ไม่มีงานค้างก็หยุดยิง query ทิ้ง
 * @returns งานในคิว + จำนวนงานที่ยังไม่จบ
 * @used-by {@link ../tanstack/find-seo-article-jobs.query.ts}
 * @related {@link ./queue-seo-article-job.action.ts}, {@link ./queue-category-articles.action.ts}
 */
export const findSeoArticleJobs = async (): Promise<ResponsePatternType<SeoArticleJobsResult>> => {
  const cookieStore = await cookies();
  const authToken = cookieStore.get("lg_backoffice_session")?.value;
  if (!authToken) return ResponsePattern.unauthorized("no auth token");

  let decoded;
  try {
    decoded = await verifyByToken(authToken);
  } catch {
    return ResponsePattern.unauthorized("Token ไม่ถูกต้องหรือหมดอายุ");
  }

  if (decoded.role !== "SUPER_ADMIN") {
    return ResponsePattern.forbidden("[SEO-JOBS-01] เฉพาะ super-admin เท่านั้น");
  }

  // แถบสถานะถูก poll ทุกไม่กี่วินาที — ไม่เปิด log session กัน log ท่วมโดยไม่ได้ข้อมูลอะไรเพิ่ม
  try {
    await failStaleSeoArticleJobs();
    const recentSince = new Date(Date.now() - RECENT_WINDOW_HOURS * 3600000);

    const jobs = await prisma.seoArticleJob.findMany({
      where: {
        OR: [{ status: { in: ACTIVE_STATUSES } }, { finishedAt: { gte: recentSince } }],
      },
      select: {
        seoArticleJobId: true,
        jobType: true,
        status: true,
        categoryName: true,
        topic: true,
        resultJson: true,
        targetKeyword: true,
        seoArticleId: true,
        errorMessage: true,
        requestedBy: true,
        createdAt: true,
        finishedAt: true,
      },
      orderBy: { createdAt: "desc" },
      take: MAX_JOBS,
    });

    const activeCount = jobs.filter((job) => ACTIVE_STATUSES.includes(job.status)).length;

    return ResponsePattern.ok("ดึงสถานะคิวสำเร็จ", { jobs, activeCount });
  } catch (error) {
    console.error("[SEO-JOBS-02] ดึงสถานะคิวไม่สำเร็จ:", error);
    return ResponsePattern.error("[SEO-JOBS-02] ดึงสถานะคิวไม่สำเร็จ");
  }
};
