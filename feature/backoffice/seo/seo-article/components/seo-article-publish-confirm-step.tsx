"use client";

import React, { useMemo } from "react";
import { AlertTriangle, ArrowLeft, Loader2, Rocket } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { serializeBlocksToText } from "../helper/serialize-blocks-to-text.helper";
import { useSeoArticleEditorStore } from "../zustand/seo-article-editor.store";

interface SeoArticlePublishConfirmStepProps {
  isSaving: boolean;
  onBack: () => void;
  onConfirm: () => void;
}

/** หนึ่งบรรทัดของตารางเทียบ "เดิม → ใหม่" */
const CompareRow = ({ label, before, after }: { label: string; before: string; after: string }) => {
  const isChanged = before !== after;

  return (
    <div className="grid grid-cols-[110px_1fr] gap-2 border-b py-1.5 text-sm last:border-b-0">
      <span className="text-muted-foreground">{label}</span>
      {isChanged ? (
        <span className="min-w-0 break-words">
          <span className="text-destructive line-through">{before || "—"}</span>
          <span className="mx-1.5 text-muted-foreground">→</span>
          <span className="font-medium text-emerald-700">{after || "—"}</span>
        </span>
      ) : (
        <span className="min-w-0 break-words text-muted-foreground">{after || "—"} (ไม่เปลี่ยน)</span>
      )}
    </div>
  );
};

/**
 * @description หน้ายืนยันก่อนเผยแพร่ทับบทความที่อยู่บนเว็บแล้ว — แทน content ทั้งหน้า ไม่ใช่ dialog ซ้อน
 * @page /super-admin/hurry-web/seo-article?edit=<id>
 * @access super-admin
 * @parent {@link seo-article-editor-page.tsx}
 * @props { isSaving: boolean, onBack: () => void, onConfirm: () => void }
 * @features
 * - เทียบให้เห็น "เดิม → ใหม่" ของชื่อ/URL/จำนวนบล็อก/จำนวนคำ/FAQ ก่อนกดยืนยัน
 * - บอกผลลัพธ์ตรง ๆ ว่าการกดยืนยัน = commit ขึ้น GitHub ของ hurry-web = เว็บ deploy ใหม่
 * - ตามกฎ repo: **ห้ามใช้ Swal เป็น confirm** — ใช้วิธีสลับ content ทั้งหน้าแทน
 * @dependencies useSeoArticleEditorStore (baseline = ของบนเว็บตอนนี้, draft = ของที่กำลังจะทับ)
 */
export const SeoArticlePublishConfirmStep = ({ isSaving, onBack, onConfirm }: SeoArticlePublishConfirmStepProps) => {
  const baseline = useSeoArticleEditorStore((state) => state.baseline);
  const draft = useSeoArticleEditorStore((state) => state.draft);

  const summary = useMemo(() => {
    if (!baseline || !draft) return null;

    const countWords = (text: string) => text.split(/\s+/).filter(Boolean).length;

    return {
      title: { before: baseline.title, after: draft.title },
      slug: { before: baseline.slug, after: draft.slug },
      blocks: { before: String(baseline.content.blocks.length), after: String(draft.content.blocks.length) },
      words: {
        before: String(countWords(serializeBlocksToText(baseline.content.blocks))),
        after: String(countWords(serializeBlocksToText(draft.content.blocks))),
      },
      faq: { before: String(baseline.content.faq.length), after: String(draft.content.faq.length) },
    };
  }, [baseline, draft]);

  if (!summary) return null;

  return (
    <div className="flex flex-col gap-3">
      <Card className="flex flex-col gap-3 p-4">
        <div className="flex items-start gap-3 rounded-md border border-amber-200 bg-amber-50 p-3">
          <AlertTriangle className="mt-0.5 size-5 shrink-0 text-amber-600" />
          <div className="text-sm">
            <p className="font-medium">บทความนี้อยู่บนเว็บจริงแล้ว การยืนยันจะทับของเดิมทันที</p>
            <p className="text-muted-foreground">
              หน้า <span className="font-mono text-xs">/blog/{draft?.slug}/</span> จะแสดงเนื้อหาใหม่ทันทีหลังยืนยัน
            </p>
          </div>
        </div>

        <div className="rounded-md border p-3">
          <p className="mb-1 text-sm font-medium">สิ่งที่จะเปลี่ยน</p>
          <CompareRow label="ชื่อบทความ" before={summary.title.before} after={summary.title.after} />
          <CompareRow label="URL" before={summary.slug.before} after={summary.slug.after} />
          <CompareRow label="จำนวนบล็อก" before={summary.blocks.before} after={summary.blocks.after} />
          <CompareRow label="จำนวนคำ" before={summary.words.before} after={summary.words.after} />
          <CompareRow label="จำนวน FAQ" before={summary.faq.before} after={summary.faq.after} />
        </div>

        <div className="flex flex-col gap-2 md:flex-row md:justify-between">
          <Button type="button" variant="outline" onClick={onBack} disabled={isSaving} className="gap-1.5">
            <ArrowLeft className="size-4" />
            กลับไปแก้ต่อ
          </Button>
          <Button type="button" onClick={onConfirm} disabled={isSaving} className="gap-1.5">
            {isSaving ? <Loader2 className="size-4 animate-spin" /> : <Rocket className="size-4" />}
            ยืนยันเผยแพร่ทับของเดิม
          </Button>
        </div>
      </Card>
    </div>
  );
};
