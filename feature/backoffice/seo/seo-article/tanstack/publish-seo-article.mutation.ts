"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import Swal from "sweetalert2";
import { seoArticleKeys } from "./query-key";
import { publishSeoArticle } from "../server/publish-seo-article.action";

/**
 * @description เผยแพร่บทความ SEO — push ไป repo hurry-web แล้วอัปเดตสถานะ PUBLISHED
 * @page /super-admin/hurry-web/seo-article
 * @invalidates seo-article/list (ทุกหน้า) + seo-article/detail + seo-article/overview
 */
export const usePublishSeoArticle = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: { seoArticleId: number }) => {
      return await publishSeoArticle(params);
    },
    onSuccess: async (result, variables) => {
      if (result.status === "ok") {
        Swal.fire({
          title: "เผยแพร่สำเร็จ",
          text: result.message,
          icon: "success",
          timer: 2500,
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
