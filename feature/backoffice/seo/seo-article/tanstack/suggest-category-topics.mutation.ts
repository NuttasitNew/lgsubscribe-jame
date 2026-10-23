"use client";

import { useMutation } from "@tanstack/react-query";
import Swal from "sweetalert2";
import {
  suggestCategoryTopicsAction,
  type SuggestCategoryTopicsParams,
} from "../server/suggest-category-topics.action";

/**
 * @description ขอให้ AI เสนอหัวข้อบทความจากหมวดบริการที่เลือก (~10-20 วินาที)
 * @page /super-admin/hurry-web/seo-article
 * @logic
 * - เป็น mutation ไม่ใช่ query เพราะยิงตอนกดปุ่มเท่านั้น และผลลัพธ์ต่างกันทุกครั้ง (AI) จึงไม่ควร cache
 * - ไม่ invalidate อะไรเลย — ขั้นนี้ยังไม่บันทึกลงฐานข้อมูล เป็นแค่ข้อเสนอให้ผู้ใช้เลือก
 * - สำเร็จแล้วไม่เด้ง Swal เพราะหัวข้อที่ได้จะแสดงในไดอะล็อกอยู่แล้ว เด้งซ้ำจะบังของที่เพิ่งขึ้นมา
 */
export const useSuggestCategoryTopics = () => {
  return useMutation({
    mutationFn: async (params: SuggestCategoryTopicsParams) => {
      return await suggestCategoryTopicsAction(params);
    },
    onSuccess: (result) => {
      if (result.status !== "ok") {
        Swal.fire({
          title: "เสนอหัวข้อไม่สำเร็จ",
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
