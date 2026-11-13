import { ArrowRight, Megaphone, Plane } from "lucide-react";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { ImageFallback } from "@/components/image-fallback";
import { LineMark } from "@/components/line-mark";
import { Button } from "@/components/ui/button";
import { verifiedInstallPhotos } from "@/feature/public/products/components/wash-tower-reviews";
import { Hibiscus, PalmLeaf, Plumeria, Wave } from "@/feature/public/subscribe-day/components/tropical-decor";
import { getSubscribeDayProducts } from "@/feature/public/subscribe-day/subscribe-day-products";
import { authorizedAgent, createPageMetadata, siteConfig, type Product } from "@/lib/site";
import { isSubscribeDayActive, subscribeDayCampaign } from "@/lib/subscribe-day";
import { getSubscriptionFirstBillPrice } from "@/lib/subscription-starting-prices";
import { subscribeDayImage } from "@/lib/subscribe-day-image";

export const metadata: Metadata = {
  ...createPageMetadata({
    title: "LG Subscribe Day ขยายเวลาถึง 15 พ.ย. 69 | ลด 15% ฉลองครบรอบ 2 ปี",
    description:
      "ขยายเวลาโปรโมชั่น LG Subscribe Day ถึง 15 พ.ย. 69 ลูกค้าใหม่ Subscribe 2 เครื่องขึ้นไป ลด 15% ลูกค้าเดิม Subscribe 1 เครื่องขึ้นไป ลด 15% ฉลองครบรอบ 2 ปี ยิ่งซับ ยิ่งฟิน ลุ้นบินมัลดีฟส์ เงื่อนไขเป็นไปตามที่บริษัทฯ กำหนด เฉพาะรุ่นที่ร่วมรายการ",
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
    <div className="bg-[#fdf6e7] text-[#0c3a4a]">
      <header className="relative isolate overflow-hidden bg-[linear-gradient(180deg,#d6f2fd_0%,#a9e4f7_45%,#4fd1d0_100%)]">
        <PalmLeaf className="absolute -left-6 -top-4 -z-10 size-32 -scale-x-100 rotate-180 opacity-80 sm:size-44" />
        <PalmLeaf className="absolute -right-8 top-24 -z-10 hidden size-48 rotate-[200deg] opacity-70 lg:block" />
        <div className="container-page grid items-center gap-10 pb-20 pt-10 sm:pb-24 sm:pt-14 lg:grid-cols-[minmax(0,1fr)_minmax(0,26rem)] lg:gap-14 lg:pt-16">
          <div>
            <p className="inline-flex -rotate-1 items-center gap-2 rounded-md bg-red-600 px-4 py-2 text-base font-black text-white shadow-[0_6px_0_#991b1b] sm:text-lg">
              <Megaphone aria-hidden="true" className="size-5 text-amber-200" />
              ขยายเวลาโปรโมชั่น
            </p>
            <h1 className="mt-5 font-black leading-tight">
              <span className="block text-5xl text-red-700 [text-shadow:0_2px_0_#fde68a] sm:text-6xl">LG Subscribe Day</span>
              <span className="mt-2 block text-3xl text-[#0c3a4a] sm:text-4xl">ขยายเวลาถึง 15 พ.ย. 69</span>
              <span className="mt-3 block text-xl font-bold text-[#0e5a6b] sm:text-2xl">
                ฉลองครบรอบ 2 ปี ยิ่งซับ ยิ่งฟิน ลุ้นบินมัลดีฟส์
              </span>
            </h1>
            <p className="mt-5 inline-flex rounded-full bg-white px-5 py-2 text-lg font-bold text-red-700 shadow-sm ring-2 ring-amber-300">
              โปรโมชั่น {subscribeDayCampaign.dateLabel}
            </p>
            <p className="mt-4 max-w-xl leading-7 text-[#0c3a4a]/85">
              ลูกค้าใหม่และลูกค้าเดิมรับส่วนลด 15% เมื่อ Subscribe ตามจำนวนเครื่องที่กำหนด เฉพาะรุ่นที่ร่วมรายการ
            </p>
            <p className="mt-3 max-w-xl rounded-xl bg-white/70 px-4 py-3 text-sm leading-6 text-[#0c3a4a]">
              สมัครผ่านคุณ{authorizedAgent.nameTh} ตัวแทนขาย LG Subscribe ที่ได้รับอนุญาต รหัส {authorizedAgent.code}{" "}
              (ไม่ใช่ LG Electronics) ·{" "}
              <Link href={authorizedAgent.path} className="font-semibold underline underline-offset-2 hover:text-red-700">
                ตรวจสอบสถานะตัวแทน
              </Link>
            </p>
            <div className="mt-7 flex flex-col gap-3 sm:flex-row">
              <LineButton className="bg-red-600 text-white shadow-[0_4px_0_#991b1b] hover:bg-red-700" />
              <Button
                asChild
                size="lg"
                variant="outline"
                className="border-[#0c3a4a]/30 bg-white/60 text-[#0c3a4a] hover:bg-white hover:text-[#0c3a4a]"
              >
                <Link href="/products/">
                  ดูสินค้าทั้งหมด
                  <ArrowRight />
                </Link>
              </Button>
            </div>
          </div>
          <div className="relative mx-auto w-full max-w-md">
            <Hibiscus className="absolute -left-5 -top-5 z-10 size-16 drop-shadow sm:size-20" />
            <Plumeria className="absolute -bottom-4 -right-4 z-10 size-14 drop-shadow sm:size-16" />
            {/* Poster supplied by the user (LG's extended campaign artwork, 31 ต.ค.69 – 15 พ.ย.69). */}
            <Image
              {...subscribeDayImage}
              unoptimized
              alt={subscribeDayCampaign.alt}
              priority
              className="w-full rounded-2xl shadow-[0_24px_48px_rgba(12,58,74,0.35)] ring-4 ring-amber-200"
            />
          </div>
        </div>
        <Wave className="absolute inset-x-0 bottom-0 h-10 w-full text-[#fdf6e7] sm:h-14" />
      </header>

      <section className="container-page py-12 sm:py-16" aria-labelledby="subscribe-day-offers">
        <h2 id="subscribe-day-offers" className="text-3xl font-bold sm:text-4xl">
          รับส่วนลดอย่างไร
        </h2>
        <div className="mt-8 grid gap-5 md:grid-cols-2">
          {offers.map((offer) => (
            <article
              key={offer.customer}
              className="relative overflow-hidden rounded-2xl border-4 border-amber-300 bg-gradient-to-b from-white to-amber-50 p-6 shadow-[0_8px_24px_rgba(180,130,30,0.18)] sm:p-8"
            >
              <p className="inline-flex rounded-lg bg-gradient-to-b from-amber-200 to-amber-400 px-3 py-1 text-2xl font-black text-red-800">
                {offer.customer}
              </p>
              <p className="mt-3 text-lg font-semibold text-[#0c3a4a]">{offer.condition}</p>
              <p className="mt-2 text-6xl font-black text-red-700">ลด 15%</p>
            </article>
          ))}
        </div>
      </section>

      <section className="container-page pb-12 sm:pb-16" aria-labelledby="subscribe-day-maldives">
        <div className="relative overflow-hidden rounded-3xl bg-[linear-gradient(135deg,#0e7490,#14b8a6_60%,#5eead4)] p-6 text-white sm:p-10">
          <Plumeria className="absolute -right-6 -top-6 size-28 opacity-90" />
          <p className="text-lg font-bold text-amber-100">ฉลองครบรอบ 2 ปี LG Subscribe</p>
          <h2 id="subscribe-day-maldives" className="mt-2 text-4xl font-black leading-tight sm:text-5xl">
            <span className="text-amber-200">ยิ่งซับ ยิ่งฟิน</span>{" "}
            <span className="inline-flex items-center gap-2">
              ลุ้นบินมัลดีฟส์
              <Plane aria-hidden="true" className="size-8 -rotate-12 sm:size-10" />
            </span>
          </h2>
          <p className="mt-4 max-w-2xl leading-7 text-white/90">
            เป็นแคมเปญของ LG Subscribe กติกาการลุ้นรางวัลและเงื่อนไขเป็นไปตามที่บริษัทฯ กำหนด
            สอบถามรายละเอียดล่าสุดได้ทาง LINE
          </p>
        </div>
      </section>

      <section className="container-page pb-12 sm:pb-16" aria-labelledby="subscribe-day-products">
        <h2 id="subscribe-day-products" className="text-3xl font-bold sm:text-4xl">
          {label ? `${label}แนะนำ` : "สินค้าแนะนำ"}
        </h2>
        <p className="mt-3 text-[#0c3a4a]/80">ราคาหลังลดเมื่อ Subscribe ตามเงื่อนไขโปร ใช้กับรุ่นที่ร่วมรายการเท่านั้น สอบถามรุ่นที่ร่วมรายการได้ทาง LINE</p>
        <ul className="mt-8 grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-4">
          {products.map((product) => (
            <li key={product.slug}>
              <Link
                href={`/products/${product.slug}/`}
                className="group flex h-full flex-col overflow-hidden rounded-2xl bg-white text-[#0c3a4a] shadow-sm ring-1 ring-amber-200 transition-shadow hover:shadow-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-600"
              >
                <ImageFallback
                  label={`${product.promotionImage ? "ภาพโปรโมชัน" : "ภาพสินค้า"} ${product.name}`}
                  src={product.promotionImage ?? product.image}
                  aspect="square"
                  sizes="(max-width: 1024px) 50vw, 280px"
                  fit="contain"
                  className="rounded-none border-0"
                />
                <span className="flex flex-1 flex-col gap-1 border-t border-amber-100 p-3 sm:p-4">
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
          className="mt-6 w-full border-[#0c3a4a]/30 bg-white text-[#0c3a4a] hover:bg-amber-50 hover:text-[#0c3a4a] sm:w-auto"
        >
          <Link href={category ? categoryHref(category) : "/products/"}>
            {label ? `ดู${label}ทุกรุ่น` : "ดูสินค้าทุกรุ่น"}
            <ArrowRight />
          </Link>
        </Button>
        <p className="mt-4 text-sm text-[#0c3a4a]/70">ราคาตาม Price List เดือนตุลาคม 2569</p>
      </section>

      <section className="container-page pb-12 sm:pb-16" aria-labelledby="subscribe-day-reviews">
        <h2 id="subscribe-day-reviews" className="text-3xl font-bold sm:text-4xl">
          รีวิวการติดตั้งจากลูกค้า
        </h2>
        <p className="mt-3 text-[#0c3a4a]/80">LG WashTower WT1410NHEG จัดส่งและติดตั้งถึงบ้านลูกค้า</p>
        <div className="mt-8 grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-4">
          {verifiedInstallPhotos.map((photo) => (
            <figure key={photo.src} className="relative aspect-[3/4] overflow-hidden rounded-2xl bg-amber-100">
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

      <section className="bg-[#e6f7f8]" aria-labelledby="subscribe-day-categories">
        <div className="container-page py-12 sm:py-16">
          <h2 id="subscribe-day-categories" className="text-3xl font-bold sm:text-4xl">
            เลือกดูสินค้าตามหมวด
          </h2>
          <ul className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {categories.map((item) => (
              <li key={item.category}>
                <Link
                  href={categoryHref(item.category)}
                  className="flex min-h-14 items-center justify-between gap-3 rounded-xl border border-teal-200 bg-white px-4 py-3 font-semibold transition-colors hover:border-red-400 hover:text-red-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-600"
                >
                  {item.label}
                  <ArrowRight aria-hidden="true" className="size-4 shrink-0" />
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="container-page py-12 sm:py-16" aria-labelledby="subscribe-day-steps">
        <h2 id="subscribe-day-steps" className="text-3xl font-bold sm:text-4xl">
          ขั้นตอนรับโปร
        </h2>
        <ol className="mt-8 grid gap-5 md:grid-cols-3">
          {steps.map((step, index) => (
            <li key={step.title} className="rounded-2xl border border-amber-200 bg-white p-6">
              <span className="grid size-10 place-items-center rounded-full bg-gradient-to-b from-amber-300 to-amber-500 font-black text-red-800">
                {index + 1}
              </span>
              <p className="mt-4 text-xl font-bold">{step.title}</p>
              <p className="mt-2 leading-7 text-[#0c3a4a]/80">{step.text}</p>
            </li>
          ))}
        </ol>
        <div className="relative mt-10 flex flex-col items-start gap-5 overflow-hidden rounded-2xl bg-gradient-to-r from-red-600 to-red-700 p-6 text-white sm:flex-row sm:items-center sm:justify-between sm:p-8">
          <Hibiscus className="absolute -bottom-6 -right-6 size-24 opacity-40" />
          <p className="text-2xl font-bold">ขยายเวลาถึง 15 พ.ย. 69 สนใจแอดไลน์ได้เลย</p>
          <LineButton className="relative bg-white text-red-700 hover:bg-red-50" />
        </div>
        <p className="mt-6 text-sm text-[#0c3a4a]/70">*เงื่อนไขเป็นไปตามที่บริษัทฯ กำหนด | เฉพาะรุ่นที่ร่วมรายการ</p>
      </section>
    </div>
  );
}
