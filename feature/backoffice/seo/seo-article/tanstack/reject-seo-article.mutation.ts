"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import Swal from "sweetalert2";
import { seoArticleKeys } from "./query-key";
import { rejectSeoArticle } from "../server/reject-seo-article.action";

/**
 * @description ปัดตกร่างบทความ SEO (เก็บ record ไว้ กัน AI เสนอซ้ำ)
 * @page /super-admin/hurry-web/seo-article
 * @invalidates seo-article/list (ทุกหน้า) + seo-article/detail + seo-article/overview
 */
export const useRejectSeoArticle = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: { seoArticleId: number; reason?: string }) => {
      return await rejectSeoArticle(params);
    },
    onSuccess: async (result, variables) => {
      if (result.status === "ok") {
        Swal.fire({
          title: "ปัดตกร่างแล้ว",
          icon: "success",
          timer: 1500,
          timerProgressBar: true,
          showConfirmButton: false,
        });
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: seoArticleKeys.lists() }),
          queryClient.invalidateQueries({ queryKey: seoArticleKeys.detail(variables.seoArticleId) }),
          queryClient.invalidateQueries({ queryKey: seoArticleKeys.overview() }),
        ]);
      } else {
        Swal.fire({
          title: "เกิดข้อผิดพลาด",
          text: result.message,
          icon: "error",
          timer: 1500,
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
        timer: 1500,
        timerProgressBar: true,
        showConfirmButton: false,
      });
    },
  });
};
