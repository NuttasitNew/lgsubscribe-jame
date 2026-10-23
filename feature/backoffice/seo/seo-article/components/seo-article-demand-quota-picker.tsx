"use client";

import React from "react";
import { Minus, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  SEO_DEMAND_TIERS,
  SEO_DEMAND_TIER_LABEL,
  SEO_DEMAND_TIER_MAX_PER_TIER,
  type SeoDemandTier,
} from "../constant/seo-demand-tier";

interface SeoArticleDemandQuotaPickerProps {
  quota: Record<SeoDemandTier, number>;
  onChange: (tier: SeoDemandTier, count: number) => void;
}

/**
 * @description ตัวเลือก "อยากได้กี่หัวข้อในแต่ละระดับความต้องการ" — ขั้นเลือกหมวดของไดอะล็อกสั่งเขียนบทความ
 * @page /super-admin/hurry-web/seo-article
 * @parent {@link seo-article-category-generate-dialog.tsx}
 * @access super-admin
 * @props { quota, onChange }
 * @features
 * - บังคับสัดส่วนได้เอง — จุดสำคัญคือช่อง "ยังไม่มีใครถาม" ที่เปิดทางให้บริการราคาแพง/ของเฉพาะทาง
 *   ได้บทความบ้าง แทนที่จะได้แต่หัวข้อโซฟา/ที่นอนวนซ้ำทุกรอบ
 * - ตั้ง 0 ได้ = ข้ามระดับนั้นไปเลย
 * - ปุ่มหยุดที่เพดานให้เห็น ไม่ปล่อยให้กดต่อแล้วค่อยไปเด้ง error ตอนสั่ง
 */
export const SeoArticleDemandQuotaPicker = ({ quota, onChange }: SeoArticleDemandQuotaPickerProps) => {
  const total = SEO_DEMAND_TIERS.reduce((sum, tier) => sum + (quota[tier] ?? 0), 0);

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-baseline justify-between">
        <p className="text-xs font-medium md:text-sm">อยากได้หัวข้อระดับไหนบ้าง</p>
        <span className="text-[11px] text-muted-foreground md:text-xs">รวม {total} หัวข้อ</span>
      </div>

      <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
        {SEO_DEMAND_TIERS.map((tier) => {
          const meta = SEO_DEMAND_TIER_LABEL[tier];
          const count = quota[tier] ?? 0;
          return (
            <div key={tier} className="flex items-center justify-between gap-2 rounded-md border p-2">
              <div className="min-w-0">
                <p className="text-xs font-medium md:text-sm">{meta.label}</p>
                <p className="text-[11px] leading-tight text-muted-foreground">{meta.description}</p>
              </div>

              <div className="flex shrink-0 items-center gap-1">
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="h-7 w-7"
                  disabled={count <= 0}
                  onClick={() => onChange(tier, count - 1)}
                  aria-label={`ลดจำนวนหัวข้อระดับ${meta.label}`}
                >
                  <Minus className="h-3.5 w-3.5" />
                </Button>
                <span className="w-5 text-center text-sm font-semibold tabular-nums">{count}</span>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="h-7 w-7"
                  disabled={count >= SEO_DEMAND_TIER_MAX_PER_TIER}
                  onClick={() => onChange(tier, count + 1)}
                  aria-label={`เพิ่มจำนวนหัวข้อระดับ${meta.label}`}
                >
                  <Plus className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          );
        })}
      </div>

      <p className="text-[11px] leading-relaxed text-muted-foreground">
        ระดับ “ยังไม่มีใครถาม” = บริการที่ยังไม่เคยมีงานเลยในรอบปี — ระบบจะให้ AI ตัดสินจาก
        <b> ยอดคนค้นหาบน Google </b>
        แทนยอดขาย ถ้าหมวดนั้นไม่มีคำค้นรองรับจริง จะได้หัวข้อน้อยกว่าที่ขอ (ไม่ยัดให้ครบ)
      </p>
    </div>
  );
};
