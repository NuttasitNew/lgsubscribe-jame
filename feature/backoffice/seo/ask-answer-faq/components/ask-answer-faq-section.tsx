"use client";

import React, { useMemo, useState } from "react";
import { AskAnswerFaqStatus, SeoArticleJobType } from "@prisma/client";
import { ExternalLink, Languages, Loader2, MessageCircleQuestion, Sparkles, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useQueueSeoArticleJob } from "../../seo-article/tanstack/queue-seo-article-job.mutation";
import { findActiveSeoArticleJob } from "../../seo-article/helper/pick-seo-article-jobs.helper";
import type { SeoArticleJobItem } from "../../seo-article/server/find-seo-article-jobs.action";
import { useFindAskAnswerFaqs } from "../tanstack/find-ask-answer-faqs.query";
import { usePublishAskAnswerFaqs } from "../tanstack/publish-ask-answer-faqs.mutation";
import { AskAnswerFaqCard } from "./ask-answer-faq-card";

/** จำนวนข้อที่สั่งให้ AI คิดต่อครั้ง — 5 ข้อคือปริมาณที่คนตรวจจบได้ในรอบเดียว */
const FAQ_PER_RUN = 5;

const TABS: { value: AskAnswerFaqStatus; label: string }[] = [
  { value: AskAnswerFaqStatus.DRAFT, label: "รอตรวจ" },
  { value: AskAnswerFaqStatus.PUBLISHED, label: "อยู่บนเว็บแล้ว" },
  { value: AskAnswerFaqStatus.REJECTED, label: "ปัดตก" },
];

/**
 * @description Section "หน้า ถาม-ตอบ" ในหน้า hub บทความ SEO — สั่ง AI คิดคำถามใหม่ ตรวจ แล้วเผยแพร่ขึ้นเว็บ
 * @page /super-admin/hurry-web/seo-article?section=faq
 * @parent {@link ../../seo-article/components/seo-article-hub-main.tsx}
 * @access super-admin
 * @props { jobs: SeoArticleJobItem[] } — คิวงานจาก useWatchSeoArticleJobs ของหน้า hub (ห้ามเรียก hook นั้นซ้ำที่นี่)
 * @features
 * - ปุ่ม "ให้ AI คิดคำถามใหม่" (เข้าคิว WRITE_FAQ) — ปุ่มหมุนจากสถานะงานใน DB ไม่ใช่ isPending
 *   จึงยังหมุนต่อแม้สลับ section ไปกลับหรือกด F5
 * - ปุ่ม "แปลหน้า EN ทั้งหน้า" (เข้าคิว TRANSLATE_FAQ_EN) — ซ่อมไฟล์ en ที่เป็นข้อความไทยทั้งใบ
 *   ⚠️ ปุ่มนี้ push ขึ้นเว็บทันทีโดยไม่มีขั้นรีวิว จึงต้องยืนยันในที่ก่อน (ไม่ใช่กดปุ๊บยิงปั๊บ)
 * - ติ๊กหลายข้อแล้วกดเผยแพร่ทีเดียว = 1 commit = 1 deploy (ไม่ใช่ deploy ต่อข้อ)
 * @dependencies useFindAskAnswerFaqs, usePublishAskAnswerFaqs, useQueueSeoArticleJob
 * @related
 * - การ์ดต่อข้อ: {@link ask-answer-faq-card.tsx}
 * - runner: {@link ../server/run-write-faq-job.helper.ts}
 */
export const AskAnswerFaqSection = ({ jobs }: { jobs: SeoArticleJobItem[] }) => {
  const [tab, setTab] = useState<AskAnswerFaqStatus>(AskAnswerFaqStatus.DRAFT);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [confirmingTranslate, setConfirmingTranslate] = useState(false);

  const { data: faqsRes, isLoading } = useFindAskAnswerFaqs(tab);
  const { mutate: queueJob } = useQueueSeoArticleJob();
  const { mutate: publish, isPending: isPublishing } = usePublishAskAnswerFaqs();

  const isWriting = findActiveSeoArticleJob(jobs, { jobType: SeoArticleJobType.WRITE_FAQ }) != null;
  const isTranslating = findActiveSeoArticleJob(jobs, { jobType: SeoArticleJobType.TRANSLATE_FAQ_EN }) != null;

  const faqs = useMemo(() => faqsRes?.data ?? [], [faqsRes]);

  // ข้อที่ติ๊กไว้แต่หลุดจากรายการไปแล้ว (เพิ่งเผยแพร่/ปัดตก) ต้องไม่ค้างอยู่ในชุดที่จะส่ง
  const selectableIds = useMemo(() => new Set(faqs.map((faq) => faq.askAnswerFaqId)), [faqs]);
  const activeSelection = useMemo(
    () => selectedIds.filter((id) => selectableIds.has(id)),
    [selectedIds, selectableIds]
  );

  const toggleSelect = (askAnswerFaqId: number, next: boolean) => {
    setSelectedIds((previous) =>
      next ? [...new Set([...previous, askAnswerFaqId])] : previous.filter((id) => id !== askAnswerFaqId)
    );
  };

  return (
    <div className="flex flex-col gap-3">
      {/* ===== Section: หัวเรื่อง + ปุ่มสั่งงาน ===== */}
      <Card className="flex flex-wrap items-center justify-between gap-3 p-3 md:p-4">
        <div className="flex items-start gap-3">
          <div className="rounded-lg bg-primary/10 p-2">
            <MessageCircleQuestion className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h2 className="text-sm font-bold md:text-base">หน้า ถาม-ตอบ (/ask-and-answer)</h2>
            <p className="text-xs text-muted-foreground">
              AI คิดคำถามใหม่จากข้อมูลจริงของธุรกิจ — คำตอบยกตัวเลขงานจริง ลูกค้าใช้ซ้ำ และรีวิว มาเป็นหลักฐาน
              <a
                href="/faq/"
                target="_blank"
                rel="noreferrer"
                className="ml-1.5 inline-flex items-center gap-0.5 text-primary hover:underline"
              >
                เปิดหน้าจริง
                <ExternalLink className="h-3 w-3" />
              </a>
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            className="gap-1.5"
            disabled={isTranslating}
            onClick={() => setConfirmingTranslate(true)}
          >
            {isTranslating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Languages className="h-4 w-4" />}
            {isTranslating ? "กำลังแปลเบื้องหลัง..." : "แปลหน้า EN ทั้งหน้า"}
          </Button>

          <Button
            className="gap-1.5"
            disabled={isWriting}
            onClick={() => queueJob({ jobType: SeoArticleJobType.WRITE_FAQ, payload: { count: FAQ_PER_RUN } })}
          >
            {isWriting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            {isWriting ? "กำลังคิดเบื้องหลัง..." : `ให้ AI คิดคำถามใหม่ ${FAQ_PER_RUN} ข้อ`}
          </Button>
        </div>
      </Card>

      {/* ===== Section: ยืนยันก่อนแปลทั้งหน้า (งานนี้ push ขึ้นเว็บทันที ไม่มีขั้นรีวิว) ===== */}
      {confirmingTranslate && (
        <Card className="border-amber-300 bg-amber-50 p-3 md:p-4">
          <p className="text-sm font-medium">แปลหน้า ถาม-ตอบ เป็นอังกฤษทั้งหน้า?</p>
          <p className="mt-1 text-xs text-muted-foreground">
            ระบบจะอ่านข้อถาม-ตอบภาษาไทย <b>ทุกข้อบนเว็บตอนนี้</b> แปลใหม่ทั้งชุด แล้ว push ทับไฟล์
            <code className="mx-1">content/en/ask-and-answer.json</code>
            ทันทีโดยไม่มีขั้นให้ตรวจก่อน (เว็บจะ deploy ใหม่) — ฉบับภาษาไทยไม่ถูกแตะ
          </p>
          <div className="mt-3 flex justify-end gap-2">
            <Button variant="ghost" size="sm" onClick={() => setConfirmingTranslate(false)}>
              กลับ
            </Button>
            <Button
              size="sm"
              onClick={() => {
                queueJob({ jobType: SeoArticleJobType.TRANSLATE_FAQ_EN });
                setConfirmingTranslate(false);
              }}
            >
              ยืนยันแปลทั้งหน้า
            </Button>
          </div>
        </Card>
      )}

      {/* ===== Section: แท็บสถานะ + แถบเผยแพร่ ===== */}
      <Card className="sticky top-0 z-10 flex flex-wrap items-center justify-between gap-2 p-3">
        <Tabs value={tab} onValueChange={(value) => setTab(value as AskAnswerFaqStatus)}>
          <TabsList>
            {TABS.map((item) => (
              <TabsTrigger key={item.value} value={item.value}>
                {item.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>

        {tab === AskAnswerFaqStatus.DRAFT && (
          <Button
            size="sm"
            className="gap-1.5"
            disabled={activeSelection.length === 0 || isPublishing}
            onClick={() =>
              publish(
                { askAnswerFaqIds: activeSelection },
                { onSuccess: (result) => result.status === "ok" && setSelectedIds([]) }
              )
            }
          >
            {isPublishing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
            เผยแพร่ที่เลือก ({activeSelection.length})
          </Button>
        )}
      </Card>

      {/* ===== Section: รายการข้อ ===== */}
      <Card className="p-3 md:p-4">
        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="size-6 animate-spin text-muted-foreground" />
          </div>
        ) : faqs.length === 0 ? (
          <p className="py-12 text-center text-sm text-muted-foreground">
            {tab === AskAnswerFaqStatus.DRAFT
              ? "ยังไม่มีคำถามที่รอตรวจ — กด “ให้ AI คิดคำถามใหม่” ด้านบน"
              : "ยังไม่มีข้อในสถานะนี้"}
          </p>
        ) : (
          <div className="grid grid-cols-1 gap-3 2xl:grid-cols-2">
            {faqs.map((faq) => (
              <AskAnswerFaqCard
                key={faq.askAnswerFaqId}
                faq={faq}
                selected={activeSelection.includes(faq.askAnswerFaqId)}
                onToggleSelect={toggleSelect}
              />
            ))}
          </div>
        )}
      </Card>
    </div>
  );
};
