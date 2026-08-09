import Link from "next/link";
import { Button } from "@/components/ui/button";
import { siteConfig } from "@/lib/site";

export function ContactCta() {
  return (
    <section className="bg-red-700 text-white">
      <div className="container-page flex flex-col items-start justify-between gap-8 py-14 md:flex-row md:items-center">
        <div className="max-w-2xl">
          <p className="text-sm font-bold uppercase tracking-[0.18em] text-red-100">ปรึกษาฟรีก่อนสมัคร</p>
          <h2 className="mt-3 text-3xl font-bold sm:text-4xl">ให้เจ้าหน้าที่ช่วยเลือกแพ็กเกจที่เหมาะกับคุณ</h2>
          <p className="mt-4 leading-7 text-red-100">แจ้งสินค้าที่สนใจและงบรายเดือน ทีมฝ่ายขายพร้อมอธิบายเงื่อนไขก่อนตัดสินใจ</p>
        </div>
        <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
          <Button asChild size="lg" className="bg-white text-red-700 hover:bg-red-50">
            <a href={siteConfig.lineUrl} target="_blank" rel="noreferrer">
              แชทผ่าน LINE
            </a>
          </Button>
          <Button asChild size="lg" variant="outline" className="border-white/60 bg-transparent text-white hover:bg-white/10 hover:text-white">
            <Link href="/contact/">
              ช่องทางติดต่อ
            </Link>
          </Button>
        </div>
      </div>
    </section>
  );
}
