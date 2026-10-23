"use client";

import { useMutation } from "@tanstack/react-query";
import Swal from "sweetalert2";
import { discardSeoArticleDraft } from "../server/discard-seo-article-draft.action";

/**
 * @description ทิ้งร่างที่ค้างอยู่ของบทความ (ล้าง draftJson) — ปุ่ม "ทิ้งที่แก้" ในหน้าแก้ไข
 * @page /super-admin/hurry-web/seo-article?edit=<id>
 * @invalidates ไม่ invalidate — หน้าแก้ไขคืนเนื้อหาเป็น baseline ที่ถืออยู่แล้ว ไม่ต้องโหลดใหม่ให้จอกระพริบ
 * @logic
 * - สำเร็จไม่เด้งอะไร เพราะเนื้อหาบนจอกลับไปเป็นของจริงให้เห็นอยู่แล้ว
 * - ล้มเหลวต้องแจ้ง — ผู้ใช้เห็นจอกลับเป็นของจริงแล้วนึกว่าทิ้งสำเร็จ แต่ร่างยังค้างในฐาน
 *   เปิดหน้าใหม่จะเจอร่างเดิมกลับมาอีก ต้องรู้ว่าให้กดซ้ำ
 */
export const useDiscardSeoArticleDraft = () => {
  return useMutation({
    mutationFn: async (seoArticleId: number) => {
      return await discardSeoArticleDraft(seoArticleId);
    },
    onSuccess: (result) => {
      if (result.status === "ok") return;
      Swal.fire({
        title: "ทิ้งร่างไม่สำเร็จ",
        text: result.message,
        icon: "error",
        timer: 3000,
        timerProgressBar: true,
        showConfirmButton: false,
      });
    },
  });
};
