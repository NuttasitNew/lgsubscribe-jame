"use client";

import React, { useEffect, useRef, useState } from "react";
import { createReactBlockSpec } from "@blocknote/react";
import { SeoArticleImagePlacement } from "@prisma/client";
import { ImagePlus, Loader2, Sparkles, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { compressImageFile } from "@/lib/seo/helper/compress-image";
import { uploadHurryWebImage } from "../../shared/upload-hurry-web-image";
import { serializeRunsToText } from "../helper/serialize-blocks-to-text.helper";
import { useSeoArticleImageJob } from "../tanstack/use-seo-article-image-job";
import { useSeoArticleEditorStore } from "../zustand/seo-article-editor.store";
import { SeoArticleAiImagePrompt } from "./seo-article-ai-image-prompt";
import { SeoArticleImageLibrary } from "./seo-article-image-library";

/** โฟลเดอร์ปลายทางบน Blob store ของ hurry-web สำหรับรูปในบทความ */
const BLOG_IMAGE_FOLDER = "blog";

/** ขนาดด้านยาวสุดของรูปในบทความ — กว้างกว่านี้เว็บก็ย่อทิ้งอยู่ดี */
const MAX_IMAGE_DIMENSION = 1600;

/** ขนาดรูปที่ AI วาด (ทุกใบใน R2 เป็นขนาดนี้) — ใช้ตอนหยิบรูปเก่าจากคลังโดยไม่ต้องโหลดมาวัด */
const LIBRARY_IMAGE_SIZE = { width: 1536, height: 1024 } as const;

/** จำนวนบล็อกข้อความเหนือรูปที่ส่งไปเป็นบริบทให้ AI — มากกว่านี้ไม่ได้ช่วยให้ภาพตรงขึ้นแต่เปลืองโทเคน */
const NEARBY_TEXT_BLOCK_LIMIT = 4;

/** อ่านขนาดจริงของไฟล์รูปเพื่อเก็บลง block (ให้เว็บจองพื้นที่รูปได้ ลด layout shift) */
const readImageSize = async (file: File): Promise<{ width: number; height: number }> => {
  try {
    const bitmap = await createImageBitmap(file);
    const size = { width: bitmap.width, height: bitmap.height };
    bitmap.close();
    return size;
  } catch {
    // เบราว์เซอร์เก่าไม่มี createImageBitmap → ปล่อยเป็น 0 (สเปกให้ width/height เป็น optional)
    return { width: 0, height: 0 };
  }
};

/**
 * @description Block กำหนดเอง "รูปในบทความ" — อัปจากเครื่อง **หรือ** ให้ AI วาด + บังคับกรอก alt เพื่อ SEO
 * @page /super-admin/hurry-web/seo-article?edit=<id>
 * @access super-admin
 * @props { url: string, alt: string, caption: string, width: number, height: number }
 * @features
 * - อัปโหลด client → Vercel Blob ตรงผ่าน uploadHurryWebImage (**ห้ามผ่าน server action** จะชนเพดาน ~4.5MB ของ Vercel)
 * - บีบรูปก่อนอัปด้วย compressImageFile (ด้านยาวสุด 1600px, webp) แล้วอ่านขนาดจริงเก็บลง props
 * - **ให้ AI วาด**: พิมพ์บอกว่าอยากได้ภาพอะไร → gpt-image-2 (ผ่าน server action ที่คืนแค่ url ไม่แตะฐานข้อมูล)
 *   วาดเสร็จใส่รูปลงบล็อกพร้อมเติม alt ที่ระบบเสนอให้อัตโนมัติ ผู้ใช้แก้ต่อได้
 * - รูปที่มีอยู่แล้ว: "วาดใหม่" (แก้คำสั่งเดิมก่อนวาดได้) และ "ใช้ไฟล์จากเครื่อง" ซ่อนไว้ โผล่ตอนชี้เมาส์/โฟกัส
 * - ช่อง alt บังคับกรอก: ว่างเมื่อไหร่ขอบแดง + ขึ้นข้อความเตือน และปุ่มบันทึกของหน้าจะถูกปิดไว้ [SEO-EDT-11]
 *   (แผงกรอกจะแสดงค้างไว้เสมอเมื่อ alt ยังว่าง เพื่อไม่ให้คำเตือนถูกซ่อน)
 * - เป็น block ปกติของ editor → ลากหมุดสลับตำแหน่งได้เหมือนบล็อกข้อความ
 * @dependencies uploadHurryWebImage, compressImageFile, SeoArticleAiImagePrompt, useSeoArticleEditorStore
 * @related
 * - สเปก block: {@link ../type/seo-article-block.type.ts}
 * - ตัวตรวจก่อนบันทึก: {@link seo-article-editor-page.tsx}
 * - สั่ง AI วาด: {@link ../server/generate-single-article-image.action.ts}
 */
/** props ที่ตัว render ของ BlockNote ส่งเข้ามา — ประกาศแบบโครงสร้างเพื่อให้เขียนเป็น component จริงได้ */
interface SeoImageBlockViewProps {
  block: {
    id: string;
    props: { url: string; alt: string; caption: string; width: number; height: number; aiStyle: string };
  };
  editor: {
    updateBlock: (
      block: SeoImageBlockViewProps["block"],
      update: { props: Partial<SeoImageBlockViewProps["block"]["props"]> }
    ) => void;
  };
}

/**
 * ตัวแสดงผลของ block รูป — แยกเป็น component ชื่อขึ้นต้นตัวใหญ่จริง ๆ
 * (ถ้าเขียน hook ไว้ใน callback ชื่อ `render` ตรง ๆ จะผิดกฎ rules-of-hooks และเครื่องมือตรวจ hook จะมองไม่เห็น)
 */
const SeoImageBlockView = ({ block, editor }: SeoImageBlockViewProps) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  /**
   * แทรกมาจากเมนู "/" แบบ AI วาดให้เลย — เปิดช่องสั่งวาดพร้อมเริ่มวาดทันทีโดยไม่ต้องกดอะไรอีก
   * "infographic" = แผนภาพมีตัวหนังสือไทย · "photo" = ภาพถ่ายตามเนื้อหาหัวข้อนั้น
   * อ่านค่าครั้งเดียวตอนประกอบหน้าจอ: ถ้าอ่านสดทุก render พอผู้ใช้ปิดช่องแล้วมันจะเด้งกลับมาเปิดเอง
   */
  const autoAiStyleRef = useRef(
    block.props.aiStyle === "infographic" || block.props.aiStyle === "photo" ? block.props.aiStyle : ""
  );
  const autoAiStyle = autoAiStyleRef.current;

  /** true = เปิดช่องสั่ง AI วาดอยู่ */
  const [isAiOpen, setIsAiOpen] = useState(autoAiStyle !== "");
  /** คำสั่งที่ใช้วาดรูปใบนี้ล่าสุด — เก็บไว้เติมให้ตอนกด "วาดใหม่" (ไม่เก็บลงบล็อกเพราะไม่ใช่เนื้อหาบทความ) */
  const [lastDescription, setLastDescription] = useState("");

  /**
   * หัวข้อ (h2/h3) ที่อยู่เหนือบล็อกรูปนี้ใกล้ที่สุด — ส่งไปเป็นบริบทให้ AI วาดให้ตรงหัวข้อ
   * selector คืน string เสมอ (primitive) จึงไม่ทำให้ re-render เกินจำเป็น
   */
  const nearbyHeading = useSeoArticleEditorStore((state) => {
    const blocks = state.draft?.content.blocks ?? [];
    const index = blocks.findIndex((item) => item.id === block.id);
    if (index < 0) return "";

    for (let cursor = index - 1; cursor >= 0; cursor -= 1) {
      const candidate = blocks[cursor];
      if (candidate.type === "heading") return serializeRunsToText(candidate.runs);
    }
    return "";
  });

  /**
   * เนื้อความรอบ ๆ บล็อกรูปนี้ — ส่งไปให้ AI คิดเองว่าควรวาดอะไรตอนผู้ใช้ไม่พิมพ์คำสั่ง
   * ไล่ขึ้นจากบล็อกรูปจนถึงหัวข้อที่ครอบอยู่ จึงได้เฉพาะเนื้อหาของหัวข้อนั้นจริง ๆ ไม่ปนหัวข้ออื่น
   * selector คืน string (primitive) จึงไม่ทำให้ re-render เกินจำเป็น
   */
  const nearbyText = useSeoArticleEditorStore((state) => {
    const blocks = state.draft?.content.blocks ?? [];
    const index = blocks.findIndex((item) => item.id === block.id);
    if (index < 0) return "";

    const collected: string[] = [];
    for (let cursor = index - 1; cursor >= 0 && collected.length < NEARBY_TEXT_BLOCK_LIMIT; cursor -= 1) {
      const candidate = blocks[cursor];
      if (candidate.type === "heading") break;

      // สเปก v2 เก็บ "ทั้งรายการ" เป็นบล็อกเดียวที่มี items[] ไม่ใช่บล็อกละข้อแบบใน editor
      if (candidate.type === "paragraph") collected.unshift(serializeRunsToText(candidate.runs));
      else if (candidate.type === "bulletList" || candidate.type === "numberedList")
        collected.unshift(candidate.items.map((item) => serializeRunsToText(item.runs)).join(" "));
    }
    return collected.filter(Boolean).join(" ");
  });

  const url = String(block.props.url || "");
  const alt = String(block.props.alt || "");
  const caption = String(block.props.caption || "");

  const handlePickFile = async (file: File | undefined) => {
    if (!file) return;

    setIsUploading(true);
    setErrorMessage("");

    try {
      const compressed = await compressImageFile(file, {
        maxDimension: MAX_IMAGE_DIMENSION,
        context: "seo-article-image",
      });
      const size = await readImageSize(compressed);

      const formData = new FormData();
      formData.append("file", compressed);
      formData.append("pathname", `${BLOG_IMAGE_FOLDER}/${Date.now()}-${compressed.name}`);

      const result = await uploadHurryWebImage(formData);
      if (result.status !== "ok" || !result.data) {
        setErrorMessage(`[SEO-EDT-10] อัปโหลดรูปไม่สำเร็จ — ${result.message}`);
        return;
      }

      editor.updateBlock(block, {
        props: { url: result.data.url, width: size.width, height: size.height },
      });
      setIsAiOpen(false);
    } catch (error) {
      setErrorMessage(`[SEO-EDT-10] อัปโหลดรูปไม่สำเร็จ — ${error instanceof Error ? error.message : "ไม่ทราบสาเหตุ"}`);
    } finally {
      setIsUploading(false);
    }
  };

  /**
   * เลือกรูปเก่าจากคลัง → ใส่ลงบล็อกเลย ไม่ต้องเสียค่า gen ใหม่
   * ขนาดใช้ค่ามาตรฐานของรูปบทความ (ทุกใบใน R2 ถูก gen ที่ขนาดเดียวกัน) จึงไม่ต้องโหลดรูปมาวัดซ้ำ
   */
  const handlePickFromLibrary = (image: { url: string; alt: string }) => {
    setErrorMessage("");
    editor.updateBlock(block, {
      props: {
        url: image.url,
        width: LIBRARY_IMAGE_SIZE.width,
        height: LIBRARY_IMAGE_SIZE.height,
        ...(alt.trim().length === 0 ? { alt: image.alt } : {}),
      },
    });
    setIsAiOpen(false);
  };

  /** AI วาดเสร็จ → ใส่รูปลงบล็อก + เติม alt ให้ถ้ายังว่าง (ห้ามทับ alt ที่ผู้ใช้พิมพ์เอง) */
  /**
   * รอผลงานวาดรูปของบล็อกนี้ — **บล็อกเป็นคนวางรูป ไม่ใช่ช่องสั่งวาด**
   * เพราะช่องสั่งวาดถูกปิดได้ระหว่างรอ แต่บล็อกอยู่บนหน้าตลอดตราบใดที่ยังเปิดบทความนี้อยู่
   * ผลที่ได้: สั่งวาดแล้วปิดช่อง/สลับไปหน้าอื่นแล้วกลับมา รูปก็ยังลงบล็อกนี้ให้เอง
   * รูปลง **ร่างในหน้า** เท่านั้น ยังไม่แตะฐาน — ผู้ใช้ต้องกดบันทึกเองเหมือนการแก้อย่างอื่น
   */
  const { doneImage, isSettledWithoutImage } = useSeoArticleImageJob(block.id);
  const clearPendingImageJob = useSeoArticleEditorStore((state) => state.clearPendingImageJob);

  useEffect(() => {
    if (isSettledWithoutImage) {
      // งานพัง/หายไปจากคิว — เลิกรอเฉย ๆ (Swal แจ้งเหตุโดย useWatchSeoArticleJobs ไปแล้ว ห้ามแจ้งซ้ำ)
      clearPendingImageJob(block.id);
      return;
    }
    if (!doneImage?.url) return;

    clearPendingImageJob(block.id);
    setErrorMessage("");
    setLastDescription(doneImage.description || "");
    editor.updateBlock(block, {
      props: {
        url: doneImage.url,
        width: doneImage.width,
        height: doneImage.height,
        ...(alt.trim().length === 0 ? { alt: doneImage.alt } : {}),
      },
    });
    setIsAiOpen(false);
    // ตั้งใจผูกกับ url/สถานะเท่านั้น — ต้องวางรูปครั้งเดียวตอนงานจบ ไม่ใช่ทุกครั้งที่บล็อก re-render
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [doneImage?.url, isSettledWithoutImage]);

  return (
    // contentEditable=false ทั้งกล่อง — ไม่งั้น ProseMirror จะพยายามรับ keystroke ในช่อง input ของเรา
    <div contentEditable={false} className="group/image my-1 w-full">
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

      {!url ? (
        <div className="flex flex-col gap-2">
          {!isAiOpen && (
            <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed border-muted-foreground/40 bg-muted/40 py-6 text-sm text-muted-foreground">
              {isUploading ? (
                <span className="flex items-center gap-1.5">
                  <Loader2 className="size-4 animate-spin" />
                  กำลังอัปโหลด...
                </span>
              ) : (
                <>
                  <span className="text-xs">เลือกวิธีใส่รูป</span>
                  <div className="flex flex-wrap justify-center gap-2">
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      className="h-8 gap-1.5"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <ImagePlus className="size-3.5" />
                      อัปจากเครื่อง
                    </Button>
                    <Button type="button" size="sm" className="h-8 gap-1.5" onClick={() => setIsAiOpen(true)}>
                      <Sparkles className="size-3.5" />
                      ให้ AI วาด
                    </Button>
                  </div>
                </>
              )}
            </div>
          )}

          {isAiOpen && (
            <SeoArticleAiImagePrompt
              placement="inline"
              nearbyHeading={nearbyHeading}
              nearbyText={nearbyText}
              defaultDescription={lastDescription}
              defaultStyle={autoAiStyle === "infographic" ? "infographic" : "photo"}
              autoStart={autoAiStyle !== ""}
              slotId={block.id}
              onCancelAction={() => setIsAiOpen(false)}
            />
          )}

          <SeoArticleImageLibrary
            placement={SeoArticleImagePlacement.INLINE}
            currentUrl=""
            onSelectAction={handlePickFromLibrary}
          />
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          <div className="relative">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={url} alt={alt} className="w-full rounded-lg object-cover" />

            {/* ปุ่มเปลี่ยนรูปซ่อนไว้ โผล่ตอนชี้เมาส์/โฟกัส — จอสัมผัสแสดงตลอดเพราะ hover ไม่มี */}
            <div className="absolute right-2 top-2 flex gap-2 opacity-0 transition-opacity focus-within:opacity-100 group-hover/image:opacity-100 max-md:opacity-100">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                className="h-8 gap-1.5"
                disabled={isUploading}
                onClick={() => setIsAiOpen((open) => !open)}
              >
                <Sparkles className="size-3.5" />
                วาดใหม่
              </Button>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                className="h-8 gap-1.5"
                disabled={isUploading}
                onClick={() => fileInputRef.current?.click()}
              >
                {isUploading ? <Loader2 className="size-3.5 animate-spin" /> : <Upload className="size-3.5" />}
                ใช้ไฟล์จากเครื่อง
              </Button>
            </div>
          </div>

          {isAiOpen && (
            <SeoArticleAiImagePrompt
              placement="inline"
              nearbyHeading={nearbyHeading}
              nearbyText={nearbyText}
              defaultDescription={lastDescription}
              slotId={block.id}
              onCancelAction={() => setIsAiOpen(false)}
            />
          )}

          <SeoArticleImageLibrary
            placement={SeoArticleImagePlacement.INLINE}
            currentUrl={url}
            onSelectAction={handlePickFromLibrary}
          />

          {/* alt ยังว่าง = ต้องเห็นคำเตือนตลอด ห้ามซ่อน; กรอกครบแล้วค่อยจางหายไปตอนไม่ได้ชี้เมาส์ */}
          <div
            className={cn(
              "flex flex-col gap-1.5 rounded-md bg-muted/50 p-2 transition-opacity",
              alt.trim()
                ? "opacity-0 focus-within:opacity-100 group-hover/image:opacity-100 max-md:opacity-100"
                : "opacity-100"
            )}
          >
            <div className="flex items-center gap-2">
              <span className="w-24 shrink-0 text-xs font-medium">
                คำอธิบายรูป <span className="text-destructive">*</span>
              </span>
              <Input
                value={alt}
                placeholder="เช่น ช่างกำลังซักที่นอนด้วยเครื่องอัดฉีดน้ำร้อน"
                onKeyDown={(event) => event.stopPropagation()}
                onChange={(event) => editor.updateBlock(block, { props: { alt: event.target.value } })}
                className={cn("h-8 text-sm", !alt.trim() && "border-destructive focus-visible:ring-destructive")}
              />
            </div>

            <div className="flex items-center gap-2">
              <span className="w-24 shrink-0 text-xs font-medium text-muted-foreground">คำบรรยายใต้รูป</span>
              <Input
                value={caption}
                placeholder="ไม่บังคับ — ข้อความที่คนอ่านเห็นใต้รูป"
                onKeyDown={(event) => event.stopPropagation()}
                onChange={(event) => editor.updateBlock(block, { props: { caption: event.target.value } })}
                className="h-8 text-sm"
              />
            </div>

            {!alt.trim() && (
              <p className="text-xs text-destructive">
                [SEO-EDT-11] ต้องกรอกคำอธิบายรูป (alt) ก่อนบันทึก — Google ใช้อ่านว่ารูปนี้คืออะไร
              </p>
            )}
          </div>
        </div>
      )}

      {errorMessage && <p className="mt-1 text-xs text-destructive">{errorMessage}</p>}
    </div>
  );
};

export const seoArticleImageBlock = createReactBlockSpec(
  {
    type: "seoImage",
    content: "none",
    propSchema: {
      url: { default: "" },
      alt: { default: "" },
      caption: { default: "" },
      width: { default: 0 },
      height: { default: 0 },
      /**
       * คำใบ้ชั่วคราวจากเมนู "/" ว่าให้เปิดช่องสั่งวาดแบบไหน ("infographic"/"photo" = เปิดแล้ววาดเลย)
       * **ไม่ใช่เนื้อหาบทความ** — convert-editor-to-seo-blocks อ่านเฉพาะ url/alt/caption/width/height
       * ค่านี้จึงถูกทิ้งตอนบันทึกโดยอัตโนมัติ ไม่หลุดขึ้นเว็บและไม่เข้าฐานข้อมูล
       */
      aiStyle: { default: "" },
    },
  },
  {
    // cast จุดเดียวตรงรอยต่อ — generic ของ BlockNote กว้างกว่าที่ component ต้องใช้จริง
    render: (props) => <SeoImageBlockView {...(props as unknown as SeoImageBlockViewProps)} />,
  }
);
