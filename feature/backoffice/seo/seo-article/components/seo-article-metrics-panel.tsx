"use client";

import React from "react";
import { Loader2 } from "lucide-react";
import { useFindSeoArticleMetrics } from "../tanstack/find-seo-article-metrics.query";

/** สีอันดับ: 1-10 เขียว (หน้าแรก), 11-30 เหลือง (striking distance ควรปรับ), เกินนั้นเทา */
const positionClass = (position: number): string => {
  if (position <= 10) return "text-green-600";
  if (position <= 30) return "text-amber-600";
  return "text-gray-500";
};

/**
 * @description แผงผล GSC ของบทความ (28 วัน) — target keyword ติดอันดับเท่าไหร่ + query ที่ติดจริงทั้งหมด
 * @page /super-admin/hurry-web/seo-article
 * @parent {@link seo-article-review-dialog.tsx}, {@link seo-article-metrics-ranking-table.tsx}
 * @access super-admin
 * @props { seoArticleId: number, enabled: boolean } — enabled เฉพาะบทความ PUBLISHED
 * @dependencies
 * - useFindSeoArticleMetrics: ดึงผลจาก SeoSearchQueryDaily
 */
export const SeoArticleMetricsPanel = ({ seoArticleId, enabled }: { seoArticleId: number; enabled: boolean }) => {
  const { data: metricsRes, isLoading } = useFindSeoArticleMetrics(seoArticleId, enabled);

  if (!enabled) return null;
  if (isLoading) {
    return (
      <div className="flex items-center gap-2 rounded-md border border-gray-200 p-3 text-sm text-gray-500">
        <Loader2 className="size-4 animate-spin" /> กำลังโหลดผล Google Search Console...
      </div>
    );
  }

  const metrics = metricsRes?.status === "ok" ? metricsRes.data : null;
  // ยังไม่มีข้อมูล GSC (ยังไม่ sync / บทความเพิ่งขึ้น) — ต้องบอกผู้ใช้ ห้ามหายเงียบเป็นช่องว่าง
  if (!metrics) {
    return (
      <div className="rounded-md border border-dashed border-gray-200 p-3 text-sm text-gray-500">
        ยังไม่มีข้อมูลจาก Google Search Console สำหรับบทความนี้
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2 rounded-md border border-gray-200 p-3">
      <div className="flex items-center justify-between">
        <strong className="text-sm">
          ผลบน Google ({metrics.startDate} – {metrics.endDate})
        </strong>
        <span className="text-xs text-gray-500">
          {metrics.totalImpressions.toLocaleString()} impressions · {metrics.totalClicks.toLocaleString()} clicks
        </span>
      </div>

      <div className="rounded-md bg-gray-50 p-2 text-sm">
        <span className="text-gray-500">คำเป้าหมาย: </span>
        <strong>{metrics.targetKeyword ?? "— ยังไม่ได้กำหนด"}</strong>
        {metrics.target ? (
          <span className={`ml-2 font-semibold ${positionClass(metrics.target.avgPosition)}`}>
            อันดับ {metrics.target.avgPosition} ({metrics.target.impressions.toLocaleString()} imp,{" "}
            {metrics.target.clicks} คลิก)
          </span>
        ) : (
          <span className="ml-2 text-gray-400">ยังไม่พบข้อมูลคำนี้ในช่วงที่เลือก</span>
        )}
      </div>

      {metrics.topQueries.length > 0 ? (
        <div className="flex flex-col gap-1">
          <span className="text-xs text-gray-500">คำค้นที่บทความนี้ติดจริง (เรียงตาม impressions)</span>
          {metrics.topQueries.map((q) => (
            <div key={q.query} className="flex items-center justify-between gap-2 text-xs md:text-sm">
              <span className={q.isTarget ? "font-semibold text-blue-600" : ""}>
                {q.query}
                {q.isTarget && " ★"}
              </span>
              <span className="shrink-0 text-gray-500">
                <span className={`font-medium ${positionClass(q.avgPosition)}`}>#{q.avgPosition}</span> ·{" "}
                {q.impressions.toLocaleString()} imp · {q.clicks} คลิก
              </span>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-xs text-gray-400">
          ยังไม่มีข้อมูลจาก Google Search Console — บทความใหม่ใช้เวลา 2-6 สัปดาห์กว่าจะเริ่มมี impressions
        </p>
      )}
    </div>
  );
};
