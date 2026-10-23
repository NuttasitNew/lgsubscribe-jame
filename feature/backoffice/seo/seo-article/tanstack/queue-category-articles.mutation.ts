"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import Swal from "sweetalert2";
import { seoArticleKeys } from "./query-key";
import { queueCategoryArticles, type QueueCategoryArticlesParams } from "../server/queue-category-articles.action";

/**
 * @description สั่งเขียนบทความตามหัวข้อที่ติ๊กเลือก — เข้าคิวแล้วคืนทันที ไม่ต้องรอ AI เขียนจบ
 * @page /super-admin/hurry-web/seo-article
 * @logic
 * - งานจริงใช้ ~1-2 นาทีต่อเรื่องแต่ทำเบื้องหลัง ผู้ใช้ปิดไดอะล็อกและเปลี่ยนหน้าไปทำอย่างอื่นได้เลย
 * - invalidate คิวทันทีเพื่อให้แถบ "กำลังเขียน" โผล่ขึ้นมาในวินาทีเดียวกับที่กด (ไม่ต้องรอรอบ poll ถัดไป)
 * - ไม่ invalidate รายการบทความตรงนี้ เพราะยังไม่มีบทความเกิดขึ้น — แถบสถานะจะ invalidate ให้เองตอนงานจบ
 * @invalidates seo-article/jobs
 */
export const useQueueCategoryArticles = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: QueueCategoryArticlesParams) => {
      return await queueCategoryArticles(params);
    },
    onSuccess: async (result) => {
      if (result.status === "ok") {
        Swal.fire({
          title: "สั่งเขียนแล้ว",
          text: result.message,
          icon: "success",
          timer: 2500,
          timerProgressBar: true,
          showConfirmButton: false,
        });
        await queryClient.invalidateQueries({ queryKey: seoArticleKeys.jobs() });
      } else {
        Swal.fire({
          title: "สั่งเขียนไม่สำเร็จ",
          text: result.message,
          icon: "error",
          timer: 2500,
          timerProgressBar: true,
          showConfirmButton: false,
        });
      }
    },
    onError: (error) => {
      Swal.fire({
        title: "เกิดข้อผิดพลาด",
        text: error instanceof Error ? error.message : "ไม่สามารถดำเนินการได้",
        icon: "error",
        timer: 2500,
        timerProgressBar: true,
        showConfirmButton: false,
      });
    },
  });
};
