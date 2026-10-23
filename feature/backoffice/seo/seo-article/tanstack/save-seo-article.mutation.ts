"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import Swal from "sweetalert2";
import { seoArticleKeys } from "./query-key";
import { saveSeoArticle, type SaveSeoArticleParams } from "../server/save-seo-article.action";

/**
 * @description บันทึกบทความ SEO (meta + เนื้อหาโครง block) — ใช้แทน useUpdateSeoArticle เดิม
 * @page /super-admin/hurry-web/seo-article
 * @logic
 * - ต้องส่ง `expectedUpdatedAt` = updatedAt ที่โหลดมา ถ้าชนกับคนอื่น server จะคืน [SEO-SAVE-06]
 *   → ที่นี่ invalidate detail ให้อัตโนมัติ เพื่อให้ผู้ใช้กดดูฉบับล่าสุดได้ทันที
 * - สำเร็จแล้ว invalidate detail (ได้ updatedAt ใหม่ไปใช้เซฟรอบถัดไป) + list + overview
 * @invalidates seo-article/detail, seo-article/list, seo-article/overview
 */
export const useSaveSeoArticle = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: SaveSeoArticleParams) => {
      return await saveSeoArticle(params);
    },
    onSuccess: async (result, variables) => {
      if (result.status === "ok") {
        Swal.fire({
          title: "บันทึกบทความแล้ว",
          icon: "success",
          timer: 1500,
          timerProgressBar: true,
          showConfirmButton: false,
        });
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: seoArticleKeys.detail(variables.seoArticleId) }),
          queryClient.invalidateQueries({ queryKey: seoArticleKeys.lists() }),
          queryClient.invalidateQueries({ queryKey: seoArticleKeys.overview() }),
        ]);
      } else {
        Swal.fire({
          title: "เกิดข้อผิดพลาด",
          text: result.message,
          icon: "error",
          timer: 2500,
          timerProgressBar: true,
          showConfirmButton: false,
        });
        // ชนกับคนอื่น (หรือข้อมูลเก่า) → ดึงฉบับล่าสุดมาไว้ให้พร้อมเทียบ
        await queryClient.invalidateQueries({ queryKey: seoArticleKeys.detail(variables.seoArticleId) });
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
