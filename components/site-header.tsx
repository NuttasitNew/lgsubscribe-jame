import Image from "next/image";
import Link from "next/link";
import { LineMark } from "@/components/line-mark";
import { SiteHeaderActions } from "@/components/site-header-actions";
import { siteConfig } from "@/lib/site";

const headerNavigation = [
  ["/", "หน้าแรก"],
  ["/products/", "สินค้า"],
  ["/#reviews", "คำถามลูกค้า"],
  ["/what-is-lg-subscribe/", "LG Subscribe คืออะไร"],
  ["/authorized/", "เกี่ยวกับเรา"],
  ["/contact/", "ติดต่อเรา"],
] as const;

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-black/[0.07] bg-white/95 backdrop-blur-xl">
      <div className="mx-auto flex h-[76px] w-full max-w-[1480px] items-center justify-between gap-5 px-5 sm:px-8">
        <Link href="/" aria-label="LG Subscribe หน้าแรก" className="group flex shrink-0 items-center gap-3">
          <Image
            src="/brand/lg-subscribe-logo-red.png"
            alt="LG Subscribe"
            width={1581}
            height={316}
            preload
            className="h-auto w-[9.75rem] transition-transform group-hover:scale-[1.02] sm:w-[11.5rem]"
          />
        </Link>

        <nav className="hidden items-center gap-6 xl:flex" aria-label="เมนูหลัก">
          {headerNavigation.map(([href, label]) => (
            <Link
              key={href}
              href={href}
              className="whitespace-nowrap text-[13px] font-semibold text-neutral-800 transition-colors hover:text-primary"
            >
              {label}
            </Link>
          ))}
        </nav>

        <a
          href={siteConfig.lineUrl}
          target="_blank"
          rel="noreferrer"
          className="hidden h-11 items-center gap-2 rounded-lg bg-primary px-5 text-sm font-bold text-white shadow-sm transition-colors hover:bg-[#aa102b] xl:flex"
        >
          <LineMark className="size-5" /> สอบถามผ่าน LINE
        </a>

        <SiteHeaderActions />
      </div>
    </header>
  );
}
