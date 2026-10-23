"use client";

import { SeoArticleJobType } from "@prisma/client";
import { useQueueSeoArticleJob } from "../tanstack/queue-seo-article-job.mutation";
import React, { useEffect, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useSeoArticleNavigation } from "../nuqs/seo-article-navigation-param";
import { ArrowLeft, Loader2, Sparkles, Wand2 } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SEO_ARTICLE_TONES, type SeoArticleTone } from "../constant/seo-article-tone";
import { useSeoArticleCategoryGenerateStore } from "../zustand/seo-article-category-generate.store";
import { useSuggestCategoryTopics } from "../tanstack/suggest-category-topics.mutation";
import { useQueueCategoryArticles } from "../tanstack/queue-category-articles.mutation";
import { SeoArticleCategoryPicker } from "./seo-article-category-picker";
import { SeoArticleDemandQuotaPicker } from "./seo-article-demand-quota-picker";
import { SeoArticleTopicSuggestionList } from "./seo-article-topic-suggestion-list";

/**
 * @description ไดอะล็อก "สร้างบทความจากหมวดหมู่บริการ" — เลือกหมวด → AI เสนอหัวข้อจากข้อมูลจริง → ติ๊กเลือก → เข้าคิวเขียน
 * @page /super-admin/hurry-web/seo-article
 * @parent {@link seo-article-hub-main.tsx}
 * @access super-admin
 * @props ไม่มี — nuqs ควบคุมหน้าต่าง/phase; store เก็บฟอร์มและผล AI
 * @features
 * - เลือกหมวด → AI เสนอหัวข้อ หรือพิมพ์หัวข้อเอง → ตรวจหัวข้อ ในไดอะล็อกเดียว (เปลี่ยน content ทั้งหน้าแทนการซ้อนไดอะล็อก ตามกฎ confirmation pattern ของโปรเจกต์)
 * - ขั้นเสนอหัวข้อรอในหน้าได้ (~10-20 วินาที) แต่ขั้นเขียนจริงเข้าคิว — กดแล้วปิดไดอะล็อกทันที
 *   ไม่ต้องนั่งเฝ้า เพราะผู้ใช้เปลี่ยนหน้าไปทำอย่างอื่นระหว่างรอเป็นเรื่องปกติ
 * - ติ๊กได้หลายหัวข้อพร้อมกัน (สูงสุด 5 ตามที่ฝั่ง server จำกัด) เพราะไม่ต้องรอทีละเรื่องแล้ว
 * - สวิตช์ gen รูป default ปิด — รูปแพง กดสร้างทีหลังจากหน้ารีวิวได้
 * @dependencies
 * - useSeoArticleCategoryGenerateStore: state ของไดอะล็อก (selector รายตัว)
 * - useSuggestCategoryTopics / useQueueCategoryArticles: 2 ขั้นของ flow
 * @data-flow
 * - [this] → suggest-category-topics.action → build-category-grounding (อ่าน DB จริง) → AI เสนอหัวข้อ
 * - [this] → queue-category-articles.action → SeoArticleJob (QUEUED) → QStash → worker เขียนจริง
 */
export const SeoArticleCategoryGenerateDialog = () => {
  const { dialog, categoryPhase: step, setCategoryPhase: setStep, closeDialog } = useSeoArticleNavigation();
  const isOpen = dialog === "category";
  const selectedCategoryCode = useSeoArticleCategoryGenerateStore((s) => s.selectedCategoryCode);
  const selectedCategoryName = useSeoArticleCategoryGenerateStore((s) => s.selectedCategoryName);
  const selectedSubcategoryNames = useSeoArticleCategoryGenerateStore((s) => s.selectedSubcategoryNames);
  const suggestions = useSeoArticleCategoryGenerateStore((s) => s.suggestions);
  const selectedKeywords = useSeoArticleCategoryGenerateStore((s) => s.selectedKeywords);
  const tone = useSeoArticleCategoryGenerateStore((s) => s.tone);
  const generateImages = useSeoArticleCategoryGenerateStore((s) => s.generateImages);
  const quota = useSeoArticleCategoryGenerateStore((s) => s.quota);

  const manualTopic = useSeoArticleCategoryGenerateStore((s) => s.manualTopic);
  const manualKeyword = useSeoArticleCategoryGenerateStore((s) => s.manualKeyword);
  const setManualTopic = useSeoArticleCategoryGenerateStore((s) => s.setManualTopic);
  const setManualKeyword = useSeoArticleCategoryGenerateStore((s) => s.setManualKeyword);
  const manualValid = manualTopic.trim().length >= 5 && manualTopic.trim().length <= 300;
  const isManual = step === "manual" || step === "confirm-manual";
  const selectCategory = useSeoArticleCategoryGenerateStore((s) => s.selectCategory);
  const toggleSubcategory = useSeoArticleCategoryGenerateStore((s) => s.toggleSubcategory);
  const clearSubcategories = useSeoArticleCategoryGenerateStore((s) => s.clearSubcategories);
  const showSuggestions = useSeoArticleCategoryGenerateStore((s) => s.showSuggestions);
  const backToCategory = () => void setStep("category");
  const toggleTopic = useSeoArticleCategoryGenerateStore((s) => s.toggleTopic);
  const setTone = useSeoArticleCategoryGenerateStore((s) => s.setTone);
  const setGenerateImages = useSeoArticleCategoryGenerateStore((s) => s.setGenerateImages);
  const setQuota = useSeoArticleCategoryGenerateStore((s) => s.setQuota);

  const { mutate: suggestTopics, isPending: isSuggesting } = useSuggestCategoryTopics();
  const { mutate: queueArticles, isPending: isQueueingCategory } = useQueueCategoryArticles();
  const { mutate: queueManual, isPending: isQueueingManual } = useQueueSeoArticleJob();
  const isQueueing = isQueueingCategory || isQueueingManual;

  // A reloaded/shared later phase has no in-memory form or AI result. Recover without starting AI work.
  useEffect(() => {
    if (!isOpen) return;
    if (step === "topics" && (!selectedCategoryCode || suggestions.length === 0)) {
      void setStep("category", true);
    } else if (step === "confirm-manual" && !manualValid) {
      void setStep("manual", true);
    }
  }, [isOpen, step, selectedCategoryCode, suggestions.length, manualValid, setStep]);

  const requestVersion = useRef(0);
  useEffect(() => {
    requestVersion.current += 1;
    return () => {
      requestVersion.current += 1;
    };
  }, [isOpen, step, selectedCategoryCode, selectedSubcategoryNames]);

  const handleSuggest = () => {
    if (!selectedCategoryCode) return;
    const version = requestVersion.current;
    suggestTopics(
      {
        categoryCode: selectedCategoryCode,
        ...(selectedSubcategoryNames.length > 0 ? { subcategoryNames: selectedSubcategoryNames } : {}),
        quota,
      },
      {
        onSuccess: (result) => {
          if (version !== requestVersion.current) return;
          if (result.status === "ok" && (result.data?.length ?? 0) > 0) {
            showSuggestions(result.data ?? []);
            void setStep("topics");
          }
        },
      }
    );
  };

  const handleQueue = () => {
    if (isQueueing) return;
    const version = requestVersion.current;
    if (isManual) {
      if (!manualValid) return;
      queueManual(
        {
          jobType: SeoArticleJobType.WRITE_NOW,
          payload: {
            promptBrief: manualTopic.trim(),
            ...(manualKeyword.trim() ? { targetKeyword: manualKeyword.trim() } : {}),
          },
          tone,
          generateImages,
        },
        {
          onSuccess: (result) => {
            if (result.status === "ok" && version === requestVersion.current) {
              void closeDialog();
              useSeoArticleCategoryGenerateStore.getState().reset();
            }
          },
        }
      );
      return;
    }
    if (!selectedCategoryCode || selectedKeywords.length === 0 || selectedKeywords.length > 5) return;
    const topics = suggestions
      .filter((item) => selectedKeywords.includes(item.targetKeyword))
      .map((item) => ({ topic: item.topic, targetKeyword: item.targetKeyword }));

    queueArticles(
      {
        categoryCode: selectedCategoryCode,
        ...(selectedSubcategoryNames.length > 0 ? { subcategoryNames: selectedSubcategoryNames } : {}),
        topics,
        tone,
        generateImages,
      },
      {
        onSuccess: (result) => {
          if (result.status === "ok" && version === requestVersion.current) {
            void closeDialog();
            useSeoArticleCategoryGenerateStore.getState().reset();
          }
        },
      } // เข้าคิวแล้วไม่มีอะไรให้รอ ปิดไปเลย
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && closeDialog()}>
      <DialogContent className="flex max-h-[85dvh] flex-col gap-0 p-0 sm:max-w-2xl">
        <DialogHeader className="shrink-0 border-b p-4 text-left">
          <div className="flex items-center gap-2 pr-8">
            {step !== "category" && (
              <Button
                variant="ghost"
                onClick={step === "confirm-manual" ? () => void setStep("manual") : backToCategory}
                disabled={isQueueing}
                className="gap-1.5"
              >
                <ArrowLeft className="h-4 w-4" />
                {step === "confirm-manual" ? "กลับไปแก้หัวข้อ" : "กลับไปเลือกวิธีสร้าง"}
              </Button>
            )}
            <DialogTitle className="flex items-center gap-2 text-base md:text-lg">
              <Wand2 className="h-4 w-4 text-primary" />
              {step === "category"
                ? "สร้างบทความ"
                : isManual
                  ? "สร้างบทความจากหัวข้อที่พิมพ์เอง"
                  : `หัวข้อที่แนะนำ — ${selectedCategoryName}${selectedSubcategoryNames.length > 0 ? ` / ${selectedSubcategoryNames.join(", ")}` : ""}`}
            </DialogTitle>
          </div>
          <DialogDescription className="text-xs md:text-sm">
            {step === "category"
              ? "กำหนดหัวข้อเองได้ทันที หรือเลือกหมวดบริการเพื่อให้ AI แนะนำหัวข้อจากข้อมูลจริง"
              : isManual
                ? "กำหนดเรื่องที่อยากเขียนได้อิสระ ไม่ต้องเลือกหมวดบริการ เช่น รถจมน้ำ"
                : "ติ๊กเรื่องที่อยากได้ เลือกได้หลายเรื่อง — กดแล้วระบบเขียนเบื้องหลัง ออกจากหน้านี้ได้เลย"}
          </DialogDescription>
        </DialogHeader>

        <div className="min-h-0 flex-1 overflow-y-auto p-4">
          {step === "category" ? (
            <div className="flex flex-col gap-4">
              <Button
                variant="outline"
                className="h-auto w-full justify-between gap-3 whitespace-normal border-2 border-foreground/70 p-4 text-left hover:border-foreground"
                onClick={() => void setStep("manual")}
                disabled={isSuggesting || isQueueing}
              >
                <span className="flex min-w-0 flex-col gap-1">
                  <span className="font-semibold">พิมพ์หัวข้อเอง</span>
                  <span className="text-xs font-normal text-muted-foreground">
                    กำหนดเองได้อิสระ เช่น รถจมน้ำ — ไม่ต้องเลือกหมวดบริการ
                  </span>
                </span>
                <span aria-hidden="true" className="shrink-0 text-[10px] font-semibold tracking-wide">
                  CUSTOM
                </span>
              </Button>
              <SeoArticleCategoryPicker
                selectedCategoryCode={selectedCategoryCode}
                selectedSubcategoryNames={selectedSubcategoryNames}
                onSelect={selectCategory}
                onToggleSubcategory={toggleSubcategory}
                onClearSubcategories={clearSubcategories}
              />
              <SeoArticleDemandQuotaPicker quota={quota} onChange={setQuota} />
            </div>
          ) : isManual ? (
            <div className="flex flex-col gap-4">
              {step === "confirm-manual" ? (
                <div className="space-y-2 rounded-lg border p-4">
                  <h3 className="font-semibold">ตรวจหัวข้อก่อนสั่งเขียน</h3>
                  <p className="break-words">{manualTopic.trim()}</p>
                  <p className="text-sm text-muted-foreground">
                    คำค้นเป้าหมาย: {manualKeyword.trim() || "ให้ AI เลือกจากหัวข้อ"}
                  </p>
                </div>
              ) : (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="seo-manual-topic">หัวข้อบทความ</Label>
                    <Textarea
                      id="seo-manual-topic"
                      value={manualTopic}
                      onChange={(event) => setManualTopic(event.target.value)}
                      maxLength={300}
                      placeholder="เช่น รถจมน้ำ"
                    />
                    <p className="text-xs text-muted-foreground">
                      หัวข้อยาว 5–300 ตัวอักษร ({manualTopic.trim().length}/300)
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="seo-manual-keyword">คำค้นเป้าหมาย (ไม่บังคับ)</Label>
                    <Input
                      id="seo-manual-keyword"
                      value={manualKeyword}
                      onChange={(event) => setManualKeyword(event.target.value)}
                      placeholder="เช่น รถจมน้ำ"
                    />
                  </div>
                </>
              )}
            </div>
          ) : (
            <SeoArticleTopicSuggestionList
              suggestions={suggestions}
              selectedKeywords={selectedKeywords}
              onToggle={toggleTopic}
            />
          )}
        </div>

        <div className="shrink-0 border-t p-4">
          {step !== "category" && (
            <div className="mb-3 flex flex-wrap items-center gap-x-4 gap-y-2">
              <div className="flex items-center gap-2">
                <Label htmlFor="seo-tone" className="text-xs md:text-sm">
                  โทน
                </Label>
                <Select value={tone} onValueChange={(value) => setTone(value as SeoArticleTone)}>
                  <SelectTrigger id="seo-tone" className="h-8 w-48 text-xs md:text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SEO_ARTICLE_TONES.map((item) => (
                      <SelectItem key={item.value} value={item.value} className="text-xs md:text-sm">
                        {item.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center gap-2">
                <Checkbox
                  id="seo-gen-images"
                  checked={generateImages}
                  onCheckedChange={(checked) => setGenerateImages(checked === true)}
                />
                <Label htmlFor="seo-gen-images" className="text-xs font-normal md:text-sm">
                  สร้างรูปประกอบด้วย (ช้าและมีค่าใช้จ่ายเพิ่ม)
                </Label>
              </div>
            </div>
          )}

          <div className="flex items-center justify-end gap-2">
            {step === "manual" ? (
              <Button onClick={() => void setStep("confirm-manual")} disabled={!manualValid}>
                ตรวจหัวข้อก่อนสั่งเขียน
              </Button>
            ) : step === "category" ? (
              <Button onClick={handleSuggest} disabled={!selectedCategoryCode || isSuggesting} className="gap-1.5">
                {isSuggesting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                {isSuggesting ? "กำลังหาหัวข้อ..." : "ให้ AI แนะนำหัวข้อ"}
              </Button>
            ) : (
              <Button
                onClick={handleQueue}
                disabled={
                  isQueueing || (isManual ? !manualValid : selectedKeywords.length === 0 || selectedKeywords.length > 5)
                }
                className="gap-1.5"
              >
                {isQueueing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                {isQueueing ? "กำลังสั่ง..." : `สั่งเขียน ${isManual ? 1 : selectedKeywords.length} เรื่อง`}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
