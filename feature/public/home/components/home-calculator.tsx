"use client";

import Image from "next/image";
import { useMemo, useState } from "react";
import { products } from "@/lib/site";

const calculableProducts = products.filter((product) => product.monthlyPrice && product.contractMonths);

const productScenes: Record<string, string> = {
  "lg-puricare-wd516": "/images/generated/calculator-water-purifier-composite-v2.png",
  "lg-front-load-fv1413s4m": "/images/generated/calculator-washer-composite-v2.png",
};

export function HomeCalculator() {
  const [slug, setSlug] = useState(calculableProducts[0]?.slug ?? "");
  const selected = useMemo(
    () => calculableProducts.find((product) => product.slug === slug) ?? calculableProducts[0],
    [slug],
  );

  if (!selected || selected.monthlyPrice === null || selected.contractMonths === null) return null;

  const total = selected.monthlyPrice * selected.contractMonths;
  const scene = productScenes[selected.slug] ?? productScenes["lg-puricare-wd516"];

  return (
    <section id="calculator" className="scroll-mt-24 py-3 sm:py-6">
      <div className="container-page">
        <div className="overflow-hidden rounded-2xl border border-black/[0.07] bg-white shadow-[0_10px_38px_rgba(0,0,0,0.07)] lg:grid lg:grid-cols-[1.25fr_0.75fr]">
          <div className="grid gap-8 p-6 sm:p-8 lg:grid-cols-[0.9fr_1.1fr] lg:p-10">
            <div>
              <p className="text-sm font-bold text-primary">วางแผนก่อนสมัคร</p>
              <h2 className="mt-1 text-3xl font-bold text-neutral-950">คำนวณค่าใช้จ่าย</h2>
              <p className="mt-2 text-sm leading-6 text-neutral-500">
                เลือกสินค้าที่สนใจเพื่อดูยอดอ้างอิงต่อเดือนและยอดรวมตลอดสัญญา
              </p>
              <label htmlFor="home-product" className="mt-6 block text-xs font-bold text-neutral-700">
                เลือกสินค้า
              </label>
              <select
                id="home-product"
                value={slug}
                onChange={(event) => setSlug(event.target.value)}
                className="mt-2 h-12 w-full rounded-[5px] border border-black/10 bg-white px-3 text-sm font-semibold outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/10"
              >
                {calculableProducts.map((product) => (
                  <option key={product.slug} value={product.slug}>
                    {product.name}
                  </option>
                ))}
              </select>
              <p className="mt-4 rounded-lg bg-[#fff5f6] px-4 py-3 text-xs leading-5 text-neutral-600">
                ราคาเป็นข้อมูลอ้างอิงที่ตรวจสอบเมื่อ 9 สิงหาคม 2569 กรุณาให้เจ้าหน้าที่ยืนยันข้อเสนอล่าสุด
              </p>
            </div>

            <div className="rounded-2xl border border-black/[0.08] bg-[#fcfcfc] p-5 sm:p-6">
              <p className="text-xs font-bold text-neutral-500">ตัวอย่างการคำนวณ</p>
              <div className="mt-5 grid gap-3 border-b border-black/[0.08] pb-5 text-sm">
                <div className="flex justify-between gap-4">
                  <span className="text-neutral-500">รุ่น</span>
                  <strong className="text-right">{selected.model}</strong>
                </div>
                <div className="flex justify-between gap-4">
                  <span className="text-neutral-500">ระยะสัญญา</span>
                  <strong>{selected.contractMonths} เดือน</strong>
                </div>
              </div>
              <div className="flex items-end justify-between gap-4 border-b border-black/[0.08] py-5">
                <span className="text-sm font-bold">ยอดต่อเดือน</span>
                <strong className="text-3xl font-black text-primary">
                  ฿{selected.monthlyPrice.toLocaleString("th-TH")}
                  <span className="ml-1 text-xs font-semibold text-neutral-500">/เดือน</span>
                </strong>
              </div>
              <div className="flex items-center justify-between gap-4 pt-5 text-sm">
                <span className="text-neutral-500">ยอดรวมตามจำนวนงวด</span>
                <strong>฿{total.toLocaleString("th-TH")}</strong>
              </div>
            </div>
          </div>

          <div className="relative min-h-[360px] overflow-hidden bg-[#f3efeb] lg:min-h-full">
            <Image
              key={scene}
              src={scene}
              alt={`ภาพสินค้า ${selected.name} รุ่น ${selected.model}`}
              fill
              sizes="(max-width: 1024px) 100vw, 38vw"
              className="object-cover object-center"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-white/45 via-transparent to-transparent" />
            <div className="absolute left-5 top-5 rounded-xl border border-white/70 bg-white/85 px-4 py-3 shadow-sm backdrop-blur-sm sm:left-7 sm:top-7">
              <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-primary">สินค้าที่เลือก</p>
              <p className="mt-1 text-sm font-bold text-neutral-950">{selected.model}</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
