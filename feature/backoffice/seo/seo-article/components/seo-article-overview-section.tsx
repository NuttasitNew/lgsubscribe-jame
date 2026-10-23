"use client";

import React, { useMemo } from "react";
import { SeoArticleStatus } from "@prisma/client";
import { Loader2, MessagesSquare, Target } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { useFindSeoArticleOverview } from "../tanstack/find-seo-article-overview.query";
import type { SeoArticleSectionKey } from "../type/seo-article-section.type";

/**
 * @description Section ภาพรวมบทความ SEO — สรุปจำนวนตามสถานะ + กาง "หัวข้อที่ลูกค้าถามจากแชท" (sourceTopics) ทั้งชุด
 * @page /super-admin/hurry-web/seo-article
 * @parent {@link seo-article-hub-main.tsx}
 * @access super-admin
 * @props { onGoToSection: (section: SeoArticleSectionKey) => void } — คลิกตัวเลขสรุปแล้วกระโดดไป section รายการ
 * @features
 * - การ์ดสรุป 4 ใบ (รอรีวิว/เผยแพร่แล้ว/ปัดตก/ทั้งหมด) คลิกได้
 * - บอกวันของแชทที่เป็นต้นเรื่องของร่างล่าสุด (ดูได้ว่า cron ตี 5 ยังเดินอยู่ไหม)
 * - กาง sourceTopics ทั้ง array ของบทความล่าสุด — เดิมการ์ดโชว์แค่หัวข้อแรกแล้วทิ้งที่เหลือ
 * @dependencies
 * - useFindSeoArticleOverview: ยิงครั้งเดียว ได้ทั้งจำนวนต่อสถานะ (นับด้วย groupBy ฝั่ง DB) และหัวข้อล่าสุด
 *   (ตั้งแต่ list แบ่งหน้าฝั่ง server แล้ว จะนับจำนวนจาก array ที่ได้มาไม่ได้อีก)
 */
export const SeoArticleOverviewSection = ({
  onGoToSection,
}: {
  onGoToSection: (section: SeoArticleSectionKey) => void;
}) => {
  const { data: overviewRes, isLoading } = useFindSeoArticleOverview();

  const overview = overviewRes?.status === "ok" ? overviewRes.data : null;
  const recentTopics = useMemo(() => overview?.recentTopics ?? [], [overview]);

  const summary = useMemo(
    () => ({
      draft: overview?.counts[SeoArticleStatus.DRAFT] ?? 0,
      published: overview?.counts[SeoArticleStatus.PUBLISHED] ?? 0,
      rejected: overview?.counts[SeoArticleStatus.REJECTED] ?? 0,
      total: overview?.total ?? 0,
      // หัวข้อเรียงตามบทความใหม่→เก่ามาจาก server แล้ว — ตัวแรกคือร่างล่าสุด
      latestSourceDate: recentTopics[0]?.sourceDate ?? null,
    }),
    [overview, recentTopics]
  );

  const summaryCards: { key: SeoArticleSectionKey; label: string; value: number; className: string }[] = [
    { key: "draft", label: "รอรีวิว", value: summary.draft, className: "text-amber-600" },
    { key: "published", label: "เผยแพร่แล้ว", value: summary.published, className: "text-green-600" },
    { key: "rejected", label: "ปัดตก", value: summary.rejected, className: "text-muted-foreground" },
    { key: "all", label: "ทั้งหมด", value: summary.total, className: "text-primary" },
  ];

  if (isLoading) {
    return (
      <Card className="flex items-center justify-center p-12">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {/* ===== การ์ดสรุปจำนวนตามสถานะ ===== */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {summaryCards.map((card) => (
          <Card key={card.key} className="p-0">
            <button
              type="button"
              onClick={() => onGoToSection(card.key)}
              className="flex w-full flex-col items-start gap-1 p-4 text-left transition-colors hover:bg-muted"
            >
              <span className="text-xs text-muted-foreground">{card.label}</span>
              <span className={`text-2xl font-bold ${card.className}`}>{card.value}</span>
            </button>
          </Card>
        ))}
      </div>

      {/* ===== สถานะ pipeline ร่างอัตโนมัติ ===== */}
      <Card className="p-4">
        <p className="text-sm text-muted-foreground">
          กด “สร้างบทความ” เพื่อให้ AI เขียนจากหมวดสินค้าหรือโจทย์ที่พิมพ์เอง —{" "}
          {summary.latestSourceDate ? (
            <>
              ร่างล่าสุดสร้างเมื่อ <strong className="text-foreground">{summary.latestSourceDate}</strong>
            </>
          ) : (
            <span className="text-foreground">ยังไม่เคยมีร่างในระบบ</span>
          )}
        </p>
      </Card>

      {/* ===== หัวข้อที่ลูกค้าถามจากแชท (กาง sourceTopics ทั้งชุด) ===== */}
      <Card className="flex flex-col gap-3 p-4">
        <div className="flex items-center gap-2">
          <MessagesSquare className="h-4 w-4 text-primary" />
          <strong className="text-sm">หัวข้อที่ AI ใช้เขียน (จากบทความล่าสุด)</strong>
        </div>

        {recentTopics.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            ยังไม่มีบทความ — กด “สร้างบทความ” ที่มุมขวาบน
          </p>
        ) : (
          <div className="flex flex-col divide-y divide-border/60">
            {recentTopics.map((topic, index) => (
              <div key={`${topic.seoArticleId}-${index}`} className="flex flex-col gap-1 py-2">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-medium">{topic.topic}</span>
                  <Badge variant="secondary" className="shrink-0">
                    ถาม {topic.count} ครั้ง
                  </Badge>
                  {topic.targetKeyword && (
                    <span className="inline-flex items-center gap-1 text-xs font-medium text-blue-600">
                      <Target className="h-3 w-3" />
                      {topic.targetKeyword}
                    </span>
                  )}
                </div>
                <span className="text-xs text-muted-foreground">
                  คำค้นที่เกี่ยว: {topic.keywords.length > 0 ? topic.keywords.join(", ") : "—"}
                </span>
                <span className="text-xs text-muted-foreground/80">
                  จากร่าง “{topic.articleTitle}” ({topic.sourceDate})
                </span>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
};
