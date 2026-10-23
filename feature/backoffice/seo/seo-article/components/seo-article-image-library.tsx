"use client";

import React, { useMemo, useState } from "react";
import { SeoArticleImagePlacement } from "@prisma/client";
import { Check, ImageIcon, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useFindSeoArticleImages } from "../tanstack/find-seo-article-images.query";
import { useSeoArticleEditorStore } from "../zustand/seo-article-editor.store";
import type { SeoArticleImageItem } from "../server/find-seo-article-images.action";

interface SeoArticleImageLibraryProps {
  /** ดึงเฉพาะรูปที่วาดมาเพื่อตำแหน่งนี้ — ปกกับรูปแทรกคนละสัดส่วน ห้ามปนกัน */
  placement: SeoArticleImagePlacement;
  /** URL ที่ใช้อยู่ตอนนี้ — ใช้ติ๊กถูกบนใบที่เลือกอยู่ */
  currentUrl: string;
  /** ผู้ใช้เลือกใบไหน — ผู้เรียกเอาไปใส่บล็อก/รูปปกเอง (component นี้ไม่แตะฐาน) */
  onSelectAction: (image: { url: string; alt: string }) => void;
}

/** แท็บของคลังรูป — คนละแหล่งที่มา แต่หยิบมาใช้ได้เหมือนกัน */
type LibraryTab = "own" | "others";

/**
 * @description แถบ "รูปที่เคยวาด" — กดสลับกลับไปใช้รูปเก่าได้ ทั้งของบทความนี้และของบทความอื่น
 * @page /super-admin/hurry-web/seo-article?edit=<id>
 * @access super-admin
 * @parent {@link seo-article-image-block.tsx}, {@link seo-article-cover-banner.tsx}
 * @props { placement, currentUrl, onSelectAction }
 * @features
 * - 2 แท็บ: "บทความนี้" กับ "จากบทความอื่น" — รูปทุกใบเสียเงินตอน gen จึงต้องหยิบมาใช้ซ้ำข้ามเรื่องได้
 * - ใบที่ยังไม่เคยถูกบันทึกลงบทความไหนเลยติดป้าย "ยังไม่ได้ใช้" — คือใบที่วาดทิ้งไว้แล้วลืม
 * - กดเลือก = ใส่ลง state ของหน้าแก้ไขเท่านั้น **ยังไม่บันทึก** จนกว่าจะกดปุ่มบันทึกบทความ
 * - query ยิงตอนกางแถบเท่านั้น (`enabled`) — ไม่ใช่ทุกคนเปิดหน้าแก้ไขเพื่อดูรูปเก่า
 * @dependencies useFindSeoArticleImages, useSeoArticleEditorStore
 * @related {@link ../server/find-seo-article-images.action.ts}
 */
export const SeoArticleImageLibrary = ({ placement, currentUrl, onSelectAction }: SeoArticleImageLibraryProps) => {
  const seoArticleId = useSeoArticleEditorStore((state) => state.seoArticleId);
  const [isOpen, setIsOpen] = useState(false);
  const [tab, setTab] = useState<LibraryTab>("own");

  const { data: response, isLoading } = useFindSeoArticleImages({ seoArticleId, placement, enabled: isOpen });

  const ownImages = useMemo(() => response?.data?.ownImages ?? [], [response]);
  const otherImages = useMemo(() => response?.data?.otherImages ?? [], [response]);
  const shownImages = tab === "own" ? ownImages : otherImages;

  return (
    <div className="flex flex-col gap-2">
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="h-7 w-fit gap-1.5 px-2 text-xs text-muted-foreground"
        onClick={() => setIsOpen((open) => !open)}
      >
        <ImageIcon className="size-3.5" />
        {isOpen ? "ปิดคลังรูป" : "รูปที่เคยวาด"}
      </Button>

      {isOpen && (
        <div className="flex flex-col gap-2 rounded-lg border bg-muted/30 p-2.5">
          <div className="flex items-center gap-1">
            <Button
              type="button"
              size="sm"
              variant={tab === "own" ? "default" : "outline"}
              className="h-7 px-2.5 text-xs"
              onClick={() => setTab("own")}
            >
              บทความนี้ ({ownImages.length})
            </Button>
            <Button
              type="button"
              size="sm"
              variant={tab === "others" ? "default" : "outline"}
              className="h-7 px-2.5 text-xs"
              onClick={() => setTab("others")}
            >
              จากบทความอื่น ({otherImages.length})
            </Button>
          </div>

          {isLoading ? (
            <span className="flex items-center gap-1.5 py-4 text-xs text-muted-foreground">
              <Loader2 className="size-3.5 animate-spin" />
              กำลังโหลดคลังรูป...
            </span>
          ) : shownImages.length === 0 ? (
            <p className="py-4 text-center text-xs text-muted-foreground">
              {tab === "own" ? "บทความนี้ยังไม่เคยสั่ง AI วาดรูป" : "ยังไม่มีรูปจากบทความอื่นในตำแหน่งนี้"}
            </p>
          ) : (
            <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
              {shownImages.map((image) => (
                <ImageCard
                  key={image.seoArticleImageId}
                  image={image}
                  isCurrent={image.url === currentUrl}
                  showArticleTitle={tab === "others"}
                  onSelectAction={onSelectAction}
                />
              ))}
            </div>
          )}

          <p className="text-[11px] text-muted-foreground">
            กดรูปเพื่อใช้ใบนั้น — ยังไม่บันทึกจนกว่าจะกดปุ่มบันทึกบทความ
          </p>
        </div>
      )}
    </div>
  );
};

/** การ์ดรูป 1 ใบในคลัง — แยกออกมาให้ tooltip/ป้ายไม่ต้องคำนวณใหม่ทั้งกริดตอน re-render */
const ImageCard = ({
  image,
  isCurrent,
  showArticleTitle,
  onSelectAction,
}: {
  image: SeoArticleImageItem;
  isCurrent: boolean;
  showArticleTitle: boolean;
  onSelectAction: (image: { url: string; alt: string }) => void;
}) => (
  <button
    type="button"
    onClick={() => onSelectAction({ url: image.url, alt: image.alt })}
    title={image.prompt}
    className={cn(
      "group/card relative overflow-hidden rounded-md border text-left transition-colors",
      isCurrent ? "border-primary ring-2 ring-primary/40" : "border-transparent hover:border-primary/50"
    )}
  >
    {/* eslint-disable-next-line @next/next/no-img-element */}
    <img src={image.url} alt={image.alt} className="aspect-[3/2] w-full object-cover" />

    {isCurrent && (
      <span className="absolute right-1 top-1 flex size-5 items-center justify-center rounded-full bg-primary text-primary-foreground">
        <Check className="size-3" />
      </span>
    )}

    {!image.lastUsedAt && (
      <span className="absolute left-1 top-1 rounded bg-amber-500/90 px-1 py-0.5 text-[10px] text-white">
        ยังไม่ได้ใช้
      </span>
    )}

    <span className="block truncate bg-background/90 px-1.5 py-1 text-[11px] text-muted-foreground">
      {showArticleTitle ? image.articleTitle : image.prompt || image.alt}
    </span>
  </button>
);
