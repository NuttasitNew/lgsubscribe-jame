"use client";

import React from "react";
import { SeoArticleJobStatus } from "@prisma/client";
import { useFindSeoArticleJobs } from "./find-seo-article-jobs.query";
import { useSeoArticleEditorStore } from "../zustand/seo-article-editor.store";
import type { SeoArticleJobItem } from "../server/find-seo-article-jobs.action";
import type { SeoArticleSingleImageResult } from "../type/seo-article-job-result.type";

/**
 * เผื่อเวลาหลังสั่งงาน ก่อนจะเชื่อผลว่า "ไม่มี job ใบนี้ในคิว" (มิลลิวินาที)
 * กัน refetch ที่เริ่มยิงคาบเกี่ยวกับตอนสั่ง แล้วได้ผลที่ยังไม่มีแถวใหม่กลับมา
 */
const QUEUE_SETTLE_GRACE_MS = 5_000;

export interface SeoArticleImageJobState {
  /** true = จุดนี้สั่งวาดไว้แล้วยังไม่จบ — ทั้งช่องสั่งวาดและตัวบล็อกใช้ค่านี้แสดงว่ากำลังวาด */
  isPending: boolean;
  /** งานที่สั่งค้างไว้ (ถ้าหาเจอในคิว) — ใช้ createdAt คำนวณว่ารอมากี่วินาทีแล้ว */
  pendingJob: SeoArticleJobItem | undefined;
  /** รูปที่วาดเสร็จแล้วรอวาง — มีค่าเมื่อ job เป็น DONE; ผู้เรียกต้อง clearPendingImageJob หลังวางเสร็จ */
  doneImage: SeoArticleSingleImageResult | null;
  /** เลิกรอได้แล้วแต่ไม่มีรูป (งานพัง หรืองานหายไปจากคิว) — ผู้เรียกต้อง clearPendingImageJob */
  isSettledWithoutImage: boolean;
}

/**
 * @description ตามงาน "AI วาดรูป" ของจุดวางรูป 1 จุด — ใช้ร่วมกันระหว่างช่องสั่งวาดกับตัวบล็อกที่รับรูป
 * @page /super-admin/hurry-web/seo-article?edit=<id>
 * @logic
 * - เลข job เก็บใน editor store (ไม่ใช่ state ของช่องสั่งวาด) เพราะช่องนั้นถูกปิดได้ระหว่างรอ
 *   ตัวบล็อกรูปยังอยู่บนหน้าตลอด จึงเป็นคนรอผลแล้ววางรูปเอง — ปิดช่องไปทำอย่างอื่นต่อได้
 *   และสโตร์ไม่ล้างค่านี้ตอนปิดหน้าแก้ไข → ออกไปหน้าอื่นแล้วกลับมา รูปก็ยังลงบล็อกเดิม
 * - hook นี้ **อ่านอย่างเดียว ไม่ล้างสถานะเอง** ให้ผู้ที่วางรูปจริงเป็นคนล้าง (คนเดียว)
 *   ไม่งั้นช่องสั่งวาดกับตัวบล็อกจะแย่งกันล้าง แล้วอีกฝ่ายพลาดผลลัพธ์ไป
 * - หา job ไม่เจอในคิว = เพิ่งสั่งไปแล้วคิวยังไม่ refetch ทัน → นับว่ากำลังวาดไว้ก่อน
 *   ไม่งั้นปุ่มจะกระพริบกลับมากดได้ในช่องว่างนั้น แล้วผู้ใช้กดซ้ำจนจ่ายค่า AI 2 รอบ
 *   (มีเพดาน LOST_JOB_TIMEOUT_MS กันหมุนค้างตลอดกาลถ้างานหายจริง)
 * - รีเฟรชทั้งหน้าระหว่างรอ = สโตร์หายทั้งก้อน รูปที่วาดเสร็จไปอยู่ใน "คลังรูป" อย่างเดียว
 *   (ยอมรับได้ เพราะการเขียนรูปลงฐานตรง ๆ จะชนกับร่างค้างในเครื่องของผู้ใช้)
 * @param slotId จุดที่จะวางรูป — id ของบล็อกรูป หรือ "cover" สำหรับรูปปก
 * @returns สถานะงานวาดรูปของจุดนั้น
 * @related {@link ../components/seo-article-ai-image-prompt.tsx}, {@link ../components/seo-article-image-block.tsx}
 */
export const useSeoArticleImageJob = (slotId: string): SeoArticleImageJobState => {
  const jobKey = useSeoArticleEditorStore((state) => `${state.seoArticleId}:${slotId}`);
  const pending = useSeoArticleEditorStore((state) => state.pendingImageJobs[jobKey]);
  const { data: jobResult, dataUpdatedAt } = useFindSeoArticleJobs();

  const pendingJob = React.useMemo(() => {
    if (!pending || jobResult?.status !== "ok") return undefined;
    return jobResult.data?.jobs.find((job) => job.seoArticleJobId === pending.seoArticleJobId);
  }, [jobResult, pending]);

  if (!pending) {
    return { isPending: false, pendingJob: undefined, doneImage: null, isSettledWithoutImage: false };
  }

  if (!pendingJob) {
    // เทียบกับ "เวลาที่คิวถูกดึงมาล่าสุด" ไม่ใช่เวลาปัจจุบัน — ค่าจาก query จึงคงที่ระหว่าง render
    // ดึงคิวมาหลังสั่งงานแล้วยังไม่มีแถวนี้ = งานหลุดหน้าต่าง 12 ชม.ไปแล้ว (เช่นค้างข้ามคืน)
    // ถ้าไม่มีด่านนี้ บล็อกนั้นจะหมุนค้างตลอดกาลจนกดวาดใหม่ไม่ได้
    const isLost = dataUpdatedAt > new Date(pending.queuedAt).getTime() + QUEUE_SETTLE_GRACE_MS;
    return { isPending: !isLost, pendingJob: undefined, doneImage: null, isSettledWithoutImage: isLost };
  }

  const isDone = pendingJob.status === SeoArticleJobStatus.DONE;
  const isFailed = pendingJob.status === SeoArticleJobStatus.FAILED;
  const image = isDone ? ((pendingJob.resultJson as SeoArticleSingleImageResult | null) ?? null) : null;

  return {
    isPending: !isDone && !isFailed,
    pendingJob,
    doneImage: image,
    isSettledWithoutImage: isFailed || (isDone && image?.url == null),
  };
};
