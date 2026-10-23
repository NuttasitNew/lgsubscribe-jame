"use client";

import React, { useMemo, useState } from "react";
import { SeoArticleJobType } from "@prisma/client";
import { ChevronDown, Globe, Languages, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { buildArticleEnSourceHash } from "../helper/article-en-source-hash.helper";
import { useQueueSeoArticleJob } from "../tanstack/queue-seo-article-job.mutation";
import { useFindSeoArticleJobs } from "../tanstack/find-seo-article-jobs.query";
import { findActiveSeoArticleJob } from "../helper/pick-seo-article-jobs.helper";
import { useSeoArticleEditorStore } from "../zustand/seo-article-editor.store";

/** ความยาว meta description ที่ Google ตัดจอ — เกณฑ์เดียวกับฝั่งไทย */
const META_DESCRIPTION_LIMIT = 160;

interface SeoArticleEnMetaFormProps {
  seoArticleId: number;
  /** hash ของเนื้อไทยตอนแปลครั้งล่าสุด (จากฐาน) — null = ยังไม่เคยแปลด้วย AI */
  storedSourceHash: string | null;
  /** true = ฐานมี contentJsonEn แล้ว (เนื้อ EN จริง ไม่ใช่แค่ metadata) */
  hasEnContent: boolean;
  /** true = ยังมีร่างไทยค้างที่ยังไม่บันทึก — แปลตอนนี้จะได้ฉบับ EN ของเนื้อเก่า */
  hasUnsavedThai: boolean;
}

/**
 * @description แผงกรอก meta ภาษาอังกฤษของบทความ (หน้า /en/blog/<slug>) — พับเก็บได้ อยู่คอลัมน์ขวาของหน้าแก้ไข
 * @page /super-admin/hurry-web/seo-article?edit=<id>
 * @access super-admin
 * @parent {@link seo-article-editor-page.tsx}
 * @props { seoArticleId, storedSourceHash, hasEnContent, hasUnsavedThai } — ค่าที่ต้องมาจากฐาน
 *         ส่วนเนื้อฟอร์มอ่าน/เขียนผ่าน store ทั้งหมด
 * @features
 * - **ว่างไว้ = บทความนี้ไม่มีหน้าอังกฤษ** เว็บจะคืน 404 ที่ /en/blog/<slug> เหมือนเดิม (กัน duplicate content)
 *   กรอกแล้วหน้าอังกฤษจะถูกเปิดใช้ตอนกดเผยแพร่ครั้งถัดไป — เขียนบอกไว้ในแผงตรง ๆ ไม่ให้ต้องเดา
 * - **ปุ่มแปลด้วย AI อยู่บนสุด** — แปลทั้งเรื่อง (ชื่อ/คำอธิบาย/คำค้น/เนื้อบทความ) ในคลิกเดียว
 *   การกรอกมือกลายเป็นทางเสริมสำหรับเกลาคำแปล ไม่ใช่ทางหลักอีกต่อไป
 * - แปลจากเนื้อ**ในฐาน** จึงปิดปุ่มไว้เมื่อยังมีร่างไทยค้าง [SEO-EN-05] ไม่งั้นจะได้คำแปลของเนื้อเก่า
 * - ธง "ฉบับอังกฤษล้าสมัย" ขึ้นเมื่อเนื้อไทยถูกแก้หลังแปลครั้งล่าสุด (เทียบ contentEnSourceHash)
 *   — จงใจไม่แปลอัตโนมัติทุกครั้งที่บันทึก เพราะการแปลมีค่า AI ต่อครั้ง แก้คำเดียวไม่ควรเสียเงินใหม่
 * - พับเก็บโดยปริยายเมื่อยังไม่มีข้อมูลอังกฤษ เพื่อไม่ให้แย่งที่กับข้อมูล SEO ไทยที่แก้ทุกวัน
 *   แต่ถ้าบทความนี้มีหน้าอังกฤษอยู่แล้ว จะกางให้เห็นทันที (ของที่ live อยู่ต้องไม่ถูกซ่อน)
 * - ปุ่มลบข้อมูลอังกฤษยืนยันในที่ (เปลี่ยนแถวปุ่มเป็นคำถามยืนยัน) ไม่เด้ง Swal ซ้อน — การลบ = ทำให้ URL อังกฤษที่ live กลายเป็น 404
 * - คำค้นกรอกเป็นข้อความคั่นจุลภาค เก็บลง state ตอนออกจากช่อง (ไม่ตัดคำระหว่างพิมพ์) เหมือนฝั่งไทย
 * @dependencies useSeoArticleEditorStore (selector ทีละ field ตามกฎ ห้าม destructure ทั้ง store)
 * @related
 * - ฟอร์ม SEO ไทย: {@link seo-article-meta-form.tsx}
 * - ตัวเทียบว่ามีอะไรเปลี่ยน: {@link @/lib/seo/helper/is-seo-article-edit-equal}
 */
export const SeoArticleEnMetaForm = ({
  seoArticleId,
  storedSourceHash,
  hasEnContent,
  hasUnsavedThai,
}: SeoArticleEnMetaFormProps) => {
  const slug = useSeoArticleEditorStore((state) => state.draft?.slug ?? "");
  const titleEn = useSeoArticleEditorStore((state) => state.draft?.titleEn ?? "");
  const metaDescriptionEn = useSeoArticleEditorStore((state) => state.draft?.metaDescriptionEn ?? "");
  const keywordsEn = useSeoArticleEditorStore((state) => state.draft?.keywordsEn);
  const patchDraft = useSeoArticleEditorStore((state) => state.patchDraft);
  const { mutate: queueJob } = useQueueSeoArticleJob();

  // งานแปลอยู่ในคิว — ปุ่มหมุนตามสถานะใน DB ไม่ใช่ isPending จึงหมุนต่อได้แม้ปิดหน้าไปแล้วเปิดกลับมา
  const { data: jobResult } = useFindSeoArticleJobs();
  const jobs = useMemo(() => (jobResult?.status === "ok" ? (jobResult.data?.jobs ?? []) : []), [jobResult]);
  const isTranslating =
    findActiveSeoArticleJob(jobs, { jobType: SeoArticleJobType.TRANSLATE_EN, seoArticleId }) != null;

  // เก็บข้อความดิบไว้ที่นี่ แล้วค่อยตัดเป็น array ตอน blur — ถ้าตัดทุกตัวอักษร ผู้ใช้จะพิมพ์ ", " ไม่ได้
  const [keywordText, setKeywordText] = useState(() => (keywordsEn ?? []).join(", "));
  const [confirmingClear, setConfirmingClear] = useState(false);
  const [isOpen, setIsOpen] = useState(() => Boolean(titleEn.trim() || metaDescriptionEn.trim()));

  /**
   * ฉบับ EN ล้าสมัยไหม — เทียบลายนิ้วมือของเนื้อไทยปัจจุบันกับตอนที่แปลไว้
   * นับเฉพาะข้อความ (ไม่รวมรูป/ลิงก์/ตัวหนา) ดูเหตุผลที่ {@link ../helper/article-en-source-hash.helper.ts}
   */
  const currentSourceHash = useSeoArticleEditorStore((state) =>
    state.draft
      ? buildArticleEnSourceHash({
          title: state.draft.title,
          metaDescription: state.draft.metaDescription,
          content: state.draft.content,
        })
      : ""
  );
  const isEnStale = hasEnContent && storedSourceHash != null && storedSourceHash !== currentSourceHash;

  const hasAnyEnInput = Boolean(titleEn.trim() || metaDescriptionEn.trim() || (keywordsEn?.length ?? 0) > 0);
  const hasEnPage = Boolean(titleEn.trim() && metaDescriptionEn.trim());
  const isPartial = hasAnyEnInput && !hasEnPage;
  const metaLength = metaDescriptionEn.trim().length;

  /** ล้างข้อมูลอังกฤษทั้งชุด = ปิดหน้า /en ของบทความนี้ในการเผยแพร่ครั้งถัดไป */
  const handleClear = () => {
    patchDraft({ titleEn: "", metaDescriptionEn: "", keywordsEn: [] });
    setKeywordText("");
    setConfirmingClear(false);
  };

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger className="flex w-full items-center justify-between gap-2 text-left">
        <span className="flex min-w-0 items-center gap-2 text-sm font-medium">
          <Globe className="size-4 shrink-0 text-muted-foreground" />
          หน้าภาษาอังกฤษ
          {hasEnPage ? (
            <Badge variant="secondary" className="bg-emerald-100 text-emerald-700">
              เปิดใช้
            </Badge>
          ) : (
            <Badge variant="secondary" className={isPartial ? "bg-amber-100 text-amber-700" : ""}>
              {isPartial ? "กรอกไม่ครบ" : "ไม่มี"}
            </Badge>
          )}
        </span>
        <ChevronDown
          className={cn("size-4 shrink-0 text-muted-foreground transition-transform", isOpen && "rotate-180")}
        />
      </CollapsibleTrigger>

      <CollapsibleContent className="mt-3 flex flex-col gap-3">
        {/* แถวแปลด้วย AI — อยู่บนสุดเพราะเป็นทางหลักแล้ว การกรอกมือกลายเป็นทางเสริม */}
        <div
          className={cn(
            "flex flex-col gap-2 rounded-md border p-2.5",
            isEnStale ? "border-amber-300 bg-amber-50" : "border-primary/30 bg-primary/5"
          )}
        >
          <p className="text-xs leading-relaxed">
            {isEnStale ? (
              <>
                <b className="text-amber-700">ฉบับอังกฤษล้าสมัยแล้ว</b> — เนื้อไทยถูกแก้หลังจากแปลครั้งล่าสุด หน้า /en
                ยังเป็นคำแปลของเนื้อเก่าอยู่
              </>
            ) : hasEnContent ? (
              <>
                <b className="text-emerald-700">ฉบับอังกฤษตรงกับเนื้อไทยแล้ว</b> — แปลครบทั้งชื่อ คำอธิบาย
                และเนื้อบทความ
              </>
            ) : (
              <>ยังไม่มีเนื้อบทความฉบับอังกฤษ — กดแปลเพื่อให้ AI แปลทั้งเรื่อง โครงบล็อกและรูปใช้ชุดเดียวกับไทย</>
            )}
          </p>

          <Button
            type="button"
            size="sm"
            className="h-8 w-fit gap-1.5"
            disabled={isTranslating || hasUnsavedThai}
            onClick={() => queueJob({ jobType: SeoArticleJobType.TRANSLATE_EN, seoArticleId })}
            title={
              hasUnsavedThai
                ? "[SEO-EN-05] บันทึกบทความไทยก่อน — ระบบแปลจากเนื้อที่บันทึกไว้ในฐาน ไม่ใช่ร่างที่ค้างอยู่"
                : "ให้ AI แปลบทความทั้งเรื่องเป็นภาษาอังกฤษ"
            }
          >
            {isTranslating ? <Loader2 className="size-3.5 animate-spin" /> : <Languages className="size-3.5" />}
            {isTranslating ? "กำลังแปลเบื้องหลัง..." : hasEnContent ? "แปลใหม่ให้ตรงกับไทย" : "แปลทั้งบทความด้วย AI"}
          </Button>

          {hasUnsavedThai && (
            <p className="text-[11px] text-muted-foreground">บันทึกบทความไทยก่อน แล้วปุ่มนี้จะกดได้</p>
          )}
        </div>

        <div className="rounded-md bg-muted/60 p-2.5 text-xs leading-relaxed text-muted-foreground">
          {hasEnPage ? (
            <>
              บทความนี้จะมีหน้าอังกฤษที่ <code className="font-medium text-foreground">/en/blog/{slug || "…"}</code>{" "}
              โดยใช้ชื่อและคำอธิบายชุดนี้ —{" "}
              {hasEnContent ? (
                <b>เนื้อบทความเป็นฉบับแปลอังกฤษจริง</b>
              ) : (
                <>
                  <b>เนื้อบทความยังเป็นภาษาไทยชุดเดิม</b> (กดปุ่มแปลด้านบนเพื่อให้เป็นอังกฤษทั้งเรื่อง)
                </>
              )}
            </>
          ) : (
            <>
              <b>ปล่อยว่างไว้ = บทความนี้ไม่มีหน้าอังกฤษ</b> ใครเปิด{" "}
              <code className="font-medium text-foreground">/en/blog/{slug || "…"}</code> จะเจอหน้า 404
              ซึ่งเป็นค่าปกติของบทความที่เขียนเป็นภาษาไทยล้วน (กัน Google มองว่าเนื้อหาซ้ำ)
              <br />
              กรอกครบทั้งชื่อและคำอธิบายเมื่อไหร่ หน้าอังกฤษจะถูกเปิดใช้ตอนกดเผยแพร่ครั้งถัดไป
            </>
          )}
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium">ชื่อบทความภาษาอังกฤษ (title)</label>
          <Input
            value={titleEn}
            placeholder="เช่น How to Clean a Fabric Sofa at Home"
            onChange={(event) => patchDraft({ titleEn: event.target.value })}
            className="h-9"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium">คำอธิบายบนหน้า Google ภาษาอังกฤษ (meta description)</label>
          <Textarea
            value={metaDescriptionEn}
            rows={4}
            placeholder="สรุปเนื้อหาบทความเป็นภาษาอังกฤษ 1–2 ประโยค"
            onChange={(event) => patchDraft({ metaDescriptionEn: event.target.value })}
          />
          <p
            className={cn("text-xs", metaLength > META_DESCRIPTION_LIMIT ? "text-amber-600" : "text-muted-foreground")}
          >
            {metaLength}/{META_DESCRIPTION_LIMIT} ตัวอักษร
            {metaLength > META_DESCRIPTION_LIMIT && " — ยาวเกิน Google จะตัดท้ายทิ้ง"}
          </p>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium">คำค้นภาษาอังกฤษ (คั่นด้วย , — คำแรกคือคำเป้าหมาย)</label>
          <Input
            value={keywordText}
            placeholder="sofa cleaning, fabric sofa care"
            onChange={(event) => setKeywordText(event.target.value)}
            onBlur={() =>
              patchDraft({
                keywordsEn: keywordText
                  .split(",")
                  .map((keyword) => keyword.trim())
                  .filter(Boolean),
              })
            }
          />
        </div>

        {isPartial && (
          <p className="text-xs text-amber-600">
            [SEO-EDT-40] ต้องกรอกทั้งชื่อและคำอธิบายภาษาอังกฤษ — กรอกอย่างเดียวจะบันทึกไม่ผ่าน
            เพราะหน้าอังกฤษที่ขาดอย่างใดอย่างหนึ่งขึ้นเว็บไปก็ติดอันดับไม่ได้
          </p>
        )}

        {hasAnyEnInput &&
          // ยืนยันในที่ (เปลี่ยนแถวปุ่มเป็นคำถาม) ตามกฎห้ามใช้ Swal เป็น confirm
          (confirmingClear ? (
            <div className="rounded-md border border-destructive/40 bg-destructive/5 p-2.5">
              <p className="text-xs">
                ลบข้อมูลอังกฤษทั้งชุด? หลังกดบันทึกและเผยแพร่ หน้า{" "}
                <code className="font-medium">/en/blog/{slug || "…"}</code> จะกลายเป็น 404
              </p>
              <div className="mt-2 flex gap-2">
                <Button type="button" size="sm" variant="destructive" onClick={handleClear}>
                  ลบเลย
                </Button>
                <Button type="button" size="sm" variant="ghost" onClick={() => setConfirmingClear(false)}>
                  ไม่ลบ
                </Button>
              </div>
            </div>
          ) : (
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="self-start text-muted-foreground hover:text-destructive"
              onClick={() => setConfirmingClear(true)}
            >
              ลบข้อมูลภาษาอังกฤษทั้งหมด
            </Button>
          ))}
      </CollapsibleContent>
    </Collapsible>
  );
};
