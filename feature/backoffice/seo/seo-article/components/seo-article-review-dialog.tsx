"use client";

import React, { useState } from "react";
import { SeoArticleStatus } from "@prisma/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, Globe, Loader2, PencilLine } from "lucide-react";
import { useSeoArticleNavigation } from "../nuqs/seo-article-navigation-param";
import { useSeoArticleEditParam } from "../nuqs/seo-article-edit-param";
import { usePublishSeoArticle } from "../tanstack/publish-seo-article.mutation";
import { useRejectSeoArticle } from "../tanstack/reject-seo-article.mutation";
import { useFindSeoArticleDetail } from "../tanstack/find-seo-article-detail.query";
import { SeoArticleBlockPreview } from "./seo-article-block-preview";
import { SeoArticleMetricsPanel } from "./seo-article-metrics-panel";

/**
 * @description Dialog รีวิวบทความ SEO — พรีวิวเนื้อหาจริง / ยืนยันเผยแพร่ / ปัดตก
 * @page /super-admin/hurry-web/seo-article
 * @parent {@link seo-article-hub-main.tsx}
 * @access super-admin
 * @props ไม่มี — อ่าน id ที่เลือกจาก URL แล้วโหลดเนื้อหาเอง (หน้ารายการไม่ส่ง contentJson มาแล้ว)
 * @features
 * - step "preview": แสดงบทความเหมือนบนเว็บจริงจากโครงบล็อก v2 (บทความโครงเก่าถูกแปลงให้ตั้งแต่ฝั่ง server)
 * - ปุ่ม "แก้เนื้อหา" **ปิด dialog แล้วเปิดหน้าแก้ไขเต็มหน้า** (?edit=) — ไม่แก้ใน dialog อีกต่อไป
 *   เพราะโปรแกรมแก้ไขบล็อกมี popup ของตัวเองที่ชนกับ focus trap ของ dialog
 * - บทความที่เผยแพร่แล้วก็กดแก้เนื้อหาได้ (ของเดิมแก้ได้แค่ตอนเป็นร่าง)
 * - ปุ่มสร้างรูปทั้งบทความย้ายไปอยู่หัวหน้าแก้ไขแล้ว (ที่นั่นมีตัวกันร่างค้างถูกทับในตัว [SEO-EDT-40])
 * - **"เผยแพร่ขึ้นเว็บ" อยู่มุมขวาบนของหัว dialog** (ปุ่มเขียว + ไอคอนลูกโลก) ส่วน "ปัดตก/แก้เนื้อหา" อยู่แถวท้าย
 *   แยกคนละที่ + คนละสีโดยตั้งใจ: เป็นปุ่มเดียวที่ทำให้บทความออกสู่สาธารณะจริง
 *   ถ้าวางติดกับ "แก้เนื้อหา" ที่เป็นปุ่มทึบเหมือนกัน คือรอกดพลาดแล้ว deploy เว็บโดยไม่ตั้งใจ
 *   หัว dialog ต้องเว้น pr-10 ให้ปุ่มกากบาทปิดของ radix ที่ลอยอยู่มุมนั้นเสมอ
 * - step "confirm-publish"/"confirm-reject": สลับ content ใน dialog เดิม (ห้าม Swal confirm ตามกฎ)
 *   ทั้งเผยแพร่และปัดตกต้องผ่านหน้ายืนยันเสมอ ไม่มีทางลัดกดครั้งเดียวจบ
 * @dependencies
 * - useSeoArticleNavigation, useSeoArticleEditParam, usePublishSeoArticle, useRejectSeoArticle
 */
export const SeoArticleReviewDialog = () => {
  const {
    dialog,
    article: selectedArticleId,
    closeDialog,
    reviewPhase: step,
    setReviewPhase: setStep,
  } = useSeoArticleNavigation();
  const isOpen = dialog === "review" && selectedArticleId != null && selectedArticleId > 0;

  const [, setEditArticleId] = useSeoArticleEditParam();

  const { data: detailResponse } = useFindSeoArticleDetail(isOpen ? selectedArticleId : null);
  const detail = detailResponse?.status === "ok" ? detailResponse.data : null;
  const article = detail?.article ?? null;

  const [rejectReason, setRejectReason] = useState("");
  const [stepArticleId, setStepArticleId] = useState<number | null>(selectedArticleId);

  // ล้างเหตุผลเมื่อเปลี่ยนบทความ; phase อ่านจาก URL เพื่อรองรับ Back/Forward
  // ปรับ state ระหว่าง render (ไม่ใช้ useEffect) — React จะ render รอบใหม่ทันทีก่อนวาดจอ ไม่เห็นจอกระพริบ
  if (stepArticleId !== selectedArticleId) {
    setStepArticleId(selectedArticleId);
    setRejectReason("");
  }

  const { mutate: publish, isPending: isPublishing } = usePublishSeoArticle();
  const { mutate: reject, isPending: isRejecting } = useRejectSeoArticle();

  if (!isOpen) return null;

  const content = detail?.content ?? null;
  const loadErrorMessage = detailResponse && detailResponse.status !== "ok" ? detailResponse.message : null;
  const isDraft = article?.status === SeoArticleStatus.DRAFT;
  const isPublished = article?.status === SeoArticleStatus.PUBLISHED;
  const coverImage = content?.coverImage;
  const faq = content?.faq ?? [];

  /** เปิดหน้าแก้ไขเต็มหน้า — ต้องปิด dialog ก่อนเสมอ ไม่งั้น focus trap ของ dialog จะกินคีย์ของ editor */
  const handleOpenEditor = () => {
    if (!article) return;
    void setEditArticleId(article.seoArticleId);
  };

  // ยังโหลดไม่เสร็จ/โหลดไม่ได้ — ต้องมี DialogTitle เสมอเพื่อไม่ให้ radix เตือนเรื่อง accessibility
  if (!article || !content) {
    return (
      <Dialog open onOpenChange={(open) => !open && closeDialog()}>
        <DialogContent className="md:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="pr-6 text-base md:text-lg">
              {loadErrorMessage ? "เปิดบทความไม่ได้" : "กำลังโหลดบทความ..."}
            </DialogTitle>
          </DialogHeader>
          {loadErrorMessage ? (
            <p className="py-6 text-center text-sm text-destructive">{loadErrorMessage}</p>
          ) : (
            <div className="flex justify-center py-10">
              <Loader2 className="size-6 animate-spin text-muted-foreground" />
            </div>
          )}
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && closeDialog()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto md:max-w-2xl">
        <DialogHeader>
          {/* pr-10 = เว้นที่ให้ปุ่มกากบาทปิดของ radix ที่ลอยอยู่มุมขวาบนเสมอ ห้ามให้ปุ่มเผยแพร่ไปทับ */}
          <div className="flex items-start justify-between gap-3 pr-10">
            {step !== "preview" && (
              <Button
                variant="ghost"
                onClick={() => setStep("preview")}
                disabled={isPublishing || isRejecting}
                className="shrink-0 gap-1.5"
              >
                <ArrowLeft className="size-4" />
                กลับไปตรวจ
              </Button>
            )}
            <DialogTitle className="text-base md:text-lg">
              {step === "preview" && article.title}
              {step === "confirm-publish" && "ยืนยันเผยแพร่บทความ"}
              {step === "confirm-reject" && "ยืนยันปัดตกร่างบทความ"}
            </DialogTitle>

            {/* ปุ่มเดียวที่ทำให้บทความขึ้นเว็บจริง — อยู่บนหัว แยกขาดจากปุ่มแก้เนื้อหาที่ท้าย dialog
                โผล่เฉพาะ step preview เพราะระหว่างหน้ายืนยันมีปุ่มยืนยันของมันเองอยู่แล้ว */}
            {step === "preview" && isDraft && (
              <Button
                size="sm"
                onClick={() => setStep("confirm-publish")}
                className="shrink-0 gap-1.5 bg-emerald-600 text-white hover:bg-emerald-700"
              >
                <Globe className="size-4" />
                เผยแพร่ขึ้นเว็บ
              </Button>
            )}
          </div>
        </DialogHeader>

        {step === "preview" && (
          <div className="flex flex-col gap-4">
            <div className="rounded-md bg-gray-50 p-3 text-sm">
              <p>
                <strong>URL:</strong> /blog/{article.slug}
              </p>
              <p>
                <strong>Meta:</strong> {article.metaDescription}
              </p>
              <p>
                <strong>คำค้น:</strong> {article.keywords.join(", ")}
              </p>
              {article.targetKeyword && (
                <p>
                  <strong>คำเป้าหมาย:</strong> {article.targetKeyword}
                </p>
              )}
            </div>

            <SeoArticleMetricsPanel seoArticleId={article.seoArticleId} enabled={isPublished} />

            {coverImage && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={coverImage} alt={article.title} className="w-full rounded-lg object-cover" />
            )}

            <SeoArticleBlockPreview blocks={content.blocks} />

            {detail?.isLegacy && (
              <p className="rounded-md border border-amber-200 bg-amber-50 p-2 text-xs text-muted-foreground">
                บทความนี้ยังเก็บโครงเก่าในฐานข้อมูล — ที่เห็นคือฉบับแปลงเป็นบล็อกแล้ว
                จะถูกเขียนลงฐานจริงเมื่อกดบันทึกครั้งแรก
              </p>
            )}

            {faq.length > 0 && (
              <section className="flex flex-col gap-2">
                <h2 className="font-bold">คำถามที่พบบ่อย</h2>
                {faq.map((item, index) => (
                  <div key={index} className="rounded-md border border-gray-200 p-2 text-sm">
                    <strong>{item.question}</strong>
                    <p className="text-gray-600">{item.answer}</p>
                  </div>
                ))}
              </section>
            )}

            {(isDraft || isPublished) && (
              <div className="sticky -bottom-6 z-10 -mx-6 -mb-6 flex flex-col gap-2 border-t bg-background px-6 py-3 md:flex-row md:justify-between">
                {isDraft ? (
                  <Button variant="outline" onClick={() => setStep("confirm-reject")}>
                    ปัดตก
                  </Button>
                ) : (
                  <span />
                )}

                {/* ฝั่งขวาของแถวท้าย = แก้เนื้อหา — ปุ่มเผยแพร่ไม่ได้อยู่แถวนี้แล้ว (ย้ายขึ้นหัว dialog)
                    ปุ่มสร้างรูปทั้งบทความก็ย้ายไปหัวหน้าแก้ไข ({@link seo-article-editor-page.tsx}) */}
                <Button onClick={handleOpenEditor} className="gap-1.5">
                  <PencilLine className="size-4" />
                  แก้เนื้อหา
                </Button>
              </div>
            )}
          </div>
        )}

        {step === "confirm-publish" && (
          <div className="flex flex-col gap-4">
            <p className="text-sm text-gray-600">
              บทความ <strong>{article.title}</strong> จะขึ้นเว็บจริงที่{" "}
              <strong>/blog/{article.slug}/</strong> ทันทีที่กดยืนยัน
            </p>
            <div className="flex justify-between gap-2">
              <Button
                onClick={() =>
                  publish(
                    { seoArticleId: article.seoArticleId },
                    { onSuccess: (result) => result.status === "ok" && closeDialog() }
                  )
                }
                disabled={isPublishing}
                className="gap-2"
              >
                {isPublishing && <Loader2 className="size-4 animate-spin" />}
                ยืนยันเผยแพร่
              </Button>
            </div>
          </div>
        )}

        {step === "confirm-reject" && (
          <div className="flex flex-col gap-3">
            <p className="text-sm text-gray-600">
              ปัดตกร่างนี้? ระบบจะเก็บหัวข้อไว้เพื่อไม่ให้ AI เสนอเรื่องเดิมซ้ำอีก
            </p>
            <Textarea
              placeholder="เหตุผล (ไม่บังคับ)"
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              rows={2}
            />
            <div className="flex justify-between gap-2">
              <Button
                variant="destructive"
                onClick={() =>
                  reject(
                    { seoArticleId: article.seoArticleId, reason: rejectReason || undefined },
                    { onSuccess: (result) => result.status === "ok" && closeDialog() }
                  )
                }
                disabled={isRejecting}
                className="gap-2"
              >
                {isRejecting && <Loader2 className="size-4 animate-spin" />}
                ยืนยันปัดตก
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
