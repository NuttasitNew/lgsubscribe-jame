"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import Swal from "sweetalert2";
import { seoArticleKeys } from "./query-key";
import { deleteSeoArticle } from "../server/delete-seo-article.action";

/**
 * @description Mutation ลบบทความ SEO (soft delete) — หายจากหน้ารายการ และซ่อนบนเว็บถ้าเคยเผยแพร่แล้ว
 * @page /super-admin/hurry-web/seo-article
 * @invalidates seoArticleKeys.all — ทั้งหน้ารายการและตัวเลขสรุปด้านบนต้องหายไปพร้อมกัน
 * @logic
 * - สำเร็จแล้วเด้งแจ้งสั้น ๆ เพราะบทความหายไปจากจอ ต้องยืนยันให้ผู้ใช้รู้ว่าลบสำเร็จจริง ไม่ใช่จอค้าง
 *   ข้อความต่างกันตามว่าไปซ่อนบนเว็บด้วยหรือไม่ (ผู้ใช้ต้องรู้ว่า URL บนเว็บโดนด้วย)
 */
export const useDeleteSeoArticle = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: seoArticleKeys.delete(),
    mutationFn: async (params: { seoArticleId: number }) => await deleteSeoArticle(params),
    onSuccess: (result) => {
      if (result.status !== "ok") {
        Swal.fire({
          title: "ลบไม่สำเร็จ",
          text: result.message,
          icon: "error",
          timer: 4000,
          timerProgressBar: true,
          showConfirmButton: false,
        });
        return;
      }

      void queryClient.invalidateQueries({ queryKey: seoArticleKeys.all() });

      Swal.fire({
        title: "ลบบทความแล้ว",
        text: result.data?.hiddenOnWeb ? "ซ่อนออกจากหน้า /blog เรียบร้อย" : undefined,
        icon: "success",
        timer: 2500,
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
