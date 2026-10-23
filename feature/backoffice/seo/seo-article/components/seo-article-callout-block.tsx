"use client";

import React from "react";
import { createReactBlockSpec } from "@blocknote/react";
import { Info, Lightbulb, TriangleAlert } from "lucide-react";
import { cn } from "@/lib/utils";
import type { SeoArticleCalloutVariant } from "../type/seo-article-block.type";

/** หน้าตาของ callout แต่ละโทน — ป้ายกำกับใช้ภาษาไทยเพราะคนเขียนบทความเป็นแอดมินไทย */
const CALLOUT_VARIANT_UI: Record<
  SeoArticleCalloutVariant,
  { label: string; icon: typeof Info; box: string; iconColor: string }
> = {
  tip: {
    label: "เคล็ดลับ",
    icon: Lightbulb,
    box: "border-emerald-200 bg-emerald-50",
    iconColor: "text-emerald-600",
  },
  warn: {
    label: "ข้อควรระวัง",
    icon: TriangleAlert,
    box: "border-amber-200 bg-amber-50",
    iconColor: "text-amber-600",
  },
  info: {
    label: "ข้อมูลเพิ่มเติม",
    icon: Info,
    box: "border-sky-200 bg-sky-50",
    iconColor: "text-sky-600",
  },
};

/**
 * @description Block กำหนดเอง "กล่องเน้นข้อความ" (callout) ของโปรแกรมแก้ไขบทความ SEO
 * @page /super-admin/hurry-web/seo-article?edit=<id>
 * @access super-admin
 * @props { variant: "tip" | "warn" | "info" } — เก็บใน block.props ตรงกับ field `variant` ของสเปก v2
 * @features
 * - 3 โทน: เคล็ดลับ (เขียว) / ข้อควรระวัง (เหลือง) / ข้อมูลเพิ่มเติม (ฟ้า)
 * - คลิกที่ไอคอนเพื่อวนเปลี่ยนโทน — ไม่ต้องลบกล่องแล้วสร้างใหม่
 * - เนื้อหาเป็น inline content → พิมพ์ตัวหนา/เอียง/ลิงก์ในกล่องได้ และลากสลับตำแหน่งได้เหมือน block อื่น
 * @related
 * - สเปก block: {@link ../type/seo-article-block.type.ts}
 * - schema ของ editor: {@link seo-article-editor-schema.ts}
 */
export const seoArticleCalloutBlock = createReactBlockSpec(
  {
    type: "callout",
    content: "inline",
    propSchema: {
      variant: { default: "tip" as const, values: ["tip", "warn", "info"] as const },
    },
  },
  {
    render: ({ block, editor, contentRef }) => {
      const variant = (block.props.variant || "tip") as SeoArticleCalloutVariant;
      const ui = CALLOUT_VARIANT_UI[variant] ?? CALLOUT_VARIANT_UI.tip;
      const Icon = ui.icon;

      const variants = Object.keys(CALLOUT_VARIANT_UI) as SeoArticleCalloutVariant[];
      const nextVariant = variants[(variants.indexOf(variant) + 1) % variants.length];

      return (
        <div className={cn("my-1 flex w-full gap-3 rounded-lg border p-3", ui.box)}>
          <button
            type="button"
            title={`โทน: ${ui.label} (คลิกเพื่อเปลี่ยน)`}
            // contentEditable=false กันไม่ให้ ProseMirror มองปุ่มเป็นเนื้อหาที่พิมพ์ทับได้
            contentEditable={false}
            className="h-fit shrink-0 rounded p-0.5 hover:bg-black/5"
            onClick={() => editor.updateBlock(block, { props: { variant: nextVariant } })}
          >
            <Icon className={cn("size-5", ui.iconColor)} />
          </button>
          <div className="min-w-0 flex-1">
            <p contentEditable={false} className="mb-0.5 text-xs font-medium text-muted-foreground">
              {ui.label}
            </p>
            <div ref={contentRef} className="text-sm" />
          </div>
        </div>
      );
    },
  }
);
