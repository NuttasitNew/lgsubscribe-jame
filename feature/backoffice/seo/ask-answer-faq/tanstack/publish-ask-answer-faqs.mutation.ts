"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import Swal from "sweetalert2";
import { askAnswerFaqKeys } from "./query-key";
import { publishAskAnswerFaqs, type PublishAskAnswerFaqsParams } from "../server/publish-ask-answer-faqs.action";

/**
 * @description เผยแพร่ข้อถาม-ตอบที่เลือกขึ้นหน้าเว็บจริง (push ไฟล์ th + en เข้า repo hurry-web)
 * @page /super-admin/hurry-web/seo-article?section=faq
 * @invalidates ask-answer-faq/list
 * @logic
 * - สำเร็จ **ต้องเด้ง Swal** ต่างจาก mutation อื่นในหมวดนี้ — งานนี้ทำให้เว็บจริง deploy ใหม่
 *   ผู้ใช้ต้องได้ยินยืนยันว่าอะไรขึ้นไปแล้ว และรู้ว่ายังต้องรอ deploy อีก 2-3 นาที
 * - ข้อความเตือน (ไฟล์ en ไม่อัปเดต / ยังไม่มีฉบับอังกฤษ) มาในข้อความจาก action แล้ว
 *   จึงใช้ icon warning เมื่อ result มี enWarning
 */
export const usePublishAskAnswerFaqs = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: PublishAskAnswerFaqsParams) => await publishAskAnswerFaqs(params),
    onSuccess: async (result) => {
      if (result.status === "ok") {
        await queryClient.invalidateQueries({ queryKey: askAnswerFaqKeys.lists() });
        Swal.fire({
          title: result.data?.enWarning ? "เผยแพร่แล้ว (มีข้อควรทราบ)" : "เผยแพร่สำเร็จ",
          text: result.message,
          icon: result.data?.enWarning ? "warning" : "success",
        });
        return;
      }
      Swal.fire({
        title: "เผยแพร่ไม่สำเร็จ",
        text: result.message,
        icon: "error",
      });
    },
    onError: (error) => {
      Swal.fire({
        title: "เกิดข้อผิดพลาด",
        text: error instanceof Error ? error.message : "ไม่สามารถดำเนินการได้",
        icon: "error",
      });
    },
  });
};
