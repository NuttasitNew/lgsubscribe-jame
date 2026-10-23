"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import Swal from "sweetalert2";
import { seoArticleKeys } from "./query-key";
import { syncGscMetricsNow } from "../server/sync-gsc-metrics-now.action";

/**
 * @description กด sync ผล Google Search Console ทันที แทนการรอ cron วันละรอบ (02:30 น.)
 * @page /super-admin/hurry-web/seo-article
 * @invalidates seo-article/metrics (ทุกบทความ — ข้อมูลใหม่กระทบทั้งกระดาน)
 */
export const useSyncGscMetricsNow = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      return await syncGscMetricsNow();
    },
    onSuccess: async (result) => {
      if (result.status === "ok") {
        const rows = result.data?.rows ?? 0;
        Swal.fire({
          title: rows > 0 ? `อัปเดตแล้ว ${rows} แถว` : "ยังไม่มีข้อมูลใหม่",
          text: result.message,
          icon: rows > 0 ? "success" : "info",
          timer: 2500,
          timerProgressBar: true,
          showConfirmButton: false,
        });
        // metrics ทุกบทความอาจเปลี่ยน → invalidate ทั้ง prefix ไม่ใช่รายตัว
        await queryClient.invalidateQueries({ queryKey: seoArticleKeys.allMetrics() });
      } else {
        Swal.fire({
          title: "เกิดข้อผิดพลาด",
          text: result.message,
          icon: "error",
          timer: 3500,
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
        timer: 3500,
        timerProgressBar: true,
        showConfirmButton: false,
      });
    },
  });
};
