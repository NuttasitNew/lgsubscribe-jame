"use client";

import dynamic from "next/dynamic";
import { Loader2 } from "lucide-react";

/**
 * @description ตัวห่อ dynamic import ของโปรแกรมแก้ไขบทความ — บังคับให้โหลดเฉพาะฝั่งเบราว์เซอร์
 * @page /super-admin/hurry-web/seo-article?edit=<id>
 * @access super-admin
 * @parent {@link seo-article-editor-page.tsx}
 * @logic
 * - `ssr: false` จำเป็นเพราะ BlockNote/ProseMirror แตะ document ตอนสร้าง instance → render ฝั่ง server จะพัง
 * - ต้องประกาศในไฟล์ที่มี "use client" เท่านั้น (Next 15 ห้ามใช้ ssr:false ใน Server Component)
 * - ผลพลอยได้: ก้อน editor (~250KB gzip) แยกเป็น chunk ต่างหาก โหลดเฉพาะตอนเข้าโหมดแก้ ไม่ถ่วงหน้ารายการ
 * @related {@link seo-article-block-editor.tsx}
 */
export const SeoArticleBlockEditorClient = dynamic(() => import("./seo-article-block-editor"), {
  ssr: false,
  loading: () => (
    <div className="flex h-64 items-center justify-center gap-2 rounded-lg bg-muted text-sm text-muted-foreground">
      <Loader2 className="size-4 animate-spin" />
      กำลังเปิดโปรแกรมแก้ไข...
    </div>
  ),
});
