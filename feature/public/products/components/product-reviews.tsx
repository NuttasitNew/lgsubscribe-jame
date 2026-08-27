"use client";

import { useState } from "react";
import { BadgeCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { ProductReview } from "@/lib/site";

const PREVIEW_COUNT = 6;

export function ProductReviews({
  productName,
  category,
  reviews,
  average,
}: {
  productName: string;
  category: string;
  reviews: ProductReview[];
  average: number;
}) {
  const [expanded, setExpanded] = useState(false);

  if (reviews.length === 0) return null;
  const visibleReviews = expanded || reviews.length <= PREVIEW_COUNT ? reviews : reviews.slice(0, PREVIEW_COUNT);
  const hiddenCount = reviews.length - visibleReviews.length;

  return (
    <section className="section-space border-y border-black/10 bg-[#f7f4ef]" aria-labelledby="customer-reviews-title">
      <div className="container-page">
        <div className="flex flex-col justify-between gap-6 border-b border-black/10 pb-8 md:flex-row md:items-end">
          <div>
            <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.2em] text-red-700">
              <BadgeCheck className="size-4" aria-hidden="true" />
              จากผู้ใช้งานจริง
            </p>
            <h2
              id="customer-reviews-title"
              title={productName}
              className="mt-3 text-3xl font-bold text-neutral-950 sm:text-4xl"
            >
              รีวิวจากคนใช้รุ่นนี้
            </h2>
            <p className="mt-4 max-w-2xl text-sm leading-6 text-neutral-500">
              เสียงจากลูกค้าที่เช่าใช้ {category} รุ่นนี้กับ LG Subscribe
            </p>
          </div>
          <div className="rounded-2xl bg-neutral-950 px-6 py-5 text-white">
            <p className="text-3xl font-black">
              {average.toFixed(1)}
              <span className="ml-2 text-lg tracking-[0.08em] text-amber-300">★★★★★</span>
            </p>
            <p className="mt-1 text-xs text-white/55">จาก {reviews.length} รีวิวของลูกค้า</p>
          </div>
        </div>

        <div className="mt-8 grid gap-5 lg:grid-cols-3">
          {visibleReviews.map((review) => (
            <article
              key={`${review.reviewer}-${review.title}`}
              className="flex flex-col rounded-2xl border border-black/10 bg-white p-7 shadow-[0_1px_0_rgba(0,0,0,0.04)]"
            >
              <div className="flex items-center justify-between gap-4">
                <p className="font-bold text-neutral-950">{review.reviewer}</p>
                <p className="tracking-[0.12em] text-amber-500" aria-label={`${review.rating} จาก 5 ดาว`}>
                  {"★".repeat(review.rating)}
                  <span className="text-neutral-300">{"★".repeat(5 - review.rating)}</span>
                </p>
              </div>
              <h3 className="mt-6 text-xl font-bold leading-7 text-neutral-950">{review.title}</h3>
              <p className="mt-3 text-sm leading-7 text-neutral-600">“{review.summary}”</p>
            </article>
          ))}
        </div>

        {hiddenCount > 0 ? (
          <div className="mt-8 flex justify-center">
            <Button
              type="button"
              variant="outline"
              className="rounded-full bg-white px-6"
              onClick={() => setExpanded(true)}
            >
              ดูรีวิวเพิ่มอีก {hiddenCount} รายการ
            </Button>
          </div>
        ) : null}
      </div>
    </section>
  );
}
