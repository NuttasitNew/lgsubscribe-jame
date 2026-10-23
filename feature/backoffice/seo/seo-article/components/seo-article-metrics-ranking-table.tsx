"use client";

import React, { useState } from "react";
import { ChevronDown, ChevronRight, LineChart, Loader2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useFindSeoArticleMetricsRanking } from "../tanstack/find-seo-article-metrics-ranking.query";
import { SeoArticleMetricsPanel } from "./seo-article-metrics-panel";
import { SeoArticlePaginationBar } from "./seo-article-pagination-bar";

/** วันที่แบบไทยย่อ "12 ส.ค. 69" — ต้องผ่าน timeZone Asia/Bangkok ไม่งั้นบทความที่ขึ้นดึกจะเลื่อนไปวันก่อนหน้า */
const publishDateFormatter = new Intl.DateTimeFormat("th-TH", {
  timeZone: "Asia/Bangkok",
  day: "numeric",
  month: "short",
  year: "2-digit",
});

/**
 * อายุบทความเป็นวัน — ตัวชี้ขาดว่า "ยังไม่มีคลิก" แปลว่าบทความแย่ หรือแค่ยังใหม่เกินไป
 * (Google ใช้เวลา 2-6 สัปดาห์กว่าจะจัดอันดับ — ต่ำกว่านั้นยังตัดสินไม่ได้)
 */
const daysSince = (published: Date): number => Math.max(0, Math.floor((Date.now() - published.getTime()) / 86400000));

/** สีอันดับ: 1-10 เขียว (หน้าแรก), 11-30 เหลือง (ใกล้ติดหน้าแรก), เกินนั้นเทา — ชุดเดียวกับแผงรายละเอียด */
const positionClass = (position: number): string => {
  if (position <= 10) return "text-green-600";
  if (position <= 30) return "text-amber-600";
  return "text-gray-500";
};

/**
 * @description ตารางผลบน Google ของบทความที่เผยแพร่ **ทุกเรื่อง** เรียงคลิกมาก→น้อย แล้วตามด้วย impressions + แบ่งหน้า
 * @page /super-admin/hurry-web/seo-article
 * @parent {@link seo-article-metrics-section.tsx}
 * @access super-admin
 * @props { page, pageSize, onPageChange, onPageSizeChange } — หน้าถูกคุมจาก section ด้านบน
 * @features
 * - ทุกบทความอยู่ในตารางเดียว รวมเรื่องที่ยังคลิก 0 (หายไปเมื่อไหร่จะดูเหมือนไม่มีบทความนั้น)
 * - หัวตารางสรุปยอดรวมทุกหน้า + บอกว่ามีกี่เรื่องที่เริ่มมีข้อมูลแล้ว
 * - คอลัมน์ "เผยแพร่" = วันที่ขึ้นบทความ + อายุเป็นวัน — ต้องมีคู่กับคลิก ไม่งั้นแยกไม่ออกว่า
 *   "คลิก 0 เพราะบทความไม่ดี" หรือ "เพราะเพิ่งขึ้นได้ไม่กี่วัน" (Google ใช้เวลา 2-6 สัปดาห์)
 *   บทความเก่าที่ไม่ได้สร้างจากระบบนี้ไม่มีวันเผยแพร่ให้ดู — โชว์ "—"
 * - กดแถวเพื่อกางรายละเอียดรายคำค้นของเรื่องนั้น (ยิง query เฉพาะเรื่องที่กาง — กัน N+1)
 * @dependencies
 * - useFindSeoArticleMetricsRanking: ยอดรวมทุกบทความ (2 query ฝั่ง server)
 * - SeoArticleMetricsPanel: รายละเอียดรายคำค้นของบทความที่กาง
 */
export const SeoArticleMetricsRankingTable = ({
  page,
  pageSize,
  onPageChange,
  onPageSizeChange,
}: {
  page: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
}) => {
  const { data: rankingRes, isLoading, isFetching } = useFindSeoArticleMetricsRanking(page, pageSize);
  // คีย์ด้วย slug ไม่ใช่ id — แถวบทความเก่าที่ไม่มีใน SeoArticle ไม่มี id ให้ใช้
  const [expandedSlug, setExpandedSlug] = useState<string | null>(null);

  if (isLoading) {
    return (
      <Card className="flex items-center justify-center p-12">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </Card>
    );
  }

  const ranking = rankingRes?.status === "ok" ? rankingRes.data : null;

  // ดึงไม่สำเร็จ / ยังไม่มีบทความ — ต้องบอกตรง ๆ ห้ามปล่อยตารางเปล่า
  if (!ranking || ranking.total === 0) {
    return (
      <Card className="flex flex-col items-center gap-2 p-12 text-center">
        <LineChart className="h-6 w-6 text-muted-foreground" />
        <strong className="text-sm">ยังไม่มีบทความที่เผยแพร่</strong>
        <p className="max-w-md text-sm text-muted-foreground">
          {rankingRes?.status === "ok"
            ? "ตรวจสถานะเผยแพร่และการดึงข้อมูล Search Console"
            : (rankingRes?.message ?? "ดึงข้อมูลไม่สำเร็จ")}
        </p>
      </Card>
    );
  }

  const rankOffset = (ranking.page - 1) * ranking.pageSize;

  return (
    <div className="flex flex-col gap-3">
      <Card className="flex flex-col gap-0 p-0">
        {/* ===== หัวตาราง: ยอดรวมทุกหน้า ไม่ใช่แค่หน้านี้ ===== */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-b p-3">
          <div className="flex items-center gap-2">
            <strong className="text-sm">
              ผลบน Google ({ranking.startDate} – {ranking.endDate})
            </strong>
            {isFetching && <Loader2 className="size-3.5 animate-spin text-muted-foreground" />}
          </div>
          <span className="text-xs text-muted-foreground">
            รวม {ranking.totalClicks.toLocaleString()} คลิก · {ranking.totalImpressions.toLocaleString()} impressions ·
            มีข้อมูลแล้ว {ranking.articlesWithData}/{ranking.total} เรื่อง
          </span>
        </div>

        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10 text-center">#</TableHead>
                <TableHead className="min-w-[220px]">บทความ</TableHead>
                <TableHead className="whitespace-nowrap">เผยแพร่</TableHead>
                <TableHead className="text-right">คลิก</TableHead>
                <TableHead className="text-right">Impressions</TableHead>
                <TableHead className="text-right">CTR</TableHead>
                <TableHead className="text-right">อันดับเฉลี่ย</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {ranking.items.map((row, index) => {
                const canExpand = row.seoArticleId != null; // บทความเก่าที่ไม่ได้สร้างจากระบบนี้ ไม่มีรายละเอียดรายคำให้กาง
                const isExpanded = expandedSlug === row.slug;
                return (
                  <React.Fragment key={row.slug}>
                    <TableRow
                      className={canExpand ? "cursor-pointer" : undefined}
                      onClick={() => canExpand && setExpandedSlug(isExpanded ? null : row.slug)}
                    >
                      <TableCell className="text-center text-xs text-muted-foreground">
                        {rankOffset + index + 1}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-start gap-1.5">
                          {canExpand ? (
                            isExpanded ? (
                              <ChevronDown className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" />
                            ) : (
                              <ChevronRight className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" />
                            )
                          ) : (
                            <span className="mt-0.5 size-3.5 shrink-0" />
                          )}
                          <div className="flex flex-col gap-0.5">
                            <span className="text-sm font-medium">{row.title}</span>
                            <span className="text-xs text-muted-foreground">
                              /blog/{row.slug}
                              {row.targetKeyword && ` · คำเป้าหมาย: ${row.targetKeyword}`}
                              {!canExpand && " · บทความเก่าในเว็บ (ไม่ได้สร้างจากระบบนี้)"}
                            </span>
                          </div>
                        </div>
                      </TableCell>
                      {/* วันที่ขึ้นบทความ + อายุ — บทความใหม่ที่ยังคลิก 0 ยังตัดสินไม่ได้ ต้องเห็นคู่กันเสมอ */}
                      <TableCell className="whitespace-nowrap text-xs">
                        {row.publishedAt ? (
                          <div className="flex flex-col gap-0.5">
                            <span className="tabular-nums">
                              {publishDateFormatter.format(new Date(row.publishedAt))}
                            </span>
                            <span className="text-muted-foreground">{daysSince(new Date(row.publishedAt))} วัน</span>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right text-sm font-semibold tabular-nums">
                        {row.clicks.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right text-sm tabular-nums">
                        {row.impressions.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right text-sm tabular-nums text-muted-foreground">
                        {row.impressions > 0 ? `${row.ctr}%` : "—"}
                      </TableCell>
                      <TableCell
                        className={`text-right text-sm font-medium tabular-nums ${
                          row.avgPosition != null ? positionClass(row.avgPosition) : "text-gray-400"
                        }`}
                      >
                        {row.avgPosition != null ? `#${row.avgPosition}` : "—"}
                      </TableCell>
                    </TableRow>

                    {/* แถวรายละเอียด — ยิง query ของเรื่องนี้เฉพาะตอนกางเท่านั้น */}
                    {isExpanded && row.seoArticleId != null && (
                      <TableRow className="hover:bg-transparent">
                        <TableCell colSpan={7} className="bg-muted/40 p-3">
                          <SeoArticleMetricsPanel seoArticleId={row.seoArticleId} enabled />
                        </TableCell>
                      </TableRow>
                    )}
                  </React.Fragment>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </Card>

      <SeoArticlePaginationBar
        page={ranking.page}
        pageSize={ranking.pageSize}
        totalItems={ranking.total}
        onPageChange={onPageChange}
        onPageSizeChange={onPageSizeChange}
      />
    </div>
  );
};
