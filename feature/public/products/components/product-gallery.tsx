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
      <div className="group relative aspect-[3/2] overflow-hidden rounded-[1.75rem] border border-black/10 bg-white">
        <Image
          src={activeImage.src}
          alt={activeImage.alt}
          fill
          priority
          sizes="(max-width: 1024px) 100vw, 46vw"
          className="object-contain p-2 transition duration-500 sm:p-4"
        />
        <span
          className={cn(
            "absolute left-4 top-4 rounded-full px-3 py-1.5 text-[11px] font-bold shadow-sm",
            activeImage.kind === "official" ? "bg-white/90 text-neutral-700" : "bg-neutral-950/85 text-white",
          )}
        >
          {activeImage.kind === "official" ? "ภาพสินค้าทางการ" : "ภาพจำลองเพื่อการนำเสนอ"}
        </span>
        <span className="absolute bottom-4 right-4 rounded-full bg-neutral-950/80 px-3 py-1.5 text-xs font-semibold text-white">
          {activeIndex + 1} / {images.length}
        </span>
      </div>

      <div className="mt-4 grid grid-cols-5 gap-2 sm:grid-cols-8" aria-label="เลือกภาพสินค้า">
        {images.map((image, index) => (
          <button
            key={image.src}
            type="button"
            onClick={() => setActiveIndex(index)}
            aria-label={`ดู${image.alt}`}
            aria-pressed={activeIndex === index}
            className={cn(
              "relative aspect-square overflow-hidden rounded-xl border bg-white transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-600 focus-visible:ring-offset-2",
              activeIndex === index
                ? "border-red-600 ring-1 ring-red-600"
                : "border-black/10 hover:border-neutral-400",
            )}
          >
            <Image src={image.src} alt="" fill sizes="96px" className="object-contain p-1.5" />
          </button>
        ))}
      </div>
    </div>
  );
}
