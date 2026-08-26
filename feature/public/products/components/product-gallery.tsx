"use client";

import Image from "next/image";
import { useState } from "react";
import type { ProductGalleryImage } from "@/lib/site";
import { cn } from "@/lib/utils";

export function ProductGallery({
  images,
  productName,
}: {
  images: ProductGalleryImage[];
  productName: string;
}) {
  const [activeIndex, setActiveIndex] = useState(0);
  const activeImage = images[activeIndex];

  return (
    <div aria-label={`แกลเลอรี ${productName}`}>
      <div className="group relative aspect-square overflow-hidden rounded-[1.75rem] border border-black/10 bg-white sm:aspect-[4/5] lg:aspect-[3/2]">
        <Image
          src={activeImage.src}
          alt={activeImage.alt}
          fill
          priority
          sizes="(max-width: 1024px) 100vw, 46vw"
          className="object-contain"
        />
      </div>

      <div className="mt-3 flex items-end justify-between gap-3">
        <div className="flex min-w-0 flex-wrap gap-2" aria-label="เลือกภาพสินค้า">
          {images.map((image, index) => (
            <button
              key={image.src}
              type="button"
              onClick={() => setActiveIndex(index)}
              aria-label={`ดู${image.alt}`}
              aria-pressed={activeIndex === index}
              className={cn(
                "relative size-16 shrink-0 overflow-hidden rounded-xl border bg-white transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-600 focus-visible:ring-offset-2 sm:size-[4.5rem]",
                activeIndex === index
                  ? "border-red-600 ring-1 ring-red-600"
                  : "border-black/10 hover:border-neutral-400",
              )}
            >
              <Image src={image.src} alt="" fill sizes="72px" className="object-contain p-1.5" />
            </button>
          ))}
        </div>
        <span className="shrink-0 pb-1 text-xs font-semibold tabular-nums text-neutral-500">
          {activeIndex + 1} / {images.length}
        </span>
      </div>
    </div>
  );
}
