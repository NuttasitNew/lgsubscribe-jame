"use client";

import React, { useState } from "react";
import { Lock } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { useSeoArticleEditorStore } from "../zustand/seo-article-editor.store";
import type { SeoArticleCategory } from "../type/seo-article-content.type";
import { SEO_ARTICLE_CATEGORY_LABEL } from "./seo-article-category-label";

/** ความยาว meta description ที่ Google ตัดจอ — เกินนี้ท้ายประโยคจะไม่ถูกแสดง */
const META_DESCRIPTION_LIMIT = 160;

/** รูปแบบ slug ที่เว็บยอมรับ (เว็บ hurry-web guard ด้วย regex ตัวเดียวกันก่อนอ่านไฟล์) */
const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

interface SeoArticleMetaFormProps {
  /** true = บทความเผยแพร่แล้ว → ล็อก slug ห้ามแก้ */
  isPublished: boolean;
}

/**
 * @description ฟอร์มข้อมูล SEO ที่ผู้อ่านไม่เห็นบนหน้าเว็บ (URL/meta description/คำค้น/หมวด) — อยู่คอลัมน์ขวาของหน้าแก้ไข
 * @page /super-admin/hurry-web/seo-article?edit=<id>
 * @access super-admin
 * @parent {@link seo-article-editor-page.tsx}
 * @props { isPublished: boolean }
 * @features
 * - **ไม่มีช่องชื่อบทความแล้ว** — ชื่อบทความคือ H1 ที่ผู้อ่านเห็น จึงย้ายไปแก้ในที่บนแถบรูปปกของผืนเอกสาร
 *   ({@link seo-article-title-field.tsx}) เหลือไว้ที่นี่เฉพาะข้อมูลที่ไม่ปรากฏในตัวบทความ
 * - บทความที่เผยแพร่แล้ว **ล็อก slug** — เปลี่ยนแล้ว URL เดิมที่ Google เก็บไว้จะกลายเป็น 404 ทันที [SEO-EDT-20]
 * - นับความยาว meta description เทียบเพดาน 160 ตัว (เกินแล้วเตือน ไม่ได้บล็อก)
 * - คำค้นกรอกเป็นข้อความคั่นจุลภาค แต่เก็บลง state ตอนออกจากช่อง (ไม่ตัดคำระหว่างพิมพ์)
 *   แยกคำเป้าหมายหลักออกจากคำที่เกี่ยวข้อง เพื่อไม่ให้การจัดลำดับคำเปลี่ยนเป้าหมายบทความ
 * @dependencies useSeoArticleEditorStore (selector ทีละ field ตามกฎ ห้าม destructure ทั้ง store)
 */
export const SeoArticleMetaForm = ({ isPublished }: SeoArticleMetaFormProps) => {
  const slug = useSeoArticleEditorStore((state) => state.draft?.slug ?? "");
  const metaDescription = useSeoArticleEditorStore((state) => state.draft?.metaDescription ?? "");
  const targetKeyword = useSeoArticleEditorStore((state) => state.draft?.targetKeyword ?? "");
  const keywords = useSeoArticleEditorStore((state) => state.draft?.keywords);
  const category = useSeoArticleEditorStore((state) => state.draft?.content.category ?? "careTips");
  const patchDraft = useSeoArticleEditorStore((state) => state.patchDraft);
  const patchContent = useSeoArticleEditorStore((state) => state.patchContent);

  // เก็บข้อความดิบไว้ที่นี่ แล้วค่อยตัดเป็น array ตอน blur — ถ้าตัดทุกตัวอักษร ผู้ใช้จะพิมพ์ ", " ไม่ได้
  const [keywordText, setKeywordText] = useState(() => (keywords ?? []).join(", "));

  const isSlugValid = SLUG_PATTERN.test(slug.trim());
  const metaLength = metaDescription.trim().length;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-1">
        <label className="flex items-center gap-1.5 text-sm font-medium">
          URL ของบทความ
          {isPublished && <Lock className="size-3.5 text-muted-foreground" />}
        </label>
        <div className="flex items-center gap-1.5">
          <span className="shrink-0 text-xs text-muted-foreground">/blog/</span>
          <Input
            value={slug}
            disabled={isPublished}
            onChange={(event) => patchDraft({ slug: event.target.value })}
            className={cn("h-9", !isPublished && !isSlugValid && "border-destructive focus-visible:ring-destructive")}
          />
        </div>
        {isPublished ? (
          <p className="text-xs text-muted-foreground">
            [SEO-EDT-20] บทความเผยแพร่แล้วห้ามเปลี่ยน URL — ลิงก์เดิมที่ Google เก็บไว้จะกลายเป็นหน้า 404 ทันที
          </p>
        ) : (
          !isSlugValid && (
            <p className="text-xs text-destructive">
              [SEO-EDT-21] URL ต้องเป็นภาษาอังกฤษพิมพ์เล็ก คั่นคำด้วย - เท่านั้น (เช่น mattress-cleaning-guide)
            </p>
          )
        )}
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium">คำอธิบายใต้ชื่อบนหน้า Google (meta description)</label>
        {/* 4 บรรทัดพอดีกับความยาวเต็มโควตา (155 ตัวอักษร) — จะได้เห็นข้อความครบโดยไม่ต้องสกรอลล์ในช่อง */}
        <Textarea
          value={metaDescription}
          rows={4}
          onChange={(event) => patchDraft({ metaDescription: event.target.value })}
        />
        <p className={cn("text-xs", metaLength > META_DESCRIPTION_LIMIT ? "text-amber-600" : "text-muted-foreground")}>
          {metaLength}/{META_DESCRIPTION_LIMIT} ตัวอักษร
          {metaLength > META_DESCRIPTION_LIMIT && " — ยาวเกิน Google จะตัดท้ายทิ้ง"}
        </p>
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="seo-target-keyword" className="text-sm font-medium">
          คำค้นหลักที่ต้องการวัดผล
        </label>
        <Input
          id="seo-target-keyword"
          value={targetKeyword}
          onChange={(event) => patchDraft({ targetKeyword: event.target.value || null })}
        />
        <p className="text-xs text-muted-foreground">
          เลือกหนึ่งคำให้ตรงกับคำถามหลักของบทความ แยกจากคำค้นที่เกี่ยวข้อง
        </p>
      </div>
      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium">คำค้นที่เกี่ยวข้อง (คั่นด้วย ,)</label>
        <Input
          value={keywordText}
          onChange={(event) => setKeywordText(event.target.value)}
          onBlur={() =>
            patchDraft({
              keywords: keywordText
                .split(",")
                .map((keyword) => keyword.trim())
                .filter(Boolean),
            })
          }
        />
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium">หมวดบนหน้า /blog</label>
        <Select value={category} onValueChange={(value) => patchContent({ category: value as SeoArticleCategory })}>
          <SelectTrigger className="h-9">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {(Object.keys(SEO_ARTICLE_CATEGORY_LABEL) as SeoArticleCategory[]).map((key) => (
              <SelectItem key={key} value={key}>
                {SEO_ARTICLE_CATEGORY_LABEL[key]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
};
