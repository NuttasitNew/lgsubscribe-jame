"use client";

import { useMutation } from "@tanstack/react-query";
import { saveSeoArticleDraft, type SaveSeoArticleDraftParams } from "../server/save-seo-article-draft.action";

/**
 * @description autosave ร่างที่กำลังแก้ลงฐาน (ช่อง draftJson) — ยิงจาก effect ที่ debounce แล้วในหน้าแก้ไข
 * @page /super-admin/hurry-web/seo-article?edit=<id>
 * @invalidates ไม่ invalidate อะไรเลย — **ตั้งใจ** เพราะ detail ที่ refetch มาจะดึงร่างเก่ากลับมาทับที่กำลังพิมพ์อยู่
 *              ร่างที่เพิ่งเซฟคือของที่อยู่บนหน้าจอแล้ว ไม่ต้องโหลดกลับมาอีก
 * @logic
 * - **เงียบสนิททั้งสำเร็จและล้มเหลว** — autosave ยิงทุก 2 วินาทีระหว่างพิมพ์ ถ้าเด้ง Swal จะรบกวนจนใช้งานไม่ได้
 *   ผู้ใช้รู้สถานะจากป้าย "เก็บร่างแล้วเมื่อ ..." บนหัวหน้าแทน (ไม่ขยับ = เซฟไม่ผ่าน)
 * - เน็ตหลุดชั่วคราวไม่ใช่เรื่องใหญ่ เพราะรอบถัดไป (อีก 2 วิ) ส่งร่างล่าสุดทั้งก้อนไปใหม่อยู่แล้ว
 */
export const useSaveSeoArticleDraft = () => {
  return useMutation({
    mutationFn: async (params: SaveSeoArticleDraftParams) => {
      return await saveSeoArticleDraft(params);
    },
  });
};
