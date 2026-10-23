"use client";

import React from "react";
import { useSeoArticleEditorStore } from "../zustand/seo-article-editor.store";
import { SeoArticleAutoGrowTextarea } from "./seo-article-auto-grow-textarea";

/**
 * @description ชื่อบทความ (H1) บนแถบรูปหัวบทความ — แก้ในที่ได้เลย หน้าตาเหมือนที่ผู้อ่านเห็นบนเว็บ
 * @page /super-admin/hurry-web/seo-article?edit=<id>
 * @access super-admin
 * @parent {@link seo-article-cover-banner.tsx}
 * @features
 * - คลิกแล้วพิมพ์ทับได้ทันที ไม่ต้องไปหาช่องกรอกที่อื่น
 * - ตัวอักษรสีเหลืองแบรนด์บนพื้นรูปที่หรี่ลง — ชุดเดียวกับ image-header-blog.tsx ของ hurry-web
 *   (text-2xl → md:text-3xl → lg:text-4xl, font-semibold, สี rgb(243 193 82))
 * @dependencies useSeoArticleEditorStore (selector ทีละ field ตามกฎ ห้าม destructure ทั้ง store)
 * @related หน้าจริงบนเว็บ: hurry-web `app/[locale]/blog/_components/image-header-blog.tsx`
 */
export const SeoArticleTitleField = () => {
  const title = useSeoArticleEditorStore((state) => state.draft?.title ?? "");
  const patchDraft = useSeoArticleEditorStore((state) => state.patchDraft);

  return (
    <SeoArticleAutoGrowTextarea
      value={title}
      onValueChangeAction={(value) => patchDraft({ title: value })}
      placeholder="ชื่อบทความที่ผู้อ่านเห็นเป็นหัวเรื่องใหญ่"
      aria-label="ชื่อบทความ (H1 บนเว็บ)"
      spellCheck={false}
      className="text-2xl font-semibold leading-snug text-[rgb(243,193,82)] placeholder:text-white/50 md:text-3xl lg:text-4xl"
    />
  );
};
