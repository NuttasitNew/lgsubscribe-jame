"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import Swal from "sweetalert2";
import { askAnswerFaqKeys } from "./query-key";
import { updateAskAnswerFaq, type UpdateAskAnswerFaqParams } from "../server/update-ask-answer-faq.action";

/**
 * @description บันทึกข้อความที่แก้ของข้อถาม-ตอบ (ยังไม่ขึ้นเว็บ)
 * @page /super-admin/hurry-web/seo-article?section=faq
 * @invalidates ask-answer-faq/list — ทุกตัวกรอง (ข้อเดียวโผล่ได้หลาย list)
 * @logic สำเร็จไม่เด้ง Swal — การ์ดปิดโหมดแก้ไขเองก็เห็นผลแล้ว เด้ง popup ทุกครั้งที่กดบันทึกน่ารำคาญ
 */
export const useUpdateAskAnswerFaq = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: UpdateAskAnswerFaqParams) => await updateAskAnswerFaq(params),
    onSuccess: async (result) => {
      if (result.status === "ok") {
        await queryClient.invalidateQueries({ queryKey: askAnswerFaqKeys.lists() });
        return;
      }
      Swal.fire({
        title: "บันทึกไม่สำเร็จ",
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
