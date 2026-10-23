"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import Swal from "sweetalert2";
import { seoArticleKeys } from "./query-key";
import { queueSeoArticleJob, type QueueSeoArticleJobParams } from "../server/queue-seo-article-job.action";

/**
 * @description ส่งงาน AI (เขียนทันที / gen รูปยกชุด / แปล EN / วาดรูปทีละใบ) เข้าคิวแล้วคืนทันที
 * @page /super-admin/hurry-web/seo-article
 * @invalidates seo-article/jobs — ให้แถบสถานะกับปุ่มในหน้าแก้ไขเห็นงานใหม่ทันทีโดยไม่ต้องรอรอบ poll
 * @logic
 * - **สำเร็จ = ยังไม่มีผลลัพธ์** มีแค่ "รับงานแล้ว" — ห้ามเด้ง Swal ว่าเสร็จ ผู้ใช้จะเข้าใจผิดว่าได้ของแล้ว
 *   ความคืบหน้าจริงอ่านจาก useFindSeoArticleJobs (สถานะอยู่ใน DB ปุ่มจึงหมุนต่อได้แม้สลับหน้าไปกลับมา)
 * - ล้มเหลวตอนเข้าคิว (สั่งซ้ำ / กดรัว / คิวล่ม) ถึงค่อยแจ้ง — มี error code ติดมาในข้อความจาก action แล้ว
 */
export const useQueueSeoArticleJob = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: QueueSeoArticleJobParams) => {
      return await queueSeoArticleJob(params);
    },
    onSuccess: async (result) => {
      if (result.status === "ok") {
        await queryClient.invalidateQueries({ queryKey: seoArticleKeys.jobs() });
        return;
      }

      Swal.fire({
        title: "สั่งงานไม่สำเร็จ",
        text: result.message,
        icon: "error",
        timer: 3500,
        timerProgressBar: true,
        showConfirmButton: false,
      });
    },
    onError: (error) => {
      Swal.fire({
        title: "เกิดข้อผิดพลาด",
        text: error instanceof Error ? error.message : "ไม่สามารถดำเนินการได้",
        icon: "error",
        timer: 3500,
        timerProgressBar: true,
        showConfirmButton: false,
      });
    },
  });
};
