"use client";

import React, { useEffect, useRef, useState } from "react";
import { SeoArticleJobType } from "@prisma/client";
import { Camera, ChartNoAxesColumn, Loader2, Sparkles, Wand2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { MAX_IMAGE_DESCRIPTION_LENGTH, type SingleImageStyle } from "../server/build-single-image-prompt.helper";
import { useQueueSeoArticleJob } from "../tanstack/queue-seo-article-job.mutation";
import { useSeoArticleImageJob } from "../tanstack/use-seo-article-image-job";
import { useSeoArticleEditorStore } from "../zustand/seo-article-editor.store";
import { SeoArticleAutoGrowTextarea } from "./seo-article-auto-grow-textarea";

interface SeoArticleAiImagePromptProps {
  /** cover = รูปปกหัวบทความ, inline = รูปแทรกในเนื้อหา */
  placement: "cover" | "inline";
  /** หัวข้อที่บล็อกรูปอยู่ใกล้ที่สุด — ส่งไปเป็นบริบทให้ภาพเข้ากับหัวข้อนั้น */
  nearbyHeading?: string;
  /** เนื้อความรอบ ๆ จุดที่จะแทรกรูป — บริบทให้ AI คิดคำสั่งวาดเองตอนผู้ใช้ไม่พิมพ์อะไร */
  nearbyText?: string;
  /** คำอธิบายตั้งต้น — ใส่ตอนกด "วาดใหม่" เพื่อให้แก้คำสั่งเดิมต่อได้ ไม่ต้องพิมพ์ใหม่ทั้งหมด */
  defaultDescription?: string;
  /** สไตล์ตั้งต้น — แทรกจากเมนู "/อินโฟกราฟิก" จะส่ง "infographic" มาให้เลือกไว้ให้ */
  defaultStyle?: SingleImageStyle;
  /** true = เริ่มสั่งวาดทันทีที่ประกอบหน้าจอ (มาจากเมนู "/" ที่ผู้ใช้เลือกให้ AI วาดเอง) */
  autoStart?: boolean;
  /**
   * จุดที่รูปจะไปลง — id ของบล็อกรูป หรือ "cover"
   * ช่องนี้แค่ "สั่ง" แล้วจำเลข job ไว้ในสโตร์ **คนวางรูปจริงคือตัวบล็อก** ที่อยู่บนหน้าตลอด
   * จึงปิดช่องนี้ระหว่างรอ หรือออกไปหน้าอื่นแล้วกลับมา รูปก็ยังลงถูกที่
   */
  slotId: string;
  /** ปิดช่องสั่งวาด (ไม่ส่งมา = ไม่มีปุ่มปิด) */
  onCancelAction?: () => void;
}

/** ปุ่มเลือกสไตล์ภาพ — ป้ายต้องบอกผลลัพธ์ ไม่ใช่ศัพท์เทคนิค */
const STYLE_OPTIONS: { value: SingleImageStyle; label: string; icon: typeof Camera }[] = [
  { value: "photo", label: "ภาพถ่าย", icon: Camera },
  { value: "infographic", label: "อินโฟกราฟิก", icon: ChartNoAxesColumn },
];

/** ข้อความบอกสถานะระหว่างรอ — การสร้างภาพยังใช้เวลาหลายสิบวินาที ต้องบอกให้ชัดว่ายังไม่ค้าง */
const buildWaitingLabel = (seconds: number): string => {
  if (seconds < 10) return `ส่งคำสั่งให้ AI แล้ว... (${seconds} วินาที)`;
  if (seconds < 30) return `AI กำลังวาดอยู่ ใช้เวลาราว 15-40 วินาที... (${seconds} วินาที)`;
  return `ยังวาดอยู่ — งานทำเบื้องหลัง รูปจะเข้าคลังรูปแม้ปิดหน้านี้ไป (${seconds} วินาที)`;
};

/**
 * @description ช่องสั่ง "ให้ AI วาดรูป" — พิมพ์บอกว่าอยากได้ภาพอะไร แล้วกดสั่งวาดด้วย gpt-image-2.5-sunburst
 * @page /super-admin/hurry-web/seo-article?edit=<id>
 * @access super-admin
 * @parent {@link seo-article-image-block.tsx}, {@link seo-article-cover-banner.tsx}
 * @props { placement, slotId, nearbyHeading?, defaultDescription?, onCancelAction? }
 * @features
 * - ใช้ร่วมกันทั้งบล็อกรูปในเนื้อหาและรูปปก — เปลี่ยนแค่ `placement` ที่ส่งไปคุมมุมภาพ
 * - ระหว่างรอมีตัวนับวินาทีเดินจริง + ข้อความเปลี่ยนตามช่วงเวลา (ห้ามให้ดูเหมือนค้าง)
 * - Ctrl/⌘+Enter สั่งวาดได้เลย, มีตัวนับตัวอักษรเตือนเมื่อใกล้เพดาน
 * - วาดเสร็จ **ไม่เขียนเนื้อบทความในฐาน** — รูปลงร่างในหน้าแก้ไข แล้วลงฐานตอนกดบันทึกเท่านั้น
 * - **กดแล้วเข้าคิว ไม่ยืนรอ**: ปุ่มหมุนตามสถานะ job ใน DB งานจึงเดินต่อแม้ผู้ใช้จะไปทำอย่างอื่น
 * - ช่องนี้ทำแค่ 2 อย่าง: สั่งงาน + จำเลข job ลงสโตร์ — **คนวางรูปคือตัวบล็อก** ที่อยู่บนหน้าตลอด
 *   ปิดช่องนี้ระหว่างรอ (หรือออกไปหน้าอื่นแล้วกลับมา) รูปก็ยังลงถูกที่
 * @logic
 * - `stopPropagation` ทุก keystroke: กล่องนี้อยู่ในผืน BlockNote ถ้าไม่กัน ProseMirror จะแย่งคีย์ไปทำ shortcut
 * - ไม่มี seoArticleId ใน store (ยังไม่ได้เปิดหน้าแก้ไข) = ปิดปุ่มไว้ เพราะ action ต้องใช้ id ไปดึงบริบทบทความ
 * @dependencies useQueueSeoArticleJob, useSeoArticleImageJob, useSeoArticleEditorStore
 * @related {@link ../server/run-single-image-job.helper.ts}
 */
export const SeoArticleAiImagePrompt = ({
  placement,
  nearbyHeading,
  nearbyText,
  defaultDescription = "",
  defaultStyle = "photo",
  autoStart = false,
  slotId,
  onCancelAction,
}: SeoArticleAiImagePromptProps) => {
  const seoArticleId = useSeoArticleEditorStore((state) => state.seoArticleId);
  const setPendingImageJob = useSeoArticleEditorStore((state) => state.setPendingImageJob);
  const { mutate: queueJob } = useQueueSeoArticleJob();

  // กดแล้วได้แค่ "รับงาน" — เลข job ไปอยู่ในสโตร์ ตัวบล็อกเป็นคนรอผลแล้ววางรูปเอง
  const { isPending, pendingJob } = useSeoArticleImageJob(slotId);

  const [description, setDescription] = useState(defaultDescription);
  const [style, setStyle] = useState<SingleImageStyle>(defaultStyle);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  /**
   * ตัวนับวินาทีระหว่างรอ — นับจาก **เวลาที่ job เข้าคิวจริง** ไม่ใช่เวลาที่ component นี้ประกอบ
   * ปิดช่องสั่งวาดแล้วเปิดใหม่ระหว่างรอ ตัวเลขจึงเดินต่อ ไม่ใช่ย้อนกลับไป 0 ให้ดูเหมือนเริ่มใหม่
   */
  const queuedAtMs = pendingJob ? new Date(pendingJob.createdAt).getTime() : 0;
  useEffect(() => {
    if (!isPending || queuedAtMs === 0) return;

    const tick = () => setElapsedSeconds(Math.max(0, Math.round((Date.now() - queuedAtMs) / 1000)));
    tick();
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, [isPending, queuedAtMs]);

  const trimmed = description.trim();
  const isTooLong = trimmed.length > MAX_IMAGE_DESCRIPTION_LENGTH;
  const isReady = seoArticleId != null && !isTooLong && !isPending;
  /** สั่งวาดตามคำสั่งที่พิมพ์ — ต้องมีข้อความ; ส่วนทางอัตโนมัติไม่ต้อง (ดู handleGenerate) */
  const canSubmit = isReady && trimmed.length > 0;

  /**
   * สั่งวาด — `auto` = ไม่ส่งคำสั่งไป ปล่อยให้ AI อ่านบทความแล้วคิดเอง
   * คำสั่งที่ AI คิดจะถูกส่งกลับมาใน result.data.description แล้วเติมลงช่อง
   * เพื่อให้ผู้ใช้เห็นว่ามันสั่งวาดอะไร และแก้ต่อแล้วกดวาดใหม่ได้
   */
  const handleGenerate = (auto = false) => {
    if (seoArticleId == null || !isReady) return;
    if (!auto && trimmed.length === 0) return;

    setElapsedSeconds(0);

    queueJob(
      {
        jobType: SeoArticleJobType.SINGLE_IMAGE,
        seoArticleId,
        payload: {
          ...(auto ? {} : { description: trimmed }),
          ...(nearbyHeading ? { nearbyHeading } : {}),
          ...(nearbyText ? { nearbyText } : {}),
          placement,
          style,
        },
      },
      {
        onSuccess: (result) => {
          if (result.status !== "ok" || !result.data) return;
          setPendingImageJob(slotId, result.data.seoArticleJobId);
        },
      }
    );
  };

  // แทรกจากเมนู "/" แบบให้ AI วาดเอง → เริ่มวาดทันที ผู้ใช้ไม่ต้องกดซ้ำ
  // ref กันยิงซ้ำ: component นี้ re-render ทุกครั้งที่ตัวนับวินาทีเดิน
  const autoStartedRef = useRef(false);
  useEffect(() => {
    if (!autoStart || autoStartedRef.current || seoArticleId == null) return;
    autoStartedRef.current = true;
    handleGenerate(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoStart, seoArticleId]);

  return (
    <div
      className="flex flex-col gap-2 rounded-lg border border-primary/30 bg-primary/5 p-2.5"
      onKeyDown={(event) => event.stopPropagation()}
    >
      <div className="flex items-center gap-1.5 text-xs font-medium">
        <Sparkles className="size-3.5 text-primary" />
        ให้ AI วาดรูป
        {onCancelAction && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="ml-auto size-6"
            disabled={isPending}
            onClick={onCancelAction}
            title="ปิดช่องสั่งวาด"
          >
            <X className="size-3.5" />
          </Button>
        )}
      </div>

      {/* เลือกชนิดภาพก่อนพิมพ์ — คุมทั้งคำสั่งที่ AI คิดให้และโทนภาพปลายทาง */}
      <div className="flex flex-wrap items-center gap-1">
        {STYLE_OPTIONS.map((option) => {
          const Icon = option.icon;
          const isActive = style === option.value;
          return (
            <Button
              key={option.value}
              type="button"
              size="sm"
              variant={isActive ? "default" : "outline"}
              className="h-7 gap-1.5 px-2.5 text-xs"
              disabled={isPending}
              onClick={() => setStyle(option.value)}
            >
              <Icon className="size-3.5" />
              {option.label}
            </Button>
          );
        })}
        {style === "infographic" && (
          <span className="text-[11px] text-amber-600">ตัวหนังสือไทยในภาพอาจเพี้ยน ถ้าไม่สวยให้สั่งวาดใหม่</span>
        )}
      </div>

      <SeoArticleAutoGrowTextarea
        value={description}
        onValueChangeAction={setDescription}
        minHeightPx={52}
        disabled={isPending}
        placeholder={
          style === "infographic"
            ? "อยากได้แผนภาพอะไร เช่น ขั้นตอนซักพรม 3 ขั้น หรือเปรียบเทียบก่อน-หลัง (เว้นว่างไว้ก็ได้ ให้ AI คิดเอง)"
            : placement === "cover"
              ? "อยากได้รูปปกแบบไหน เช่น ห้องนอนสว่าง ๆ มีช่างกำลังซักที่นอนด้วยเครื่องอัดฉีดน้ำร้อน (เว้นว่างไว้ก็ได้ ให้ AI คิดเอง)"
              : "อยากได้ภาพอะไร เช่น ภาพใกล้ ๆ ของคราบเหลืองบนที่นอน เห็นเนื้อผ้าชัด (เว้นว่างไว้ก็ได้ ให้ AI คิดเอง)"
        }
        // ⌘/Ctrl+Enter = สั่งวาด (Enter เปล่าไว้ขึ้นบรรทัดใหม่ตามปกติ)
        onKeyDown={(event) => {
          if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
            event.preventDefault();
            handleGenerate();
          }
        }}
        className="rounded-md border bg-background p-2 text-sm"
      />

      <div className="flex flex-wrap items-center gap-2">
        <Button type="button" size="sm" className="h-8 gap-1.5" disabled={!canSubmit} onClick={() => handleGenerate()}>
          {isPending ? <Loader2 className="size-3.5 animate-spin" /> : <Sparkles className="size-3.5" />}
          {isPending ? "กำลังวาดเบื้องหลัง..." : "สั่งวาด"}
        </Button>

        {/* ไม่อยากคิดเอง — ให้ AI อ่านบทความแล้วตัดสินใจแทนทั้งหมด */}
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="h-8 gap-1.5"
          disabled={!isReady}
          title="ให้ AI อ่านบทความตรงจุดนี้แล้วคิดเองว่าควรวาดอะไร"
          onClick={() => handleGenerate(true)}
        >
          <Wand2 className="size-3.5" />
          ให้ AI คิดให้
        </Button>

        {isPending ? (
          <span className="text-xs text-muted-foreground">{buildWaitingLabel(elapsedSeconds)}</span>
        ) : (
          <span className={cn("text-xs text-muted-foreground", isTooLong && "text-destructive")}>
            {trimmed.length}/{MAX_IMAGE_DESCRIPTION_LENGTH} ตัวอักษร · รูปที่วาดจะยังไม่ถูกบันทึกจนกว่าจะกดบันทึกบทความ
          </span>
        )}
      </div>
    </div>
  );
};
