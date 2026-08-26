"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { ProductViewCount } from "@/components/live-view-count";
import type { ProductGalleryImage } from "@/lib/site";
import { cn } from "@/lib/utils";

export function ProductGallery({
  images,
  productName,
  model,
  countSession = false,
}: {
  images: ProductGalleryImage[];
  productName: string;
  model?: string;
  countSession?: boolean;
}) {
  const [activeIndex, setActiveIndex] = useState(0);
  const mainTrackRef = useRef<HTMLDivElement>(null);
  const thumbnailTrackRef = useRef<HTMLDivElement>(null);
  const ignoreMainScrollRef = useRef(false);
  const hasMultipleImages = images.length > 1;

  function goTo(index: number) {
    const next = Math.max(0, Math.min(images.length - 1, index));
    setActiveIndex(next);
    const track = mainTrackRef.current;
    if (track && track.clientWidth > 0) {
      ignoreMainScrollRef.current = true;
      track.scrollTo({ left: next * track.clientWidth, behavior: "smooth" });
      window.setTimeout(() => {
        ignoreMainScrollRef.current = false;
      }, 450);
    }
  }

  function handleMainScroll() {
    if (ignoreMainScrollRef.current) return;
    const track = mainTrackRef.current;
    if (!track || track.clientWidth === 0) return;
    const nextIndex = Math.round(track.scrollLeft / track.clientWidth);
    if (nextIndex >= 0 && nextIndex < images.length) {
      setActiveIndex(nextIndex);
    }
  }

  function scrollThumbnails(direction: -1 | 1) {
    const track = thumbnailTrackRef.current;
    if (!track) return;
    const amount = Math.max(track.clientWidth * 0.75, 160);
    track.scrollBy({ left: direction * amount, behavior: "smooth" });
  }

  useEffect(() => {
    const track = thumbnailTrackRef.current;
    const thumb = track?.querySelector<HTMLElement>(`[data-thumb-index="${activeIndex}"]`);
    if (!track || !thumb) return;

    const trackRect = track.getBoundingClientRect();
    const thumbRect = thumb.getBoundingClientRect();
    const offset = thumbRect.left - trackRect.left - (trackRect.width - thumbRect.width) / 2;
    if (Math.abs(offset) < 1) return;
    track.scrollBy({ left: offset, behavior: "smooth" });
  }, [activeIndex]);

  return (
    <div className="min-w-0" aria-label={`แกลเลอรี ${productName}`}>
      <div
        data-gallery-stage
        className="group relative aspect-square w-full overflow-hidden rounded-[1.75rem] border border-black/10 bg-white sm:aspect-[4/5] lg:aspect-[3/2]"
      >
        <div
          ref={mainTrackRef}
          role="region"
          aria-roledescription="carousel"
          aria-label={`ภาพสินค้า ${productName}`}
          tabIndex={hasMultipleImages ? 0 : undefined}
          onScroll={handleMainScroll}
          onKeyDown={(event) => {
            if (event.key === "ArrowRight") {
              event.preventDefault();
              goTo(activeIndex + 1);
            }
            if (event.key === "ArrowLeft") {
              event.preventDefault();
              goTo(activeIndex - 1);
            }
          }}
          className="flex h-full w-full touch-pan-x snap-x snap-mandatory overflow-x-auto overscroll-x-contain scrollbar-none"
        >
          {images.map((image, index) => (
            <div key={image.src} className="relative h-full w-full min-w-full shrink-0 snap-center">
              <Image
                src={image.src}
                alt={image.alt}
                fill
                priority={index === 0}
                sizes="(max-width: 1024px) 100vw, 46vw"
                draggable={false}
                className="object-contain"
              />
            </div>
          ))}
        </div>

        {hasMultipleImages ? (
          <>
            <button
              type="button"
              aria-label="ภาพก่อนหน้า"
              disabled={activeIndex === 0}
              onClick={() => goTo(activeIndex - 1)}
              className="absolute left-3 top-1/2 z-10 grid size-10 -translate-y-1/2 place-items-center rounded-full border border-black/10 bg-white/95 text-neutral-800 shadow-sm transition hover:bg-white disabled:pointer-events-none disabled:opacity-30"
            >
              <ChevronLeft className="size-5" aria-hidden="true" />
            </button>
            <button
              type="button"
              aria-label="ภาพถัดไป"
              disabled={activeIndex === images.length - 1}
              onClick={() => goTo(activeIndex + 1)}
              className="absolute right-3 top-1/2 z-10 grid size-10 -translate-y-1/2 place-items-center rounded-full border border-black/10 bg-white/95 text-neutral-800 shadow-sm transition hover:bg-white disabled:pointer-events-none disabled:opacity-30"
            >
              <ChevronRight className="size-5" aria-hidden="true" />
            </button>
          </>
        ) : null}

        {model ? (
          <div className="pointer-events-none absolute left-3 top-3 z-20">
            <ProductViewCount model={model} countSession={countSession} />
          </div>
        ) : null}

        <span
          aria-live="polite"
          className="pointer-events-none absolute bottom-3 right-3 rounded-full bg-neutral-950/80 px-2.5 py-1 text-xs font-semibold tabular-nums text-white"
        >
          {activeIndex + 1} / {images.length}
        </span>
      </div>

      {hasMultipleImages ? (
        <div className="mt-3 flex min-w-0 items-center gap-2">
          <button
            type="button"
            aria-label="เลื่อนดูภาพตัวอย่างก่อนหน้า"
            onClick={() => scrollThumbnails(-1)}
            className="grid size-9 shrink-0 place-items-center rounded-full border border-black/10 bg-white text-neutral-800 transition hover:border-neutral-400"
          >
            <ChevronLeft className="size-4" aria-hidden="true" />
          </button>
          <div
            ref={thumbnailTrackRef}
            role="region"
            aria-roledescription="carousel"
            aria-label="เลือกภาพสินค้า"
            className="flex min-w-0 flex-1 touch-pan-x snap-x snap-mandatory gap-2 overflow-x-auto overscroll-x-contain scrollbar-none"
          >
            {images.map((image, index) => (
              <button
                key={image.src}
                type="button"
                data-thumb-index={index}
                onClick={() => goTo(index)}
                aria-label={`ดู${image.alt}`}
                aria-pressed={activeIndex === index}
                className={cn(
                  "relative size-16 shrink-0 snap-start overflow-hidden rounded-xl border bg-white transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-600 focus-visible:ring-offset-2 sm:size-[4.5rem]",
                  activeIndex === index
                    ? "border-red-600 ring-1 ring-red-600"
                    : "border-black/10 hover:border-neutral-400",
                )}
              >
                <Image src={image.src} alt="" fill sizes="72px" className="object-contain p-1.5" />
              </button>
            ))}
          </div>
          <button
            type="button"
            aria-label="เลื่อนดูภาพตัวอย่างถัดไป"
            onClick={() => scrollThumbnails(1)}
            className="grid size-9 shrink-0 place-items-center rounded-full border border-black/10 bg-white text-neutral-800 transition hover:border-neutral-400"
          >
            <ChevronRight className="size-4" aria-hidden="true" />
          </button>
        </div>
      ) : null}
    </div>
  );
}
