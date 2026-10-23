"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import Swal from "sweetalert2";
import { askAnswerFaqKeys } from "./query-key";
import { rejectAskAnswerFaq, type RejectAskAnswerFaqParams } from "../server/reject-ask-answer-faq.action";

/**
 * @description ปัดตกข้อถาม-ตอบที่ AI เสนอ (เก็บไว้ในฐานเพื่อกันเสนอซ้ำ)
 * @page /super-admin/hurry-web/seo-article?section=faq
 * @invalidates ask-answer-faq/list
 */
export const useRejectAskAnswerFaq = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: RejectAskAnswerFaqParams) => await rejectAskAnswerFaq(params),
    onSuccess: async (result) => {
      if (result.status === "ok") {
        await queryClient.invalidateQueries({ queryKey: askAnswerFaqKeys.lists() });
        return;
      }
      Swal.fire({
        title: "ปัดตกไม่สำเร็จ",
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
