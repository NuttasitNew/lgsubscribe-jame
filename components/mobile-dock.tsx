"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { LineMark } from "@/components/line-mark";
import { Button } from "@/components/ui/button";
import { getCurrentPageLabel } from "@/lib/current-page-label";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { navigation, products, siteConfig } from "@/lib/site";

const categories = Array.from(new Set(products.map((product) => product.category))).map((category) => ({
  category,
  product: products.find((product) => product.category === category)!,
}));

const navigationDescriptions: Record<string, string> = {
  "/": "ภาพรวมบริการและสินค้าที่น่าสนใจ",
  "/products/": "เลือกดูรุ่นที่อยู่ใน LG Subscription",
  "/authorized/": "ตรวจสอบข้อมูลผู้ให้บริการและช่องทางติดต่อ",
  "/terms/": "อ่านสัญญา ค่าใช้จ่าย และข้อควรรู้ก่อนสมัคร",
  "/contact/": "คุยกับเจ้าหน้าที่เพื่อเช็กแพ็กเกจล่าสุด",
};

export function MobileDock() {
  const currentPageLabel = getCurrentPageLabel(usePathname());

  return (
    <div className="fixed inset-x-0 bottom-3 z-50 px-3 pb-[env(safe-area-inset-bottom)] lg:hidden">
      <div className="mx-auto flex max-w-md items-center gap-2 rounded-[1.65rem] border border-black/10 bg-white/90 p-2 shadow-[0_16px_50px_rgba(0,0,0,0.22)] backdrop-blur-xl">
        <Sheet>
          <SheetTrigger asChild>
            <Button
              size="icon-lg"
              aria-label="เปิดเมนูหลัก"
              className="size-14 shrink-0 rounded-full bg-neutral-950 text-white hover:bg-neutral-800"
            >
              <span aria-hidden="true" className="grid w-6 gap-1.5">
                <span className="h-0.5 rounded-full bg-current" />
                <span className="h-0.5 rounded-full bg-current" />
                <span className="h-0.5 rounded-full bg-current" />
              </span>
            </Button>
          </SheetTrigger>
          <SheetContent
            side="left"
            showCloseButton={false}
            className="w-[92vw] max-w-[390px] gap-0 overflow-y-auto border-r border-black/10 bg-[#f7f5f2] text-neutral-950"
          >
            <SheetClose asChild>
              <button
                type="button"
                aria-label="ปิดเมนู"
                className="absolute right-4 top-4 z-10 grid size-10 place-items-center rounded-full border border-black/10 bg-white text-xl text-neutral-700 shadow-sm transition hover:bg-neutral-950 hover:text-white"
              >
                <span aria-hidden="true">×</span>
              </button>
            </SheetClose>

            <SheetHeader className="px-5 pb-5 pt-5 text-left">
              <div className="mb-7 flex items-center gap-3 pr-12">
                <span className="grid size-11 place-items-center rounded-full bg-primary text-xs font-bold text-white">LG</span>
                <span>
                  <span className="block text-base font-bold leading-none">LG Subscribe</span>
                  <span className="mt-1 block text-[10px] font-semibold uppercase tracking-[0.18em] text-neutral-400">Life&apos;s Good</span>
                </span>
              </div>
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-primary">เมนูหลัก</p>
              <SheetTitle className="mt-2 pb-1 text-3xl font-bold leading-[1.2] tracking-normal text-neutral-950">เลือกข้อมูลที่ต้องการ</SheetTitle>
              <SheetDescription className="mt-2 text-sm leading-6 text-neutral-500">สินค้า เงื่อนไข และข้อมูลสำคัญก่อนสมัคร</SheetDescription>
            </SheetHeader>

            <nav className="grid gap-2 px-4 pb-5" aria-label="เมนูมือถือ">
              {navigation.map((item, index) => (
                <SheetClose asChild key={item.href}>
                  <Link href={item.href} className="group grid grid-cols-[2.25rem_1fr_auto] items-center gap-3 rounded-2xl border border-black/[0.07] bg-white px-3 py-3 shadow-[0_1px_0_rgba(0,0,0,0.03)] transition hover:border-primary/30 hover:shadow-sm">
                    <span className="grid size-9 place-items-center rounded-xl bg-primary/[0.08] text-xs font-bold text-primary">0{index + 1}</span>
                    <span className="min-w-0">
                      <span className="block text-[15px] font-bold leading-6 text-neutral-900">{item.label}</span>
                      <span className="block text-xs leading-5 text-neutral-500">{navigationDescriptions[item.href]}</span>
                    </span>
                    <span aria-hidden="true" className="text-lg text-neutral-300 transition-transform group-hover:translate-x-0.5 group-hover:text-primary">→</span>
                  </Link>
                </SheetClose>
              ))}
            </nav>

            <div className="mt-auto grid gap-2 border-t border-black/[0.07] bg-white p-4">
              <p className="mb-1 text-xs font-semibold text-neutral-500">ต้องการให้ช่วยเลือกแพ็กเกจ?</p>
              <Button asChild className="h-12 rounded-xl bg-[#06C755] hover:bg-[#05b64d]">
                <a href={siteConfig.lineUrl} target="_blank" rel="noreferrer">แชทกับฝ่ายขายทาง LINE</a>
              </Button>
              <Button asChild variant="outline" className="h-12 rounded-xl border-black/10 bg-neutral-950 text-white hover:bg-neutral-800 hover:text-white">
                <a href={siteConfig.phoneHref}>โทร {siteConfig.phone}</a>
              </Button>
            </div>
          </SheetContent>
        </Sheet>

        <Sheet>
          <SheetTrigger asChild>
            <button
              type="button"
              className="flex h-14 min-w-0 flex-1 items-center gap-3 rounded-[1.25rem] bg-primary px-4 text-left text-white transition-colors hover:bg-primary/90"
              aria-label="เปิดหมวดสินค้าแบบด่วน"
            >
              <span aria-hidden="true" className="grid size-9 shrink-0 grid-cols-2 gap-1 rounded-xl bg-white/15 p-2.5">
                <span className="rounded-[2px] bg-white" /><span className="rounded-[2px] bg-white" />
                <span className="rounded-[2px] bg-white" /><span className="rounded-[2px] bg-white" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-[10px] font-medium tracking-normal text-white/65">เลือกหมวดหมู่</span>
                <span className="block truncate text-sm font-bold">{currentPageLabel}</span>
              </span>
              <span aria-hidden="true" className="shrink-0 text-lg">⌃</span>
            </button>
          </SheetTrigger>
          <SheetContent side="bottom" className="max-h-[88dvh] w-full overflow-y-auto rounded-t-[2rem] border-t bg-[#f7f5f2] px-4 pb-8 pt-3 sm:max-w-none">
            <div className="mx-auto mb-5 h-1.5 w-12 rounded-full bg-neutral-300" />
            <SheetHeader className="px-2 text-left">
              <SheetTitle className="text-2xl font-bold">เลือกหมวดสินค้า LG</SheetTitle>
              <SheetDescription className="mt-1 leading-6">ดูรุ่น รายละเอียด และราคาอ้างอิงก่อนเปิดหน้าสินค้า</SheetDescription>
            </SheetHeader>
            <div className="mt-4 grid gap-3">
              {categories.map(({ category, product }) => (
                <SheetClose asChild key={category}>
                  <Link
                    href={`/products/${product.slug}/`}
                    className="group grid min-h-24 grid-cols-[5rem_1fr_auto] items-center gap-3 rounded-2xl border border-black/[0.08] bg-white p-3 shadow-[0_1px_0_rgba(0,0,0,0.03)] transition hover:border-primary/30 hover:shadow-sm"
                  >
                    <span className="relative block aspect-square w-20 overflow-hidden rounded-xl border border-black/[0.06] bg-white">
                      <Image src={product.image} alt={`ภาพสินค้า ${product.name}`} fill sizes="80px" className="object-contain p-2" />
                    </span>
                    <span className="min-w-0">
                      <span className="block text-[10px] font-bold uppercase tracking-[0.12em] text-primary">{category}</span>
                      <span className="mt-1 block text-sm font-bold leading-5 text-neutral-900">{product.name}</span>
                      <span className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-neutral-500">
                        <span>{product.model}</span>
                        <span aria-hidden="true" className="size-1 rounded-full bg-neutral-300" />
                        <span className="font-semibold text-neutral-700">
                          {product.monthlyPrice ? `เริ่มต้น ฿${product.monthlyPrice.toLocaleString("th-TH")}/เดือน` : "สอบถามราคาล่าสุด"}
                        </span>
                      </span>
                    </span>
                    <span aria-hidden="true" className="text-lg text-neutral-300 transition-transform group-hover:translate-x-0.5 group-hover:text-primary">→</span>
                  </Link>
                </SheetClose>
              ))}
            </div>
            <SheetClose asChild>
              <Link href="/products/" className="mt-3 flex h-12 items-center justify-center rounded-xl bg-neutral-950 text-sm font-bold text-white">ดูสินค้าทั้งหมด</Link>
            </SheetClose>
          </SheetContent>
        </Sheet>

        <a
          href={siteConfig.lineUrl}
          target="_blank"
          rel="noreferrer"
          aria-label="แชทกับฝ่ายขายทาง LINE"
          className="group relative grid size-14 shrink-0 place-items-center rounded-full bg-[#06C755] text-white shadow-[0_8px_22px_rgba(6,199,85,0.34)] transition-transform hover:scale-105 active:scale-95"
        >
          <span aria-hidden="true" className="absolute inset-1 animate-ping rounded-full bg-white/20 [animation-duration:2.5s]" />
          <LineMark className="relative size-7" />
        </a>
      </div>
    </div>
  );
}
