"use client";

import React, { useEffect, useRef, useState } from "react";
import { SeoArticleImagePlacement } from "@prisma/client";
import { ImagePlus, Loader2, RefreshCw, Sparkles, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { compressImageFile } from "@/lib/seo/helper/compress-image";
import { uploadHurryWebImage } from "../../shared/upload-hurry-web-image";
import { useSeoArticleImageJob } from "../tanstack/use-seo-article-image-job";
import { useSeoArticleEditorStore } from "../zustand/seo-article-editor.store";
import { SeoArticleAiImagePrompt } from "./seo-article-ai-image-prompt";
import { SeoArticleImageLibrary } from "./seo-article-image-library";
import { SeoArticleTitleField } from "./seo-article-title-field";

/** จุดวางรูปของ "รูปปก" — บทความมีปกได้ใบเดียว จึงเป็นค่าคงที่ ไม่ใช่ id ของบล็อก */
const COVER_SLOT_ID = "cover";

/** โฟลเดอร์ปลายทางของรูปหัวบทความบน Blob store ของ hurry-web */
const COVER_FOLDER = "blog/cover";

/** รูปหัวบทความถูกใช้เป็นภาพแชร์ (og:image) ด้วย — ให้ใหญ่กว่ารูปในเนื้อหาหน่อย */
const MAX_COVER_DIMENSION = 1920;

/**
 * @description แถบหัวบทความในผืนแก้ไข — รูปปกเต็มความกว้าง + ชื่อบทความ (H1) ทับบนรูป เหมือนที่ขึ้นจริงบนเว็บ
 * @page /super-admin/hurry-web/seo-article?edit=<id>
 * @access super-admin
 * @parent {@link seo-article-editor-page.tsx}
 * @features
 * - หน้าตาเลียนแบบ header จริงของบทความ: รูปเต็มกว้าง + ชั้นสีดำโปร่ง 50% + ชื่อบทความสีเหลืองแบรนด์
 * - ปุ่มเปลี่ยน/ลบรูปซ่อนไว้ โผล่ตอนเอาเมาส์ชี้ (จอสัมผัสแสดงตลอด) จะได้ไม่บังภาพของจริง
 * - อัปโหลด client → Vercel Blob ตรง (ไม่ผ่าน server action เพื่อไม่ชนเพดาน ~4.5MB)
 * - **ให้ AI วาด** เป็นทางเลือกคู่กับอัปจากเครื่อง — ใช้ mutation ตัวเดียวกับบล็อกรูปในเนื้อหา
 *   (gpt-image-2 → R2) วาดเสร็จเติม `coverImageAlt` ให้ถ้ายังว่าง แต่ยังไม่บันทึกจนกว่าจะกดปุ่มบันทึกของหน้า
 * - ช่อง alt แยกต่างหาก เก็บที่ `coverImageAlt` — **ห้ามเปลี่ยน `coverImage` เป็น object เด็ดขาด**
 *   เพราะ og:image / JSON-LD / การ์ดแชร์ LINE-FB ของบทความที่ Google index แล้วอ่านเป็น string ตรง ๆ
 * - ไม่มีรูปก็บันทึกได้ (เว็บมีรูป fallback ให้) — กรณีนั้นแสดงพื้นเทาให้กดเลือกรูป
 * @dependencies uploadHurryWebImage, compressImageFile, useSeoArticleEditorStore
 * @related หน้าจริงบนเว็บ: hurry-web `app/[locale]/blog/_components/image-header-blog.tsx`
 */
export const SeoArticleCoverBanner = () => {
  const coverImage = useSeoArticleEditorStore((state) => state.draft?.content.coverImage ?? "");
  const coverImageAlt = useSeoArticleEditorStore((state) => state.draft?.content.coverImageAlt ?? "");
  const patchContent = useSeoArticleEditorStore((state) => state.patchContent);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  /** true = เปิดช่องสั่ง AI วาดรูปปกอยู่ */
  const [isAiOpen, setIsAiOpen] = useState(false);
  /** คำสั่งที่ใช้วาดรูปปกล่าสุด — เติมให้ตอนกด "วาดใหม่" (ไม่เก็บลงบทความเพราะไม่ใช่เนื้อหา) */
  const [lastDescription, setLastDescription] = useState("");

  /** AI วาดเสร็จ → ใส่เป็นรูปปก + เติม alt ให้ถ้ายังว่าง (ห้ามทับ alt ที่ผู้ใช้พิมพ์เอง) */
  /**
   * รอผลงานวาดรูปปก — **แบนเนอร์ปกเป็นคนวางรูป ไม่ใช่ช่องสั่งวาด** (ช่องนั้นถูกปิดได้ระหว่างรอ)
   * สั่งวาดแล้วปิดช่อง/สลับไปหน้าอื่นแล้วกลับมา ปกก็ยังลงให้เอง — ลงร่างในหน้า ยังไม่แตะฐาน
   */
  const { doneImage, isSettledWithoutImage } = useSeoArticleImageJob(COVER_SLOT_ID);
  const clearPendingImageJob = useSeoArticleEditorStore((state) => state.clearPendingImageJob);

  useEffect(() => {
    if (isSettledWithoutImage) {
      // งานพัง/หายไปจากคิว — เลิกรอเฉย ๆ (Swal แจ้งเหตุโดย useWatchSeoArticleJobs ไปแล้ว ห้ามแจ้งซ้ำ)
      clearPendingImageJob(COVER_SLOT_ID);
      return;
    }
    if (!doneImage?.url) return;

    clearPendingImageJob(COVER_SLOT_ID);
    setErrorMessage("");
    setLastDescription(doneImage.description || "");
    patchContent({
      coverImage: doneImage.url,
      ...(coverImageAlt.trim().length === 0 ? { coverImageAlt: doneImage.alt } : {}),
    });
    setIsAiOpen(false);
    // ตั้งใจผูกกับ url/สถานะเท่านั้น — ต้องวางปกครั้งเดียวตอนงานจบ ไม่ใช่ทุกครั้งที่ re-render
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [doneImage?.url, isSettledWithoutImage]);

  /** เลือกรูปปกเก่าจากคลัง (ของเรื่องนี้หรือเรื่องอื่น) → ใช้เลย ไม่ต้องเสียค่า gen ใหม่ */
  const handlePickFromLibrary = (image: { url: string; alt: string }) => {
    setErrorMessage("");
    patchContent({
      coverImage: image.url,
      ...(coverImageAlt.trim().length === 0 ? { coverImageAlt: image.alt } : {}),
    });
    setIsAiOpen(false);
  };

  const handlePickFile = async (file: File | undefined) => {
    if (!file) return;

    setIsUploading(true);
    setErrorMessage("");

    try {
      const compressed = await compressImageFile(file, {
        maxDimension: MAX_COVER_DIMENSION,
        context: "seo-article-cover",
      });

      const formData = new FormData();
      formData.append("file", compressed);
      formData.append("pathname", `${COVER_FOLDER}/${Date.now()}-${compressed.name}`);

      const result = await uploadHurryWebImage(formData);
      if (result.status !== "ok" || !result.data) {
        setErrorMessage(`[SEO-EDT-12] อัปโหลดรูปหัวบทความไม่สำเร็จ — ${result.message}`);
        return;
      }

      patchContent({ coverImage: result.data.url });
      setIsAiOpen(false);
    } catch (error) {
      setErrorMessage(
        `[SEO-EDT-12] อัปโหลดรูปหัวบทความไม่สำเร็จ — ${error instanceof Error ? error.message : "ไม่ทราบสาเหตุ"}`
      );
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="flex flex-col">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(event) => {
          void handlePickFile(event.target.files?.[0]);
          event.target.value = "";
        }}
      />

      {/* rounded-t-lg อยู่ที่ตัวแถบเอง ไม่ใช่ที่การ์ดแม่ — การ์ดแม่ห้าม overflow-hidden เพราะจะตัดเมนูของโปรแกรมแก้ไข */}
      <div className="group relative flex h-[220px] w-full items-center overflow-hidden rounded-t-lg bg-gray-800 md:h-[280px] lg:h-[320px]">
        {coverImage && (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={coverImage} alt={coverImageAlt} className="absolute inset-0 size-full object-cover" />
            <div className="absolute inset-0 bg-black/50" />
          </>
        )}

        <h1 className="relative z-10 w-full px-6 sm:pl-14">
          <SeoArticleTitleField />
        </h1>

        <div className="absolute right-3 top-3 z-20 flex gap-2 opacity-0 transition-opacity focus-within:opacity-100 group-hover:opacity-100 max-md:opacity-100">
          <Button
            type="button"
            variant="secondary"
            size="sm"
            className="h-8 gap-1.5"
            disabled={isUploading}
            onClick={() => fileInputRef.current?.click()}
          >
            {isUploading ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : coverImage ? (
              <RefreshCw className="size-3.5" />
            ) : (
              <ImagePlus className="size-3.5" />
            )}
            {coverImage ? "เปลี่ยนรูปปก" : "เลือกรูปปก"}
          </Button>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            className="h-8 gap-1.5"
            disabled={isUploading}
            onClick={() => setIsAiOpen((open) => !open)}
          >
            <Sparkles className="size-3.5" />
            {coverImage ? "วาดใหม่ด้วย AI" : "ให้ AI วาด"}
          </Button>
          {coverImage && (
            <Button
              type="button"
              variant="secondary"
              size="sm"
              className="h-8 gap-1.5 text-destructive"
              onClick={() => patchContent({ coverImage: "", coverImageAlt: "" })}
            >
              <Trash2 className="size-3.5" />
              ลบรูป
            </Button>
          )}
        </div>
      </div>

      {isAiOpen && (
        <div className="border-b bg-muted/30 px-6 py-2 sm:pl-14">
          <SeoArticleAiImagePrompt
            placement="cover"
            defaultDescription={lastDescription}
            slotId={COVER_SLOT_ID}
            onCancelAction={() => setIsAiOpen(false)}
          />
        </div>
      )}

      <div className="border-b bg-muted/30 px-6 py-1 sm:pl-14">
        <SeoArticleImageLibrary
          placement={SeoArticleImagePlacement.COVER}
          currentUrl={coverImage}
          onSelectAction={handlePickFromLibrary}
        />
      </div>

      {coverImage && (
        <div className="flex items-center gap-2 border-b bg-muted/30 px-6 py-2 sm:pl-14">
          <span className="shrink-0 text-xs text-muted-foreground">คำอธิบายรูปปก (alt)</span>
          <Input
            value={coverImageAlt}
            placeholder="ไม่บังคับ แต่ช่วย SEO"
            onChange={(event) => patchContent({ coverImageAlt: event.target.value })}
            className="h-7 border-none bg-transparent text-xs shadow-none focus-visible:ring-0"
          />
        </div>
      )}

      {errorMessage && <p className="px-6 py-2 text-xs text-destructive sm:pl-14">{errorMessage}</p>}
    </div>
  );
};
