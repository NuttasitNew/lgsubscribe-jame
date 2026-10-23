"use client";

import React, { useLayoutEffect, useRef } from "react";
import { cn } from "@/lib/utils";

interface SeoArticleAutoGrowTextareaProps extends Omit<
  React.TextareaHTMLAttributes<HTMLTextAreaElement>,
  "rows" | "value" | "onChange"
> {
  value: string;
  onValueChangeAction: (value: string) => void;
  /** ความสูงต่ำสุด (px) — กันช่องแบนจนอ่านไม่ออกตอนยังไม่มีข้อความ */
  minHeightPx?: number;
}

/**
 * @description ช่องพิมพ์ข้อความที่ยืดความสูงตามเนื้อหาเอง — ใช้ในผืนแก้ไขบทความที่ต้องดูเป็น "ข้อความจริง" ไม่ใช่ช่องกรอก
 * @page /super-admin/hurry-web/seo-article?edit=<id>
 * @access super-admin
 * @parent {@link seo-article-title-field.tsx}, {@link seo-article-faq-editor.tsx}
 * @props { value: string, onValueChangeAction: (value: string) => void, minHeightPx?: number }
 * @features
 * - ยืด/หดความสูงตามจำนวนบรรทัดทุกครั้งที่ค่าเปลี่ยน (ไม่มีสกรอลล์ในตัวช่อง = อ่านคำตอบยาว ๆ ได้ครบ)
 * - ไม่มีกรอบเป็นค่าเริ่มต้น ผู้เรียกเป็นคนกำหนดสไตล์เองผ่าน className
 * @logic
 * - ตั้ง height เป็น "auto" ก่อนอ่าน scrollHeight เสมอ ไม่งั้นช่องจะยืดอย่างเดียวไม่ยอมหด
 * - ใช้ useLayoutEffect เพื่อปรับความสูงก่อนเบราว์เซอร์วาด ผู้ใช้จะได้ไม่เห็นช่องกระพริบ
 * @dependencies ไม่มี (local state ล้วน)
 */
export const SeoArticleAutoGrowTextarea = ({
  value,
  onValueChangeAction,
  minHeightPx = 0,
  className,
  ...rest
}: SeoArticleAutoGrowTextareaProps) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useLayoutEffect(() => {
    const element = textareaRef.current;
    if (!element) return;

    // ต้องรีเซ็ตเป็น auto ก่อน ไม่งั้น scrollHeight จะค้างที่ความสูงเดิม (ช่องยืดแล้วไม่หด)
    element.style.height = "auto";
    element.style.height = `${Math.max(element.scrollHeight, minHeightPx)}px`;
  }, [value, minHeightPx]);

  return (
    <textarea
      ref={textareaRef}
      value={value}
      rows={1}
      onChange={(event) => onValueChangeAction(event.target.value)}
      className={cn(
        "w-full resize-none overflow-hidden bg-transparent outline-none placeholder:text-muted-foreground/60",
        className
      )}
      {...rest}
    />
  );
};
