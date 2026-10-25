"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import { SeoKeywordArticleType, SeoKeywordStatus } from "@prisma/client";
import {
  ArrowDown,
  ArrowUp,
  Check,
  Info,
  Loader2,
  Minus,
  Plus,
  RefreshCw,
  Sparkles,
  Table2,
  Target,
  Wand2,
  X,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";
import {
  useCreateSeoKeyword,
  useFindSeoKeywords,
  useQueueKeywordResearch,
  useQueueWriteFromKeyword,
  useSyncKeywordRanksNow,
  useUpdateSeoKeyword,
} from "../tanstack/seo-keyword.query";
import type { SeoKeywordRow } from "../type/seo-keyword-row.type";

/** สีอันดับ: 1-10 เขียว (หน้าแรก), 11-30 เหลือง, เกินนั้นเทา — ชุดเดียวกับตารางผลบน Google */
const positionClass = (position: number) =>
  position <= 10 ? "text-green-600" : position <= 30 ? "text-amber-600" : "text-gray-500";

const INTENT_LABEL: Record<string, string> = {
  informational: "หาข้อมูล",
  commercial: "กำลังเลือก",
  transactional: "พร้อมสมัคร",
  comparison: "เปรียบเทียบ",
};

/** กราฟเส้นเล็กของอันดับ 28 วัน — แกน y กลับหัว (อันดับ 1 อยู่บน) */
const RankSparkline = ({ history }: { history: SeoKeywordRow["history"] }) => {
  if (history.length < 2) return <span className="text-xs text-muted-foreground">-</span>;
  const width = 96;
  const height = 28;
  const positions = history.map((h) => h.position);
  const min = Math.min(...positions);
  const max = Math.max(...positions);
  const span = Math.max(1, max - min);
  const points = history
    .map((h, i) => `${(i / (history.length - 1)) * width},${((h.position - min) / span) * (height - 4) + 2}`)
    .join(" ");
  return (
    <svg width={width} height={height} className="text-primary" aria-label="กราฟอันดับ 28 วัน">
      <polyline points={points} fill="none" stroke="currentColor" strokeWidth={1.5} />
    </svg>
  );
};

/** อันดับล่าสุด + ลูกศรเทียบ 7 วันก่อน (ตัวเลขลดลง = อันดับดีขึ้น) */
const RankCell = ({ row }: { row: SeoKeywordRow }) => {
  if (!row.latestRank) return <span className="text-xs text-muted-foreground">ยังไม่ติดผลค้นหา</span>;
  const delta = row.previousPosition != null ? row.previousPosition - row.latestRank.position : null;
  return (
    <div className="flex items-center gap-1.5">
      <span className={cn("text-base font-semibold tabular-nums", positionClass(row.latestRank.position))}>
        {row.latestRank.position.toFixed(1)}
      </span>
      {delta != null && Math.abs(delta) >= 0.5 ? (
        <span className={cn("flex items-center text-xs", delta > 0 ? "text-green-600" : "text-red-600")}>
          {delta > 0 ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />}
          {Math.abs(delta).toFixed(1)}
        </span>
      ) : (
        delta != null && <Minus className="h-3 w-3 text-muted-foreground" />
      )}
    </div>
  );
};

const TypeBadge = ({ type }: { type: SeoKeywordArticleType }) =>
  type === SeoKeywordArticleType.COMPARE ? (
    <Badge variant="secondary" className="gap-1">
      <Table2 className="h-3 w-3" />
      ตารางเทียบ
    </Badge>
  ) : (
    <Badge variant="outline">บทความความรู้</Badge>
  );

/**
 * @description Section "Keyword & อันดับ" — AI research คำค้น → เลือกคำที่จะเล่น → สั่งวิเคราะห์คู่แข่งแล้วเขียน → ดูอันดับรายวัน
 * @page /backoffice/seo/?section=keywords
 * @access seo.manage
 * @features
 * - ปุ่ม research: AI ตัวแรกหาคำค้นของกลุ่มลูกค้า (autocomplete + Keyword Planner + Search Console + ค้นเว็บ)
 * - ตาราง "คำที่เล่นอยู่": อันดับล่าสุดทั้งเว็บจาก Search Console, ขึ้น/ลงเทียบ 7 วัน, ดีที่สุด, กราฟ 28 วัน, บทความที่ผูก
 * - ตาราง "ข้อเสนอจาก AI": เหตุผล + หลักฐาน (เจอใน autocomplete / ยอดค้นหาจริง) ให้คนตัดสินว่าจะเล่นไหม
 * - "เขียนบทความ": AI ตัวที่สองอ่านบทความอันดับต้น ๆ หาช่องโหว่ แล้วเขียนร่าง (คำแบบตารางเทียบจะเก็บข้อมูลแบรนด์พร้อมแหล่งอ้างอิง)
 */
export const SeoKeywordSection = () => {
  const { data: rows = [], isLoading, error } = useFindSeoKeywords();
  const research = useQueueKeywordResearch();
  const write = useQueueWriteFromKeyword();
  const update = useUpdateSeoKeyword();
  const create = useCreateSeoKeyword();
  const syncRanks = useSyncKeywordRanksNow();

  const [focus, setFocus] = useState("");
  const [newKeyword, setNewKeyword] = useState("");
  const [newType, setNewType] = useState<SeoKeywordArticleType>(SeoKeywordArticleType.GUIDE);
  const [withImages, setWithImages] = useState(true);

  const tracking = useMemo(() => rows.filter((r) => r.status === SeoKeywordStatus.TRACKING), [rows]);
  const proposed = useMemo(() => rows.filter((r) => r.status === SeoKeywordStatus.PROPOSED), [rows]);

  const writeButton = (row: SeoKeywordRow) => (
    <Button
      size="sm"
      variant={row.article ? "outline" : "default"}
      className="h-8 gap-1"
      disabled={write.isPending}
      onClick={() => write.mutate({ seoKeywordId: row.seoKeywordId, generateImages: withImages })}
    >
      <Wand2 className="h-3.5 w-3.5" />
      {row.article ? "เขียนใหม่" : "เขียนบทความ"}
    </Button>
  );

  return (
    <div className="flex flex-col gap-3">
      {/* ===== Section: เครื่องมือ ===== */}
      <Card className="flex flex-col gap-3 p-3 md:p-4">
        <div className="flex flex-wrap items-center gap-2">
          <Input
            value={focus}
            onChange={(e) => setFocus(e.target.value)}
            placeholder="โฟกัส (ไม่บังคับ) เช่น เครื่องกรองน้ำ, คนไม่มีบัตรเครดิต"
            className="h-9 max-w-sm"
          />
          <Button className="h-9 gap-1.5" disabled={research.isPending} onClick={() => research.mutate({ focus })}>
            {research.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            ให้ AI research คำค้น
          </Button>
          <Button variant="outline" className="h-9 gap-1.5" disabled={syncRanks.isPending} onClick={() => syncRanks.mutate()}>
            {syncRanks.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            ดึงอันดับล่าสุด
          </Button>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Input
            value={newKeyword}
            onChange={(e) => setNewKeyword(e.target.value)}
            placeholder="เพิ่มคำที่อยากเล่นเอง"
            className="h-9 max-w-xs"
          />
          <select
            value={newType}
            onChange={(e) => setNewType(e.target.value as SeoKeywordArticleType)}
            className="h-9 rounded-md border bg-background px-2 text-sm"
            aria-label="ชนิดบทความ"
          >
            <option value={SeoKeywordArticleType.GUIDE}>บทความความรู้</option>
            <option value={SeoKeywordArticleType.COMPARE}>ตารางเทียบแบรนด์</option>
          </select>
          <Button
            variant="outline"
            className="h-9 gap-1.5"
            disabled={create.isPending || newKeyword.trim().length < 2}
            onClick={() => create.mutate({ keyword: newKeyword, articleType: newType }, { onSuccess: () => setNewKeyword("") })}
          >
            <Plus className="h-4 w-4" />
            เพิ่มและติดตาม
          </Button>
          <label className="ml-auto flex items-center gap-2 text-sm">
            <Checkbox checked={withImages} onCheckedChange={(v) => setWithImages(v === true)} />
            วาดรูปประกอบจากรูปสินค้าจริงในเว็บ
          </label>
        </div>
      </Card>

      {error && <Card className="p-4 text-sm text-red-600">{error.message}</Card>}
      {isLoading && (
        <Card className="flex items-center gap-2 p-4 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> กำลังโหลด...
        </Card>
      )}

      {/* ===== Section: คำที่เล่นอยู่ ===== */}
      <Card className="overflow-hidden">
        <div className="flex items-center gap-2 border-b p-3">
          <Target className="h-4 w-4 text-primary" />
          <h2 className="font-semibold">คำที่เล่นอยู่ ({tracking.length})</h2>
          <span className="text-xs text-muted-foreground">อันดับทั้งเว็บจาก Google Search Console</span>
        </div>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>คำค้น</TableHead>
                <TableHead>อันดับล่าสุด</TableHead>
                <TableHead className="text-center">ดีที่สุด</TableHead>
                <TableHead className="text-right">คลิก / แสดงผล</TableHead>
                <TableHead>28 วัน</TableHead>
                <TableHead>บทความ</TableHead>
                <TableHead className="text-right">จัดการ</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tracking.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="py-6 text-center text-sm text-muted-foreground">
                    ยังไม่มีคำที่เล่น — กด “ให้ AI research คำค้น” แล้วเลือกคำจากข้อเสนอด้านล่าง
                  </TableCell>
                </TableRow>
              )}
              {tracking.map((row) => (
                <TableRow key={row.seoKeywordId}>
                  <TableCell>
                    <div className="font-medium">{row.keyword}</div>
                    <div className="mt-1 flex flex-wrap items-center gap-1">
                      <TypeBadge type={row.articleType} />
                      {row.researchSummary && <span className="text-xs text-muted-foreground">{row.researchSummary}</span>}
                    </div>
                  </TableCell>
                  <TableCell>
                    <RankCell row={row} />
                    {row.latestRank && (
                      <div className="max-w-[220px] truncate text-xs text-muted-foreground" title={row.latestRank.page}>
                        {row.latestRank.page.replace(/^https?:\/\/[^/]+/, "")}
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="text-center tabular-nums">
                    {row.bestPosition != null ? row.bestPosition.toFixed(1) : "-"}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {row.latestRank ? `${row.latestRank.clicks} / ${row.latestRank.impressions}` : "-"}
                  </TableCell>
                  <TableCell>
                    <RankSparkline history={row.history} />
                  </TableCell>
                  <TableCell className="max-w-[240px]">
                    {row.article ? (
                      <Link href={`/backoffice/seo/?edit=${row.article.seoArticleId}`} className="line-clamp-2 text-sm text-primary hover:underline">
                        {row.article.title}
                      </Link>
                    ) : (
                      <span className="text-xs text-muted-foreground">ยังไม่มีบทความ</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      {writeButton(row)}
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-8"
                        title="เลิกติดตาม"
                        onClick={() => update.mutate({ seoKeywordId: row.seoKeywordId, status: SeoKeywordStatus.PROPOSED })}
                      >
                        <X className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </Card>

      {/* ===== Section: ข้อเสนอจาก AI ===== */}
      <Card className="overflow-hidden">
        <div className="flex items-center gap-2 border-b p-3">
          <Sparkles className="h-4 w-4 text-primary" />
          <h2 className="font-semibold">ข้อเสนอจาก AI ({proposed.length})</h2>
        </div>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>คำค้น</TableHead>
                <TableHead>กลุ่มลูกค้า</TableHead>
                <TableHead className="text-center">ความสำคัญ</TableHead>
                <TableHead>หลักฐาน</TableHead>
                <TableHead>เหตุผล</TableHead>
                <TableHead className="text-right">จัดการ</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {proposed.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="py-6 text-center text-sm text-muted-foreground">
                    ยังไม่มีข้อเสนอ
                  </TableCell>
                </TableRow>
              )}
              {proposed.map((row) => (
                <TableRow key={row.seoKeywordId}>
                  <TableCell>
                    <div className="font-medium">{row.keyword}</div>
                    <button
                      type="button"
                      className="mt-1"
                      title="สลับชนิดบทความ"
                      onClick={() =>
                        update.mutate({
                          seoKeywordId: row.seoKeywordId,
                          articleType:
                            row.articleType === SeoKeywordArticleType.COMPARE
                              ? SeoKeywordArticleType.GUIDE
                              : SeoKeywordArticleType.COMPARE,
                        })
                      }
                    >
                      <TypeBadge type={row.articleType} />
                    </button>
                  </TableCell>
                  <TableCell className="max-w-[200px] text-sm">
                    <div>{row.persona ?? "-"}</div>
                    <div className="text-xs text-muted-foreground">{INTENT_LABEL[row.intent] ?? row.intent}</div>
                  </TableCell>
                  <TableCell className="text-center font-semibold tabular-nums">{row.priority}/5</TableCell>
                  <TableCell className="text-xs">
                    {row.evidence?.inAutocomplete && <div className="text-green-700">✓ อยู่ใน Google Autocomplete</div>}
                    {row.evidence?.plannerMonthlySearches != null && (
                      <div>ค้นหา ~{row.evidence.plannerMonthlySearches.toLocaleString("th-TH")}/เดือน</div>
                    )}
                    {row.evidence?.gscImpressions28d != null && <div>เว็บเราโผล่แล้ว {row.evidence.gscImpressions28d} ครั้ง</div>}
                  </TableCell>
                  <TableCell className="max-w-[320px] text-xs text-muted-foreground">{row.rationale}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8 gap-1"
                        onClick={() => update.mutate({ seoKeywordId: row.seoKeywordId, status: SeoKeywordStatus.TRACKING })}
                      >
                        <Check className="h-3.5 w-3.5" />
                        เล่นคำนี้
                      </Button>
                      {writeButton(row)}
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-8"
                        title="ไม่เอา (AI จะไม่เสนอซ้ำ)"
                        onClick={() => update.mutate({ seoKeywordId: row.seoKeywordId, status: SeoKeywordStatus.DISMISSED })}
                      >
                        <X className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </Card>

      <div className="flex items-start gap-2 rounded-md bg-muted p-3 text-xs text-muted-foreground">
        <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
        <span>
          “เขียนบทความ” = AI ค้น Google ด้วยคำนั้น อ่านบทความอันดับต้น ๆ หาช่องโหว่และข้อมูลที่ต้องรู้ (ทุกข้อเท็จจริงมีลิงก์ยืนยัน)
          แล้วเขียนร่างไว้ในแท็บ “รอรีวิว” — คำแบบตารางเทียบจะเก็บข้อมูลจากเว็บทางการของแต่ละแบรนด์ ช่องที่หาแหล่งยืนยันไม่ได้จะขึ้นว่า
          “ไม่มีข้อมูลเปิดเผย” อันดับมาจาก Search Console ซึ่งช้าประมาณ 3 วัน และระบบดึงให้ทุกเช้า 09:30 น.
        </span>
      </div>
    </div>
  );
};
