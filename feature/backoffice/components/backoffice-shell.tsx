"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { BarChart3, Users, Menu, MessageCircle, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { allowedPages, type BackofficeIdentity } from "@/lib/backoffice/permissions";
import { cn } from "@/lib/utils";

export function BackofficeShell({ children, user }: { children: React.ReactNode; user: BackofficeIdentity }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const pages = allowedPages(user).map((page) => ({
    ...page,
    icon: page.group === "LINE" ? MessageCircle : page.group === "ผู้ดูแลระบบ" ? Users : BarChart3,
  }));
  const current = pages.find((page) => pathname.replace(/\/$/, "") === page.href.replace(/\/$/, ""));
  function navigation(mobile = false) {
    return (
      <nav aria-label={mobile ? "เมนูมือถือ" : "เมนูหลัก"} className="space-y-1 p-3">
        {pages.map(({ href, label, icon: Icon, group }, index) => (
          <div key={href}>
            {(index === 0 || pages[index - 1].group !== group) && (
              <p className="px-3 pb-2 pt-4 text-xs font-semibold text-slate-400">{group}</p>
            )}
            <Link
              key={href}
              href={href}
              onClick={() => setOpen(false)}
              aria-current={current?.href === href ? "page" : undefined}
              className={cn(
                "flex min-h-11 items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                current?.href === href ? "bg-red-50 text-primary" : "text-slate-600 hover:bg-slate-100",
              )}
            >
              <Icon className="size-4 shrink-0" />
              {label}
            </Link>
          </div>
        ))}
      </nav>
    );
  }
  return (
    <div className="min-h-screen bg-[#eef0f2] text-[#1d1f22] [--background:0_0%_100%] [--border:216_12%_84%] [--muted:216_14%_95%] [--secondary:216_14%_95%]">
      <a
        href="#backoffice-content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[60] focus:rounded-lg focus:bg-white focus:p-3"
      >
        ข้ามไปเนื้อหา
      </a>
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-56 overflow-y-auto border-r bg-white lg:block">
        <Link href="/backoffice/" className="flex h-16 items-center gap-3 border-b px-5 font-semibold">
          <span className="grid size-8 place-items-center rounded-lg bg-primary text-xs text-white">LG</span>
          หลังบ้านเว็บไซต์
        </Link>
        {navigation()}
      </aside>
      <div className="min-w-0 lg:pl-56">
        <header className="sticky top-0 z-40 flex min-h-16 items-center justify-between gap-2 border-b bg-white px-4 sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <Sheet open={open} onOpenChange={setOpen}>
              <SheetTrigger asChild>
                <Button
                  variant="outline"
                  size="icon-sm"
                  className="size-11 shrink-0 lg:hidden"
                  aria-label="เปิดเมนู"
                >
                  <Menu className="size-5" />
                </Button>
              </SheetTrigger>
              <SheetContent
                side="left"
                className="w-[min(20rem,calc(100vw-32px))] overflow-y-auto bg-white"
                showCloseButton={false}
              >
                <SheetHeader className="pr-14">
                  <SheetTitle>หลังบ้านเว็บไซต์</SheetTitle>
                  <SheetDescription>LG Subscribe · เลือกหน้าที่ต้องการ</SheetDescription>
                </SheetHeader>
                <SheetClose asChild>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label="ปิดเมนู"
                    className="absolute right-3 top-3 size-11"
                  >
                    <X className="size-5" />
                  </Button>
                </SheetClose>
                {navigation(true)}
              </SheetContent>
            </Sheet>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">{current?.label ?? "หลังบ้านเว็บไซต์"}</p>
              <p className="truncate text-xs text-slate-500">{user.displayName}</p>
            </div>
          </div>
          <form action="/api/backoffice/logout/" method="POST">
            <Button type="submit" size="sm" variant="outline" className="min-h-11 shrink-0">
              ออกจากระบบ
            </Button>
          </form>
        </header>
        <div id="backoffice-content" tabIndex={-1} className="min-w-0">
          {children}
        </div>
      </div>
    </div>
  );
}
