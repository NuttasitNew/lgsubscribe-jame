"use client";

import React from "react";
import { Coins, MousePointerClick, Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import { SEO_DEMAND_TIER_LABEL, type SeoDemandTier } from "../constant/seo-demand-tier";
import type { SeoCategoryTopicSuggestion } from "../type/category-topic-suggestion.type";

/** สีป้ายระดับ — ไล่จากของขายดี (เขียว) ไปของที่ยังไม่มีใครถาม (ม่วง = ช่องว่างที่น่าลอง) */
const TIER_BADGE_CLASS: Record<SeoDemandTier, string> = {
  HIGH: "border-emerald-300 bg-emerald-50 text-emerald-700",
  MEDIUM: "border-sky-300 bg-sky-50 text-sky-700",
  LOW: "border-amber-300 bg-amber-50 text-amber-700",
  UNTAPPED: "border-violet-300 bg-violet-50 text-violet-700",
};

interface SeoArticleTopicSuggestionListProps {
  suggestions: SeoCategoryTopicSuggestion[];
  selectedKeywords: string[];
  onToggle: (targetKeyword: string) => void;
}

/**
 * @description ขั้นที่ 2 ของไดอะล็อกสั่งเขียนบทความ — รายการหัวข้อที่ AI เสนอ ให้ติ๊กเลือกก่อนสั่งเขียน
 * @page /super-admin/hurry-web/seo-article
 * @parent {@link seo-article-category-generate-dialog.tsx}
 * @access super-admin
 * @props { suggestions, selectedKeywords, onToggle }
 * @features
 * - แต่ละหัวข้อโชว์คำเป้าหมาย + เหตุผลที่ AI เลือก + เงินค่าโฆษณาที่คำนั้นเผาไปใน 90 วัน
 *   เพื่อให้คนตัดสินใจได้ว่าเรื่องไหนคุ้มก่อน ไม่ใช่เดาจากชื่อหัวข้อ
 * - คำที่ไม่มีข้อมูลโฆษณารองรับ (0 บาท) ไม่โชว์ป้ายตัวเลข — แสดงตามจริงว่าเป็นคำที่ AI คิดขึ้นเอง
 * - ทั้งแถวคลิกได้ ไม่ใช่แค่ช่องติ๊ก (เป้าคลิกใหญ่ กดพลาดยาก)
 */
export const SeoArticleTopicSuggestionList = ({
  suggestions,
  selectedKeywords,
  onToggle,
}: SeoArticleTopicSuggestionListProps) => {
  return (
    <div className="flex flex-col gap-2">
      {suggestions.map((suggestion) => {
        const isSelected = selectedKeywords.includes(suggestion.targetKeyword);
        return (
          <button
            key={suggestion.targetKeyword}
            type="button"
            onClick={() => onToggle(suggestion.targetKeyword)}
            className={cn(
              "flex gap-3 rounded-lg border p-3 text-left transition-colors",
              isSelected ? "border-primary bg-primary/5" : "hover:border-primary/40 hover:bg-muted/50"
            )}
          >
            <Checkbox checked={isSelected} className="mt-0.5 shrink-0" tabIndex={-1} aria-hidden />

            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-sm font-semibold md:text-base">{suggestion.topic}</p>
                <Badge variant="outline" className={TIER_BADGE_CLASS[suggestion.demandTier]}>
                  {SEO_DEMAND_TIER_LABEL[suggestion.demandTier].label}
                </Badge>
              </div>

              <p className="mt-1 text-[11px] text-muted-foreground md:text-xs">
                คำเป้าหมาย: <span className="font-medium text-foreground">{suggestion.targetKeyword}</span>
              </p>

              <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground md:text-xs">{suggestion.reason}</p>

              <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground md:text-xs">
                {suggestion.adCostBaht > 0 && (
                  <>
                    <span className="inline-flex items-center gap-1">
                      <Coins className="h-3 w-3" />
                      ค่าโฆษณา 90 วัน {suggestion.adCostBaht.toLocaleString()} บาท
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <MousePointerClick className="h-3 w-3" />
                      {suggestion.adClicks.toLocaleString()} คลิก
                    </span>
                  </>
                )}

                {/* ยอดค้นหาคือตัวตัดสินของหัวข้อระดับ "ยังไม่มีใครถาม" — 0 = ไม่มีข้อมูลรองรับ ต้องบอกตรง ๆ
                    ไม่ใช่ซ่อนแถว ไม่งั้นคนจะเข้าใจว่าทุกหัวข้อมีดีมานด์เท่ากันหมด */}
                <div className="text-xs text-muted-foreground">
                  Keyword Planner:{" "}
                  {suggestion.avgMonthlySearches != null
                    ? `ประมาณ ${suggestion.avgMonthlySearches.toLocaleString()} ครั้ง/เดือน`
                    : "ยังไม่มีข้อมูลยอดค้นหา"}
                  {` · Ads 90 วัน: ${(suggestion.adImpressions ?? 0).toLocaleString()} impressions`}
                </div>
                {suggestion.searchImpressions > 0 ? (
                  <span className="inline-flex items-center gap-1">
                    <Search className="h-3 w-3" />
                    Organic 28 วัน: {suggestion.searchImpressions.toLocaleString()} impressions
                    {suggestion.organicPosition != null
                      ? ` · อันดับเราเฉลี่ย ${suggestion.organicPosition}`
                      : " · เรายังไม่พบข้อมูลอันดับ"}
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-amber-700">
                    <Search className="h-3 w-3" />
                    ยังไม่พบ impressions ออร์แกนิกของคำนี้ในข้อมูล 28 วัน
                  </span>
                )}
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
};
