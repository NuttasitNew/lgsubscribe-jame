import Image from "next/image";
import Link from "next/link";
import {
  BadgeCheck,
  BadgeDollarSign,
  CheckCircle2,
  FileText,
  Headset,
  House,
  Quote,
  ShieldCheck,
  Truck,
} from "lucide-react";
import { JsonLd } from "@/components/json-ld";
import { Button } from "@/components/ui/button";
import { customerStories, faqs, products } from "@/lib/site";

const categoryCards = [
  {
    label: "ตู้เย็น",
    model: "GN-F392PQAK",
    image: "/images/products/official/refrigerator-gn-f392pqak.jpg",
    href: "/products/",
  },
  {
    label: "เครื่องซักผ้า",
    model: "F2520RNTB",
    image: "/images/products/official/washer-f2520rntb.jpg",
    href: "/products/",
  },
  {
    label: "เครื่องปรับอากาศ",
    model: "IXY18A",
    image: "/images/products/official/air-conditioner-ixy18a.jpg",
    href: "/products/",
  },
  {
    label: "เครื่องกรองน้ำ",
    model: "WD518AN",
    image: "/images/products/official/water-purifier-wd518an.jpg",
    href: "/products/",
  },
  {
    label: "เครื่องดูดฝุ่น",
    model: "A9T-ULTRA",
    image: products[2].image,
    href: `/products/${products[2].slug}/`,
  },
  {
    label: "ทีวีและความบันเทิง",
    model: "OLED55C6PSA",
    image: "/images/products/official/tv-oled55c6psa.jpg",
    href: "/products/",
  },
  {
    label: "เครื่องฟอกอากาศ",
    model: "AS35GGW10",
    image: "/images/products/official/air-purifier-as35ggw10.jpg",
    href: "/products/",
  },
] as const;

const highlights = [
  [BadgeDollarSign, "ไม่ต้องจ่ายเงินก้อน", "เลือกแผนรายเดือนให้เหมาะกับบ้าน"],
  [Truck, "จัดส่งและติดตั้ง", "เจ้าหน้าที่นัดหมายถึงบ้าน"],
  [ShieldCheck, "ดูแลตลอดสัญญา", "ความคุ้มครองเป็นไปตามแพ็กเกจ"],
] as const;

const trustItems = [
  [FileText, "ข้อมูลชัดเจน", "ตรวจสอบราคา ระยะสัญญา และข้อยกเว้นก่อนยืนยัน"],
  [Headset, "บริการหลังการขาย", "รับคำแนะนำและนัดหมายบริการกับเจ้าหน้าที่"],
  [House, "ย้ายบ้านไม่ต้องกังวล", "สอบถามเงื่อนไขการย้ายจุดติดตั้งได้ล่วงหน้า"],
  [ShieldCheck, "มั่นใจ ปลอดภัย", "ตรวจสอบราคาและรายละเอียดกับเจ้าหน้าที่ก่อนยืนยัน"],
] as const;

export function HomePage() {
  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((faq) => ({
      "@type": "Question",
      name: faq.question,
      acceptedAnswer: { "@type": "Answer", text: faq.answer },
    })),
  };

  return (
    <>
      <JsonLd data={faqSchema} />

      <section className="home-hero">
        <div className="container-page relative grid min-h-[570px] min-w-0 items-center overflow-hidden py-12 lg:min-h-[640px] lg:grid-cols-[0.9fr_1.1fr] lg:py-16">
          <div className="relative z-20 min-w-0 max-w-[610px]">
            <p className="mb-3 text-sm font-bold text-primary">เครื่องใช้ไฟฟ้า LG จ่ายสบายแบบรายเดือน</p>
            <h1 className="text-[3rem] font-bold leading-[1.05] tracking-[-0.045em] text-neutral-950 sm:text-6xl lg:text-[4.7rem]">
              <span className="text-primary">LG</span> Subscribe
            </h1>
            <p className="mt-3 text-2xl font-bold leading-tight text-neutral-900 sm:text-[2rem]">
              จ่ายรายเดือน ไม่ต้องจ่ายเงินก้อน
            </p>
            <p className="mt-4 max-w-lg text-base leading-7 text-neutral-600 sm:text-lg">
              เลือกเครื่องใช้ไฟฟ้า LG ที่เหมาะกับบ้าน พร้อมบริการดูแลตามแพ็กเกจตลอดอายุสัญญา
            </p>

            <ul className="mt-7 grid gap-3">
              {[
                "วางแผนค่าใช้จ่ายเป็นรายเดือน",
                "จัดส่งและติดตั้งตามเงื่อนไข",
                "บริการดูแลโดยทีมงานตามแพ็กเกจ",
              ].map((item) => (
                <li
                  key={item}
                  className="flex items-center gap-3 text-sm font-semibold text-neutral-800 sm:text-base"
                >
                  <span className="grid size-7 shrink-0 place-items-center rounded-full border border-primary/20 bg-white text-primary shadow-sm">
                    <CheckCircle2 className="size-4" aria-hidden="true" />
                  </span>
                  {item}
                </li>
              ))}
            </ul>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Button asChild size="lg" className="px-8">
                <Link href="/price/">เช็กแพ็กเกจและราคา</Link>
              </Button>
            </div>
          </div>

          <div className="relative z-10 mt-10 aspect-[1.75/1] w-full overflow-hidden rounded-2xl bg-[#f5f1ec] lg:absolute lg:inset-0 lg:mt-0 lg:aspect-auto lg:w-full lg:rounded-none">
            <Image
              src="/images/hero/lg-subscribe-official-products-composite-v2.png"
              alt="กลุ่มสินค้า LG Subscribe ได้แก่ ตู้เย็น WashTower เครื่องดูดฝุ่น เครื่องกรองน้ำ เครื่องฟอกอากาศ และเครื่องปรับอากาศ"
              fill
              preload
              sizes="(max-width: 1024px) calc(100vw - 40px), 1280px"
              className="object-cover object-center lg:object-left"
            />
            <div className="absolute bottom-4 left-4 overflow-hidden rounded-xl bg-white px-5 pt-4 text-center shadow-xl sm:bottom-8 sm:left-7 sm:px-7 sm:pt-5 lg:bottom-auto lg:left-auto lg:right-6 lg:top-[38%]">
              <p className="text-sm font-bold text-neutral-800">ลดสูงสุด</p>
              <p className="mt-0.5 text-5xl font-black leading-none text-primary sm:text-6xl">
                50<span className="text-3xl">%</span>
              </p>
              <p className="mt-2 text-sm font-bold text-neutral-900 sm:text-base">นาน 12 เดือน*</p>
              <p className="-mx-7 mt-4 bg-primary px-4 py-2 text-[9px] font-medium text-white">
                *เงื่อนไขเป็นไปตามบริษัทกำหนด
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-white py-10 sm:py-12">
        <div className="container-page">
          <div className="mb-6 flex items-end justify-between gap-4">
            <div>
              <p className="text-sm font-bold text-primary">เลือกให้เหมาะกับทุกห้อง</p>
              <h2 className="mt-1 text-2xl font-bold text-neutral-950 sm:text-3xl">เลือกสินค้ายอดนิยม</h2>
            </div>
            <Link
              href="/products/"
              className="hidden shrink-0 text-sm font-bold text-primary hover:underline sm:block"
            >
              ดูสินค้าทั้งหมด →
            </Link>
          </div>
          <div className="grid min-w-0 grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-7">
            {categoryCards.map((item) => (
              <Link
                key={item.label}
                href={item.href}
                className="group rounded-2xl border border-black/[0.07] bg-white p-3 text-center shadow-[0_5px_22px_rgba(0,0,0,0.06)] transition hover:-translate-y-1 hover:border-primary/25 hover:shadow-lg"
              >
                <span className="relative block aspect-[1.35/1] overflow-hidden rounded-[6px] bg-white">
                  <Image
                    src={item.image}
                    alt={`${item.label} LG รุ่น ${item.model}`}
                    fill
                    sizes="(max-width: 640px) 50vw, 20vw"
                    className="object-contain p-2 transition-transform duration-300 group-hover:scale-105"
                  />
                </span>
                <span className="mt-3 block min-h-10 text-sm font-bold leading-5 text-neutral-850">
                  {item.label}
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="pb-8 sm:pb-10">
        <div className="container-page">
          <div className="overflow-hidden rounded-2xl bg-gradient-to-r from-[#fff0f2] via-[#fff7f7] to-[#f8e8eb] px-6 py-7 sm:px-9 lg:grid lg:grid-cols-[0.7fr_1.65fr] lg:items-center lg:gap-8">
            <div>
              <p className="text-lg font-bold text-neutral-900">สิทธิประโยชน์ LG Subscribe</p>
              <p className="mt-1 text-4xl font-black leading-tight text-primary">เริ่มต้น ฿149</p>
              <p className="text-sm font-semibold text-primary">ต่อเดือน ตามรุ่นและแพ็กเกจ*</p>
            </div>
            <div className="mt-6 grid gap-3 sm:grid-cols-3 lg:mt-0">
              {highlights.map(([Icon, title, description]) => (
                <div key={title} className="flex items-center gap-3 rounded-xl bg-white/85 p-4">
                  <span className="grid size-11 shrink-0 place-items-center rounded-full border border-primary/15 bg-[#fff5f6] text-primary">
                    <Icon className="size-5" strokeWidth={1.8} aria-hidden="true" />
                  </span>
                  <div>
                    <h3 className="text-sm font-bold text-neutral-900">{title}</h3>
                    <p className="mt-1 text-xs leading-5 text-neutral-500">{description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>


      <section id="reviews" className="bg-white py-12 sm:py-16">
        <div className="container-page">
          <div className="mb-8 flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
            <div className="max-w-2xl">
              <p className="flex items-center gap-2 text-sm font-bold text-primary">
                <BadgeCheck className="size-4" aria-hidden="true" /> รีวิวจากลูกค้าของเรา
              </p>
              <h2 className="mt-1 text-2xl font-bold sm:text-3xl">ประสบการณ์จากผู้ใช้งานจริง</h2>
              <p className="mt-2 text-sm leading-6 text-neutral-500">
                เสียงจากลูกค้าที่เลือกใช้เครื่องใช้ไฟฟ้า LG แบบรายเดือนกับเรา
              </p>
            </div>
            <p className="text-sm font-bold text-neutral-700">คะแนนเฉลี่ย 4.8 / 5</p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {customerStories.map((story, index) => (
              <article
                key={story.product}
                className="group flex min-h-[320px] flex-col rounded-2xl border border-black/[0.07] bg-[#faf9f7] p-6 shadow-[0_6px_22px_rgba(0,0,0,0.05)] transition hover:-translate-y-1 hover:border-primary/20 hover:shadow-lg"
              >
                <div className="flex items-start justify-between gap-4">
                  <span className="grid size-11 place-items-center rounded-full bg-primary text-sm font-black text-white">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <Quote className="size-8 text-primary/20" fill="currentColor" aria-hidden="true" />
                </div>
                <p className="mt-6 text-xs font-bold uppercase tracking-[0.12em] text-primary">
                  {story.product}
                </p>
                <h3 className="mt-2 text-lg font-bold leading-7 text-neutral-950">{story.title}</h3>
                <p className="mt-3 text-sm leading-6 text-neutral-600">{story.summary}</p>
                <div className="mt-auto border-t border-black/[0.07] pt-5">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-xs font-semibold text-neutral-700">{story.reviewer}</p>
                    <p
                      className="text-xs tracking-[0.1em] text-amber-500"
                      aria-label={`${story.rating} จาก 5 ดาว`}
                    >
                      {"★".repeat(story.rating)}
                      <span className="text-neutral-300">{"★".repeat(5 - story.rating)}</span>
                    </p>
                  </div>
                  <p className="mt-2 text-xs text-neutral-400">{story.context}</p>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="border-y border-black/[0.06] bg-[#fbfbfb]">
        <div className="container-page grid sm:grid-cols-2 lg:grid-cols-4">
          {trustItems.map(([Icon, title, text]) => (
            <div
              key={title}
              className="flex gap-4 border-b border-black/[0.06] px-3 py-8 sm:px-6 lg:border-b-0 lg:border-r lg:last:border-r-0"
            >
              <span className="grid size-12 shrink-0 place-items-center rounded-full border border-primary/15 bg-white text-primary">
                <Icon className="size-5" strokeWidth={1.8} aria-hidden="true" />
              </span>
              <div>
                <h2 className="text-sm font-bold text-neutral-950">{title}</h2>
                <p className="mt-1 text-xs leading-5 text-neutral-500">{text}</p>
              </div>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}
