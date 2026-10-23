"use client";

import React from "react";
import { useQueryClient } from "@tanstack/react-query";
import Swal from "sweetalert2";
import { SeoArticleJobStatus, SeoArticleJobType } from "@prisma/client";
import { seoArticleKeys } from "./query-key";
import { askAnswerFaqKeys } from "../../ask-answer-faq/tanstack/query-key";
import { useFindSeoArticleJobs } from "./find-seo-article-jobs.query";
import type { SeoArticleJobItem } from "../server/find-seo-article-jobs.action";

/**
 * job ที่จัดการไปแล้ว — เก็บระดับ **module ไม่ใช่ ref ของ instance** เพราะหน้า hub กับหน้าแก้ไข
 * เรียก hook นี้พร้อมกันได้ ถ้าต่างคนต่างจำ งานพัง 1 ใบจะเด้ง Swal ซ้ำเท่าจำนวน component ที่เปิดอยู่
 */
const handledJobIds = new Set<number>();
/** seed แล้วหรือยัง — รอบแรกของ session แค่จำงานเก่า ไม่ถือเป็นข่าวใหม่ */
let hasSeeded = false;

/**
 * @description เฝ้าคิวงาน AI แล้ว sync cache ให้ตรงกับของจริงทันทีที่งานจบ — ทุกหน้าที่มีปุ่มเรียก AI ต้องเรียกตัวนี้
 * @page /super-admin/hurry-web/seo-article
 * @logic
 * - ปุ่มคืนค่าตั้งแต่ "รับงาน" ผลลัพธ์จึงมาถึงทีหลังโดยไม่มี onSuccess ของ mutation ให้เกาะ
 *   หน้าที่ invalidate cache เลยย้ายมาอยู่ที่นี่ — จุดเดียวที่รู้ว่างานไหนเพิ่งเปลี่ยนเป็น DONE/FAILED
 * - แต่ละชนิดงานกระทบ cache คนละชุด (ดู INVALIDATE ในโค้ด) — invalidate หว่านทั้ง feature จะดึงบทความ
 *   ทุกเรื่องที่เปิดค้างกลับมาทับร่างที่ผู้ใช้กำลังแก้อยู่
 * - จำ job ที่จัดการไปแล้วไว้ใน ref กัน invalidate ซ้ำทุกรอบ poll (คิวคืนงานที่จบแล้วย้อนหลัง 12 ชม.เสมอ)
 *   รอบแรกหลัง mount แค่ "จำ" ไม่ทำอะไร ไม่งั้นเปิดหน้ามาทีเดียวจะยิง invalidate รัวตามจำนวนงานเก่า
 * - งานที่พังเด้ง Swal เพราะหน้าแก้ไขไม่มีแถบสถานะให้ดู ผู้ใช้ต้องรู้ว่าที่สั่งไปเมื่อครู่ไม่สำเร็จ
 * @returns รายการงานในคิวทั้งหมด (ให้ผู้เรียกกรองต่อด้วย pick-seo-article-jobs.helper.ts)
 * @related {@link ./find-seo-article-jobs.query.ts}, {@link ../helper/pick-seo-article-jobs.helper.ts}
 */
export const useWatchSeoArticleJobs = (): SeoArticleJobItem[] => {
  const queryClient = useQueryClient();
  const { data: jobResult } = useFindSeoArticleJobs();

  const jobs = React.useMemo(() => {
    if (jobResult?.status !== "ok") return [];
    return jobResult.data?.jobs ?? [];
  }, [jobResult]);

  React.useEffect(() => {
    if (jobs.length === 0) return;

    const finished = jobs.filter(
      (job) => job.status === SeoArticleJobStatus.DONE || job.status === SeoArticleJobStatus.FAILED
    );

    // ตัดใบที่หลุดหน้าต่าง 12 ชม.ไปแล้วออก — ไม่งั้น Set โตไปเรื่อย ๆ ตลอด session
    handledJobIds.forEach((id) => {
      if (!jobs.some((job) => job.seoArticleJobId === id)) handledJobIds.delete(id);
    });

    // รอบแรก = จำงานเก่าทั้งหมดไว้เฉย ๆ (มันจบไปก่อนหน้าเปิดแล้ว ไม่ใช่ข่าวใหม่ของผู้ใช้)
    if (!hasSeeded) {
      hasSeeded = true;
      finished.forEach((job) => handledJobIds.add(job.seoArticleJobId));
      return;
    }

    for (const job of finished) {
      if (handledJobIds.has(job.seoArticleJobId)) continue;
      handledJobIds.add(job.seoArticleJobId);

      if (job.status === SeoArticleJobStatus.FAILED) {
        Swal.fire({
          title: "งานไม่สำเร็จ",
          text: job.errorMessage || `ทำงาน "${job.topic}" ไม่สำเร็จ`,
          icon: "error",
          timer: 5000,
          timerProgressBar: true,
          showConfirmButton: false,
        });
        continue;
      }

      switch (job.jobType) {
        // บทความใหม่โผล่ในรายการ "รอรีวิว" + ตัวเลขสรุปเปลี่ยน
        case SeoArticleJobType.WRITE_CATEGORY:
        case SeoArticleJobType.WRITE_NOW:
          void queryClient.invalidateQueries({ queryKey: seoArticleKeys.lists() });
          void queryClient.invalidateQueries({ queryKey: seoArticleKeys.overview() });
          break;

        // contentJson เปลี่ยน (รูปชุดใหม่) — การ์ดในรายการโชว์ปกด้วย จึงต้อง refetch ทั้งคู่
        case SeoArticleJobType.GENERATE_IMAGES:
          void queryClient.invalidateQueries({ queryKey: seoArticleKeys.lists() });
          if (job.seoArticleId != null) {
            void queryClient.invalidateQueries({ queryKey: seoArticleKeys.detail(job.seoArticleId) });
          }
          break;

        // เฉพาะ field EN เปลี่ยน — ปลอดภัยเพราะปุ่มแปลกดได้เฉพาะตอนไม่มีร่างค้าง (ไม่มีงานให้ทับ)
        case SeoArticleJobType.TRANSLATE_EN:
          if (job.seoArticleId != null) {
            void queryClient.invalidateQueries({ queryKey: seoArticleKeys.detail(job.seoArticleId) });
          }
          break;

        // ⚠️ คลังรูปเท่านั้น — **ห้าม invalidate detail เด็ดขาด** จะดึงร่างเก่ากลับมาทับที่ผู้ใช้แก้ค้างไว้
        case SeoArticleJobType.SINGLE_IMAGE:
          void queryClient.invalidateQueries({ queryKey: seoArticleKeys.allImages() });
          break;

        // งานของหน้า /ask-and-answer — แถวใหม่ในตาราง AskAnswerFaq (คนละ cache กับบทความทั้งชุด)
        case SeoArticleJobType.WRITE_FAQ:
          void queryClient.invalidateQueries({ queryKey: askAnswerFaqKeys.lists() });
          break;

        // แปลไฟล์ en ทั้งใบ push ตรงขึ้นเว็บ ไม่แตะฐานเลย — ไม่มี cache ให้ล้าง
        // แต่ต้องมี case ไว้ให้ switch ครบทุกชนิด (เพิ่มชนิดใหม่แล้วจะได้เห็นว่าลืมคิดถึงที่นี่)
        case SeoArticleJobType.TRANSLATE_FAQ_EN:
          break;
      }
    }
  }, [jobs, queryClient]);

  return jobs;
};
