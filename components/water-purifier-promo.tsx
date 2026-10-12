"use client";

import Image from "next/image";
import Link from "next/link";
import { useSyncExternalStore } from "react";
import { buildProductsSearchHref } from "@/lib/catalog-search";
import { isWaterPurifierPromoActive } from "@/lib/water-purifier-promo";

/** Rendered while the campaign runs; a page served from cache after the end date hides itself in the browser. */
export function WaterPurifierPromo() {
  const active = useSyncExternalStore(
    () => () => {},
    isWaterPurifierPromoActive,
    () => true,
  );

  if (!active) return null;

  return (
    <section className="bg-white pt-10 sm:pt-12">
      <div className="container-page">
        <Link
          href={buildProductsSearchHref("", "เครื่องกรองน้ำ")}
          className="mx-auto block max-w-[560px] overflow-hidden rounded-2xl shadow-[0_5px_22px_rgba(0,0,0,0.1)] transition hover:-translate-y-1 hover:shadow-lg"
        >
          <Image
            src="/images/campaigns/water-purifier-99-oct-2026.webp"
            alt="LG Subscribe เครื่องกรองน้ำ รุ่น WD516 และ WD518 เริ่มต้น 99 บาทต่อเดือน เฉพาะ 9 เดือนแรก ไส้กรองฟรีตลอดสัญญา โปรโมชั่น 1–31 ตุลาคม 2569"
            width={1254}
            height={1254}
            sizes="(max-width: 640px) calc(100vw - 2rem), 560px"
            className="h-auto w-full"
          />
        </Link>
      </div>
    </section>
  );
}
