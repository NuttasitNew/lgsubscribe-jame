import { ArrowRight, Ghost, MoonStar } from "lucide-react";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { ImageFallback } from "@/components/image-fallback";
import { LineMark } from "@/components/line-mark";
import { Button } from "@/components/ui/button";
import { verifiedInstallPhotos } from "@/feature/public/products/components/wash-tower-reviews";
import { getSubscribeDayProducts } from "@/feature/public/subscribe-day/subscribe-day-products";
import { createPageMetadata, siteConfig, type Product } from "@/lib/site";
import { isSubscribeDayActive, subscribeDayCampaign } from "@/lib/subscribe-day";
import { getSubscriptionFirstBillPrice } from "@/lib/subscription-starting-prices";
import { subscribeDayImage } from "@/lib/subscribe-day-image";

export const metadata: Metadata = {
  ...createPageMetadata({
    title: "LG Subscribe Day ลด 15% | โปรฮาโลวีน 31 ต.ค. – 11 พ.ย. 69",
    description:
      "ลูกค้าใหม่ Subscribe 2 เครื่องขึ้นไป ลด 15% ลูกค้าเดิม Subscribe 1 เครื่องขึ้นไป ลด 15% ตั้งแต่ 31 ต.ค. – 11 พ.ย. 69 เฉพาะรุ่นที่ร่วมรายการ",
    path: subscribeDayCampaign.path,
  }),
  // The page redirects away when the campaign ends, so it should not linger in search results.
  robots: { index: false, follow: true },
};

const offers = [
  { customer: "ลูกค้าใหม่", condition: "Subscribe 2 เครื่องขึ้นไป" },
  { customer: "ลูกค้าเดิม", condition: "Subscribe 1 เครื่องขึ้นไป" },
] as const;

const categories = [
  { label: "เครื่องซักผ้าและอบผ้า", category: "เครื่องซักผ้าและอบผ้า" },
  { label: "ตู้เย็น", category: "ตู้เย็น" },
  { label: "แอร์", category: "เครื่องปรับอากาศ" },
  { label: "เครื่องกรองน้ำ", category: "เครื่องกรองน้ำ" },
  { label: "เครื่องฟอกอากาศ", category: "เครื่องฟอกอากาศ" },
  { label: "เครื่องลดความชื้น", category: "เครื่องลดความชื้น" },
  { label: "เครื่องล้างจาน", category: "เครื่องล้างจาน" },
  { label: "ทีวีและเครื่องเสียง", category: "ทีวีและเครื่องเสียง" },
] as const;

const steps = [
  { title: "เลือกสินค้าที่สนใจ", text: "ดูรุ่นและรายละเอียดในหน้าสินค้า" },
  { title: "แอดไลน์", text: `แจ้งรุ่นที่สนใจทาง LINE ${siteConfig.lineId}` },
  { title: "ตรวจสอบเงื่อนไข", text: "เจ้าหน้าที่ยืนยันรุ่นที่ร่วมรายการและส่วนลดให้" },
] as const;

const baht = (price: number) => `฿${price.toLocaleString("th-TH", { maximumFractionDigits: 2 })}`;

function categoryHref(category: string) {
  return `/products/?category=${encodeURIComponent(category)}`;
}

function ProductPrice({ product }: { product: Product }) {
  const firstBill = getSubscriptionFirstBillPrice(product.model);
  if (firstBill === null) {
    if (product.monthlyPrice === null) return null;
    return (
      <span className="text-sm font-bold text-red-700">เริ่มต้น {baht(product.monthlyPrice)}/เดือน</span>
    );
  }
  const discount = subscribeDayCampaign.maxDiscountPercent;
  return (
    <span className="grid gap-0.5">
      <span className="text-xs font-semibold text-neutral-600">เดือนแรก</span>
      <span className="text-2xl font-black leading-none text-red-700">
        {baht((firstBill * (100 - discount)) / 100)}
      </span>
      <span className="text-xs font-semibold text-red-700">
        จาก {baht(firstBill)} ลดอีก {discount}%
      </span>
      {product.monthlyPrice !== null ? (
        <span className="text-xs text-neutral-600">ราคาปกติ {baht(product.monthlyPrice)}/เดือน</span>
      ) : null}
    </span>
  );
}

function LineButton({ className }: { className?: string }) {
  return (
    <Button asChild size="lg" className={className}>
      <a href={siteConfig.lineUrl} target="_blank" rel="noreferrer">
        <LineMark className="size-5" />
        {subscribeDayCampaign.ctaLabel.replace("กดปุ่มนี้เพื่อ", "")}
      </a>
    </Button>
  );
}

export default async function SubscribeDayPage({
  searchParams,
}: {
  searchParams: Promise<{ kw?: string | string[] }>;
}) {
  // A cached copy would outlive the campaign, so the date is checked on every request.
  await connection();
  if (!isSubscribeDayActive()) redirect("/");

  const { kw } = await searchParams;
  const { label, category, products } = getSubscribeDayProducts(typeof kw === "string" ? kw : undefined);

  return (
    <div className="bg-[#14091f] text-white">
      <header className="relative isolate overflow-hidden bg-[radial-gradient(circle_at_85%_12%,rgb(251_146_60/0.32),transparent_38%),linear-gradient(160deg,#2a1147,#14091f_70%)]">
        <MoonStar aria-hidden="true" className="absolute right-4 top-4 -z-10 size-20 text-amber-200/40 sm:right-8 sm:top-8 sm:size-28" />
        <div className="container-page grid items-center gap-10 py-12 sm:py-16 lg:grid-cols-[minmax(0,1fr)_minmax(0,27rem)] lg:gap-16 lg:py-20">
          <div>
            <p className="inline-flex items-center gap-2 text-sm font-bold text-amber-300">
              <Ghost aria-hidden="true" className="size-5" />
              โปรโมชั่นฮาโลวีน
            </p>
            <h1 className="mt-4 text-5xl font-black leading-tight sm:text-6xl">
              LG Subscribe Day
              <span className="mt-1 block text-orange-400">ลด 15%</span>
            </h1>
            <p className="mt-5 text-xl font-bold text-amber-100">โปรโมชั่น {subscribeDayCampaign.dateLabel}</p>
            <p className="mt-3 max-w-xl leading-7 text-white/70">
              ทั้งลูกค้าใหม่และลูกค้าเดิมรับส่วนลด 15% เมื่อ Subscribe ตามจำนวนเครื่องที่กำหนด เฉพาะรุ่นที่ร่วมรายการ
            </p>
            <div className="mt-7 flex flex-col gap-3 sm:flex-row">
              <LineButton className="bg-orange-500 text-[#14091f] hover:bg-orange-400" />
              <Button
                asChild
                size="lg"
                variant="outline"
                className="border-white/40 bg-transparent text-white hover:bg-white/10 hover:text-white"
              >
                <Link href="/products/">
                  ดูสินค้าทั้งหมด
                  <ArrowRight />
                </Link>
              </Button>
            </div>
          </div>
          <Image
            {...subscribeDayImage}
            unoptimized
            alt={subscribeDayCampaign.alt}
            width={1156}
            height={1361}
            priority
            className="mx-auto w-full max-w-md rounded-2xl shadow-[0_24px_64px_rgba(0,0,0,0.55)] ring-1 ring-orange-300/30"
          />
        </div>
      </header>

      <section className="container-page py-14 sm:py-16" aria-labelledby="subscribe-day-offers">
        <h2 id="subscribe-day-offers" className="text-3xl font-bold sm:text-4xl">
          รับส่วนลดอย่างไร
        </h2>
        <div className="mt-8 grid gap-5 md:grid-cols-2">
          {offers.map((offer) => (
            <article
              key={offer.customer}
              className="rounded-2xl border-2 border-amber-300 bg-gradient-to-b from-amber-50 to-orange-100 p-6 text-[#2a1147] sm:p-8"
            >
              <p className="text-2xl font-bold">{offer.customer}</p>
              <p className="mt-1 text-lg font-semibold text-red-800">{offer.condition}</p>
              <p className="mt-3 text-6xl font-black text-red-700">ลด 15%</p>
            </article>
          ))}
        </div>
      </section>

      <section className="container-page pb-14 sm:pb-16" aria-labelledby="subscribe-day-products">
        <h2 id="subscribe-day-products" className="text-3xl font-bold sm:text-4xl">
          {label ? `${label}แนะนำ` : "สินค้าแนะนำ"}
        </h2>
        <p className="mt-3 text-white/70">ราคาหลังลดเมื่อ Subscribe ตามเงื่อนไขโปร ใช้กับรุ่นที่ร่วมรายการเท่านั้น สอบถามรุ่นที่ร่วมรายการได้ทาง LINE</p>
        <ul className="mt-8 grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-4">
          {products.map((product) => (
            <li key={product.slug}>
              <Link
                href={`/products/${product.slug}/`}
                className="group flex h-full flex-col overflow-hidden rounded-2xl bg-white text-[#2a1147] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-300"
              >
                <ImageFallback
                  label={`${product.promotionImage ? "ภาพโปรโมชัน" : "ภาพสินค้า"} ${product.name}`}
                  src={product.promotionImage ?? product.image}
                  aspect="square"
                  sizes="(max-width: 1024px) 50vw, 280px"
                  fit="contain"
                  className="rounded-none border-0"
                />
                <span className="flex flex-1 flex-col gap-1 border-t border-black/10 p-3 sm:p-4">
                  <span className="line-clamp-3 text-sm font-bold leading-6 group-hover:text-red-700 sm:text-base">
                    {product.name}
                  </span>
                  <span className="text-xs font-semibold text-neutral-600">{product.model}</span>
                  <span className="mt-auto pt-2">
                    <ProductPrice product={product} />
                  </span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
        <Button
          asChild
          size="lg"
          variant="outline"
          className="mt-6 w-full border-white/40 bg-transparent text-white hover:bg-white/10 hover:text-white sm:w-auto"
        >
          <Link href={category ? categoryHref(category) : "/products/"}>
            {label ? `ดู${label}ทุกรุ่น` : "ดูสินค้าทุกรุ่น"}
            <ArrowRight />
          </Link>
        </Button>
        <p className="mt-4 text-sm text-white/60">ราคาตาม Price List เดือนตุลาคม 2569</p>
      </section>

      <section className="container-page pb-14 sm:pb-16" aria-labelledby="subscribe-day-reviews">
        <h2 id="subscribe-day-reviews" className="text-3xl font-bold sm:text-4xl">
          รีวิวการติดตั้งจากลูกค้า
        </h2>
        <p className="mt-3 text-white/70">LG WashTower WT1410NHEG จัดส่งและติดตั้งถึงบ้านลูกค้า</p>
        <div className="mt-8 grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-4">
          {verifiedInstallPhotos.map((photo) => (
            <figure key={photo.src} className="relative aspect-[3/4] overflow-hidden rounded-2xl bg-white/10">
              <Image
                src={photo.src}
                alt={photo.alt}
                fill
                loading="lazy"
                sizes="(max-width: 1024px) 50vw, 25vw"
                className="object-cover"
              />
            </figure>
          ))}
        </div>
      </section>

      <section className="border-y border-white/10 bg-white/[0.04]" aria-labelledby="subscribe-day-categories">
        <div className="container-page py-14 sm:py-16">
          <h2 id="subscribe-day-categories" className="text-3xl font-bold sm:text-4xl">
            เลือกดูสินค้าตามหมวด
          </h2>
          <ul className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {categories.map((item) => (
              <li key={item.category}>
                <Link
                  href={categoryHref(item.category)}
                  className="flex min-h-14 items-center justify-between gap-3 rounded-xl border border-white/15 bg-[#14091f] px-4 py-3 font-semibold transition-colors hover:border-orange-400 hover:text-orange-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-300"
                >
                  {item.label}
                  <ArrowRight aria-hidden="true" className="size-4 shrink-0" />
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="container-page py-14 sm:py-16" aria-labelledby="subscribe-day-steps">
        <h2 id="subscribe-day-steps" className="text-3xl font-bold sm:text-4xl">
          ขั้นตอนรับโปร
        </h2>
        <ol className="mt-8 grid gap-5 md:grid-cols-3">
          {steps.map((step, index) => (
            <li key={step.title} className="rounded-2xl border border-white/15 p-6">
              <span className="grid size-10 place-items-center rounded-full bg-orange-500 font-black text-[#14091f]">
                {index + 1}
              </span>
              <p className="mt-4 text-xl font-bold">{step.title}</p>
              <p className="mt-2 leading-7 text-white/70">{step.text}</p>
            </li>
          ))}
        </ol>
        <div className="mt-10 flex flex-col items-start gap-5 rounded-2xl bg-gradient-to-r from-orange-600 to-red-700 p-6 sm:flex-row sm:items-center sm:justify-between sm:p-8">
          <p className="text-2xl font-bold">สนใจโปรนี้ แอดไลน์ได้เลย</p>
          <LineButton className="bg-white text-red-700 hover:bg-red-50" />
        </div>
        <p className="mt-6 text-sm text-white/60">*เงื่อนไขเป็นไปตามที่บริษัทฯ กำหนด | เฉพาะรุ่นที่ร่วมรายการ</p>
      </section>
    </div>
  );
}
