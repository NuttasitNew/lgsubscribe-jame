import Link from "next/link";
import { BrandLogo } from "@/components/brand-logo";
import { navigation } from "@/lib/site";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-black/[0.07] bg-background/90 backdrop-blur-xl">
      <div className="container-page flex h-[76px] items-center justify-between gap-5">
        <Link href="/" aria-label="LG Subscribe หน้าแรก" className="group flex shrink-0 items-center gap-3">
          <BrandLogo alt="LG" className="w-[4.75rem] transition-transform group-hover:scale-[1.03]" />
          <span>
            <span className="block text-lg font-bold leading-none tracking-[-0.02em] text-neutral-950">Subscribe</span>
            <span className="mt-1 hidden text-[9px] font-semibold uppercase tracking-[0.22em] text-neutral-400 sm:block">Living made simpler</span>
          </span>
        </Link>

        <nav className="hidden items-center rounded-full border border-black/[0.07] bg-white/70 p-1.5 shadow-sm lg:flex" aria-label="เมนูหลัก">
          {navigation.map((item) => (
            <Link key={item.href} href={item.href} className="rounded-full px-4 py-2 text-sm font-semibold text-neutral-600 transition-colors hover:bg-neutral-950 hover:text-white">
              {item.label}
            </Link>
          ))}
        </nav>

        <Link href="/contact/" className="hidden h-11 items-center gap-2 rounded-full bg-primary px-5 text-sm font-bold text-white transition-colors hover:bg-primary/90 lg:flex">
          สอบถามแพ็กเกจ <span aria-hidden="true">↗</span>
        </Link>

        <Link href="/products/" className="rounded-full border border-black/10 bg-white px-4 py-2 text-xs font-bold text-neutral-800 lg:hidden">สินค้า</Link>
      </div>
    </header>
  );
}
