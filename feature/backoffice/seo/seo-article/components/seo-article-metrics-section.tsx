"use client";

import React, { useState } from "react";
import { Info, Loader2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useSyncGscMetricsNow } from "../tanstack/sync-gsc-metrics-now.mutation";
import { SeoArticleMetricsRankingTable } from "./seo-article-metrics-ranking-table";
import { SEO_ARTICLE_PAGE_SIZES } from "./seo-article-pagination-bar";

/** จำนวนบทความต่อหน้าเริ่มต้น — ต้องเป็นค่าที่มีใน SEO_ARTICLE_PAGE_SIZES ไม่งั้น dropdown จะว่าง */
const DEFAULT_METRICS_PAGE_SIZE = SEO_ARTICLE_PAGE_SIZES[1];

/**
 * @description Section "ผลบน Google" — ตารางผล GSC ของบทความที่เผยแพร่ทุกเรื่อง เรียงคลิกมาก→น้อย แบ่งหน้า
 * @page /super-admin/hurry-web/seo-article
 * @parent {@link seo-article-hub-main.tsx}
 * @access super-admin
 * @props ไม่มี — คุมหน้า/จำนวนต่อหน้าด้วย state ภายใน
 * @features
 * - เห็นทุกบทความพร้อมกันในตารางเดียว (เดิมต้องเลือกทีละเรื่องจาก dropdown จึงเทียบกันไม่ได้)
 * - เรียง clicks → impressions ให้เรื่องที่มีคนเข้าอ่านลอยขึ้นบนสุด
 * - ปุ่ม "ดึงข้อมูลล่าสุด" sync GSC ทันที ไม่ต้องรอ cron วันละรอบ
 * @dependencies
 * - useSyncGscMetricsNow: ปุ่ม sync มือ
 * @related ตาราง: {@link seo-article-metrics-ranking-table.tsx}, รายละเอียดรายคำ: {@link seo-article-metrics-panel.tsx}
 */
export const SeoArticleMetricsSection = () => {
  const { mutate: syncNow, isPending: isSyncing } = useSyncGscMetricsNow();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<number>(DEFAULT_METRICS_PAGE_SIZE);

  return (
    <div className="flex flex-col gap-3">
      {/* ===== แถบเครื่องมือ ===== */}
      <Card className="flex flex-wrap items-center justify-between gap-2 p-3">
        <span className="text-sm text-muted-foreground">ผลของบทความที่เผยแพร่แล้วทุกเรื่อง เรียงตามยอดคลิก</span>

        <Button variant="outline" size="sm" className="h-9 shrink-0" onClick={() => syncNow()} disabled={isSyncing}>
          {isSyncing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
          <span className="ml-1.5">{isSyncing ? "กำลังดึง..." : "ดึงข้อมูลล่าสุด"}</span>
        </Button>
      </Card>

      <SeoArticleMetricsRankingTable
        page={page}
        pageSize={pageSize}
        onPageChange={setPage}
        onPageSizeChange={(size) => {
          setPageSize(size);
          setPage(1); // เปลี่ยนจำนวนต่อหน้าแล้วเลขหน้าเดิมอาจเกินจำนวนหน้าใหม่
        }}
      />

      {/* บอกตรง ๆ ว่าตัวเลขว่างเพราะอะไร — ห้ามปล่อยหน้าขาวเปล่า */}
      <div className="flex items-start gap-2 rounded-md bg-muted p-3 text-xs text-muted-foreground">
        <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
        <span>
          ตัวเลขรวมจากคำค้นที่ Google เปิดเผย อาจต่ำกว่ายอดรวมใน Search Console และยังไม่ใช่ยอดขาย
          ระบบดึงข้อมูลวันละครั้ง หรือกด “ดึงข้อมูลล่าสุด” เองได้ — Google ปล่อยข้อมูลที่นิ่งแล้วช้าประมาณ 3 วัน
          กดถี่กว่านี้จึงไม่ได้ตัวเลขของเมื่อวาน หากไม่มีข้อมูล ให้ตรวจการเชื่อมต่อ วันที่ดึงข้อมูล และสถานะ URL ใน
          Search Console ก่อนสรุปว่าบทความไม่ติดอันดับ
        </span>
      </div>
    </div>
  );
};
