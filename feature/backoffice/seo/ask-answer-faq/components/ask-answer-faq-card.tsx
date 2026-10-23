"use client";

import React, { useState } from "react";
import { AskAnswerFaqStatus } from "@prisma/client";
import { Check, ExternalLink, Languages, Pencil, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useUpdateAskAnswerFaq } from "../tanstack/update-ask-answer-faq.mutation";
import { useRejectAskAnswerFaq } from "../tanstack/reject-ask-answer-faq.mutation";
import type { AskAnswerFaqItem } from "../type/ask-answer-faq-item.type";

/** ป้ายสถานะ — ค่าเดียวกับที่ prisma enum ประกาศไว้ */
const STATUS_LABEL: Record<AskAnswerFaqStatus, { text: string; className: string }> = {
  DRAFT: { text: "รอตรวจ", className: "bg-amber-100 text-amber-800 hover:bg-amber-100" },
  PUBLISHED: { text: "อยู่บนเว็บแล้ว", className: "bg-emerald-100 text-emerald-800 hover:bg-emerald-100" },
  REJECTED: { text: "ปัดตก", className: "bg-slate-200 text-slate-700 hover:bg-slate-200" },
};

interface AskAnswerFaqCardProps {
  faq: AskAnswerFaqItem;
  /** ติ๊กเลือกไว้เผยแพร่หรือยัง (เฉพาะข้อ DRAFT) */
  selected: boolean;
  onToggleSelect: (askAnswerFaqId: number, next: boolean) => void;
}

/**
 * @description การ์ด 1 ข้อถาม-ตอบที่ AI เสนอ — อ่าน/แก้คำ/ปัดตก/ติ๊กเลือกเผยแพร่
 * @page /super-admin/hurry-web/seo-article?section=faq
 * @parent {@link ask-answer-faq-section.tsx}
 * @access super-admin
 * @props { faq: AskAnswerFaqItem, selected: boolean, onToggleSelect }
 * @features
 * - โหมดอ่าน: คำถาม/คำตอบไทย + ฉบับอังกฤษพับไว้ + เหตุผลและหลักฐานที่ AI อ้าง (ไม่ขึ้นเว็บ)
 * - โหมดแก้ไข: แก้ได้ทั้ง 4 ช่อง (ไทย/อังกฤษ) — ยืนยันในที่ ไม่เด้ง Swal ถาม (ตาม 03-code-patterns 4.5)
 * - ปัดตก = สลับการ์ดเป็นแถบยืนยันในที่เดียวกัน ไม่ใช้ window.confirm/Swal ซ้อน
 * - เฉพาะข้อ DRAFT ที่มี checkbox — ข้อที่ขึ้นเว็บแล้วแก้ที่นี่ไม่ได้ (ต้องไปแก้ผ่าน preview editor)
 * @dependencies useUpdateAskAnswerFaq, useRejectAskAnswerFaq
 * @related type: {@link ../type/ask-answer-faq-item.type.ts}
 */
export const AskAnswerFaqCard = ({ faq, selected, onToggleSelect }: AskAnswerFaqCardProps) => {
  const [mode, setMode] = useState<"read" | "edit" | "confirm-reject">("read");
  const [question, setQuestion] = useState(faq.question);
  const [answer, setAnswer] = useState(faq.answer);
  const [questionEn, setQuestionEn] = useState(faq.questionEn ?? "");
  const [answerEn, setAnswerEn] = useState(faq.answerEn ?? "");
  const [rejectReason, setRejectReason] = useState("");

  const { mutate: save, isPending: isSaving } = useUpdateAskAnswerFaq();
  const { mutate: reject, isPending: isRejecting } = useRejectAskAnswerFaq();

  const isDraft = faq.status === AskAnswerFaqStatus.DRAFT;
  const status = STATUS_LABEL[faq.status];

  /** ออกจากโหมดแก้ไขแล้วคืนค่าที่ยังไม่บันทึกกลับเป็นของเดิม (ไม่งั้นกดยกเลิกแล้วค่าค้างในช่อง) */
  const cancelEdit = () => {
    setQuestion(faq.question);
    setAnswer(faq.answer);
    setQuestionEn(faq.questionEn ?? "");
    setAnswerEn(faq.answerEn ?? "");
    setMode("read");
  };

  return (
    <Card className="flex flex-col gap-3 p-4">
      {/* ===== หัวการ์ด: checkbox + สถานะ + ปุ่ม ===== */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 flex-1 items-start gap-2">
          {isDraft && mode === "read" && (
            <Checkbox
              checked={selected}
              onCheckedChange={(next) => onToggleSelect(faq.askAnswerFaqId, next === true)}
              className="mt-1 shrink-0"
              aria-label="เลือกข้อนี้เพื่อเผยแพร่"
            />
          )}
          <div className="min-w-0 flex-1">
            {mode === "edit" ? (
              <Input value={question} onChange={(event) => setQuestion(event.target.value)} className="h-9" />
            ) : (
              <p className="break-words text-sm font-semibold">{faq.question}</p>
            )}
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-1.5">
          <Badge className={status.className}>{status.text}</Badge>
          {!faq.hasEn && <Badge variant="outline">ยังไม่มี EN</Badge>}
        </div>
      </div>

      {/* ===== เนื้อคำตอบ ===== */}
      {mode === "edit" ? (
        <div className="flex flex-col gap-2">
          <Textarea
            value={answer}
            onChange={(event) => setAnswer(event.target.value)}
            rows={6}
            className="text-sm"
            placeholder="คำตอบภาษาไทย (ขึ้นบรรทัดใหม่ได้)"
          />
          <p className="text-xs font-medium text-muted-foreground">ฉบับภาษาอังกฤษ (เว้นว่างทั้งคู่ = ไม่มีฉบับ EN)</p>
          <Input
            value={questionEn}
            onChange={(event) => setQuestionEn(event.target.value)}
            className="h-9"
            placeholder="Question"
          />
          <Textarea
            value={answerEn}
            onChange={(event) => setAnswerEn(event.target.value)}
            rows={6}
            className="text-sm"
            placeholder="Answer"
          />
        </div>
      ) : (
        <div className="whitespace-pre-line break-words text-sm text-muted-foreground">{faq.answer}</div>
      )}

      {/* ===== ฉบับ EN (โหมดอ่าน) ===== */}
      {mode === "read" && faq.hasEn && (
        <details className="rounded-md border bg-muted/40 p-2">
          <summary className="flex cursor-pointer items-center gap-1.5 text-xs font-medium">
            <Languages className="h-3.5 w-3.5" />
            ฉบับภาษาอังกฤษ
          </summary>
          <p className="mt-2 text-sm font-semibold">{faq.questionEn}</p>
          <p className="mt-1 whitespace-pre-line text-sm text-muted-foreground">{faq.answerEn}</p>
        </details>
      )}

      {/* ===== ข้อมูลประกอบการตัดสินใจ — ไม่ขึ้นเว็บ ===== */}
      {mode === "read" && (faq.reason || faq.proofNote || faq.targetKeyword || faq.relatedSlug) && (
        <div className="flex flex-col gap-1 rounded-md border border-dashed p-2 text-xs text-muted-foreground">
          {faq.reason && <p>เหตุผลที่ AI เสนอ: {faq.reason}</p>}
          {faq.proofNote && faq.proofNote !== "-" && <p>ตัวเลขที่อ้าง: {faq.proofNote}</p>}
          <div className="flex flex-wrap items-center gap-2">
            {faq.targetKeyword && <span>คำค้นเป้าหมาย: {faq.targetKeyword}</span>}
            {faq.relatedSlug && (
              <a
                href={`/blog/${faq.relatedSlug}/`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-primary hover:underline"
              >
                /blog/{faq.relatedSlug}
                <ExternalLink className="h-3 w-3" />
              </a>
            )}
          </div>
        </div>
      )}

      {/* ===== แถบยืนยันปัดตก (แทนที่ปุ่มในที่เดิม ไม่เด้ง dialog ซ้อน) ===== */}
      {mode === "confirm-reject" ? (
        <div className="flex flex-col gap-2 rounded-md border border-destructive/40 bg-destructive/5 p-2">
          <p className="text-xs font-medium">ปัดตกข้อนี้? (เก็บไว้ในระบบเพื่อกัน AI เสนอคำถามเดิมซ้ำ)</p>
          <Input
            value={rejectReason}
            onChange={(event) => setRejectReason(event.target.value)}
            className="h-9"
            placeholder="เหตุผล (ไม่บังคับ)"
          />
          <div className="flex justify-end gap-2">
            <Button variant="ghost" size="sm" onClick={() => setMode("read")} disabled={isRejecting}>
              กลับ
            </Button>
            <Button
              variant="destructive"
              size="sm"
              disabled={isRejecting}
              onClick={() =>
                reject(
                  {
                    askAnswerFaqId: faq.askAnswerFaqId,
                    ...(rejectReason.trim() ? { reason: rejectReason.trim() } : {}),
                  },
                  { onSuccess: () => setMode("read") }
                )
              }
            >
              ยืนยันปัดตก
            </Button>
          </div>
        </div>
      ) : (
        isDraft && (
          <div className="flex justify-end gap-2">
            {mode === "edit" ? (
              <>
                <Button variant="ghost" size="sm" onClick={cancelEdit} disabled={isSaving} className="gap-1">
                  <X className="h-4 w-4" />
                  ยกเลิก
                </Button>
                <Button
                  size="sm"
                  disabled={isSaving}
                  className="gap-1"
                  onClick={() =>
                    save(
                      {
                        askAnswerFaqId: faq.askAnswerFaqId,
                        question,
                        answer,
                        questionEn,
                        answerEn,
                      },
                      { onSuccess: (result) => result.status === "ok" && setMode("read") }
                    )
                  }
                >
                  <Check className="h-4 w-4" />
                  บันทึก
                </Button>
              </>
            ) : (
              <>
                <Button variant="ghost" size="sm" onClick={() => setMode("confirm-reject")} className="gap-1">
                  <X className="h-4 w-4" />
                  ปัดตก
                </Button>
                <Button variant="outline" size="sm" onClick={() => setMode("edit")} className="gap-1">
                  <Pencil className="h-4 w-4" />
                  แก้คำ
                </Button>
              </>
            )}
          </div>
        )
      )}
    </Card>
  );
};
