import Link from "next/link";
import {
  BadgeCheck,
  ClipboardCheck,
  ClipboardPen,
  House,
  MessageCircle,
  Monitor,
  ShieldCheck,
  Wrench,
  type LucideIcon,
} from "lucide-react";
import { LineMark } from "@/components/line-mark";
import { Button } from "@/components/ui/button";
import { siteConfig } from "@/lib/site";
import { cn } from "@/lib/utils";

type Step = {
  title: string;
  text: string;
  icon: LucideIcon | "line";
  href?: string;
};

const steps: Step[] = [
  {
    title: "เลือกสินค้าจากเว็บไซต์",
    text: "ชมสินค้าในเว็บไซต์และเลือกสินค้าที่ต้องการ",
    icon: Monitor,
    href: "/products/",
  },
  {
    title: `แอด LINE ${siteConfig.lineId}`,
    text: "แจ้งรุ่นที่สนใจ เพื่อรับโปรโมชัน หรือสอบถามข้อมูล",
    icon: "line",
    href: siteConfig.lineUrl,
  },
  {
    title: "แจ้งข้อมูลรายละเอียดเบื้องต้น เพื่อทำใบเสนอราคา",
    text: "ชื่อ, ที่อยู่, เบอร์โทร",
    icon: ClipboardPen,
  },
  {
    title: "หลังจากได้ใบเสนอราคา กรอกข้อมูลสั่งซื้อ",
    text: "ใส่ข้อมูลสั่งซื้อเพิ่มเติมตามขั้นตอน เพื่อยืนยันการสั่งซื้อ",
    icon: ClipboardCheck,
  },
];

const promises = [
  { icon: BadgeCheck, title: "ของแท้ 100%", text: "สินค้าแท้จาก LG" },
  { icon: Wrench, title: "ติดตั้งโดยทีมช่าง LG", text: "นัดหมายถึงบ้าน" },
  { icon: ShieldCheck, title: "มั่นใจในคุณภาพ", text: "บริการหลังการขาย" },
  { icon: House, title: "LG Subscribe", text: "คุ้ม ครบ จบในที่เดียว" },
] as const;

export function SubscribeSteps({ className }: { className?: string }) {
  return (
    <section
      id="subscribe-steps"
      aria-labelledby="subscribe-steps-heading"
      className={cn("scroll-mt-32", className)}
    >
      <div className="container-page">
        <div className="text-center">
          <p className="eyebrow">LG Subscribe</p>
          <h2
            id="subscribe-steps-heading"
            aria-label="ขั้นตอนการ Subscribe สินค้า LG"
            className="mt-3 text-3xl font-bold leading-tight tracking-tight sm:text-4xl lg:text-5xl"
          >
            <span aria-hidden="true" className="text-neutral-950">
              ขั้นตอนการ <span className="text-primary">Subscribe</span> สินค้า LG
            </span>
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-base leading-8 text-muted-foreground sm:text-lg">
            <span className="inline-block font-semibold text-primary">บริการดี อุ่นใจในทุกขั้นตอน</span>
          </p>
        </div>

        <ol className="mx-auto mt-10 grid max-w-5xl gap-4">
          {steps.map((step, index) => (
            <StepRow key={step.title} step={step} index={index} />
          ))}
        </ol>

        <div className="mx-auto mt-6 flex max-w-5xl flex-col items-center gap-4 rounded-2xl border border-primary/15 bg-[#fff8f8] px-5 py-6 text-center sm:flex-row sm:px-8 sm:text-left">
          <span className="grid size-12 shrink-0 place-items-center rounded-full bg-primary text-white">
            <MessageCircle className="size-5" strokeWidth={1.9} aria-hidden="true" />
          </span>
          <p className="min-w-0 flex-1 text-base font-bold leading-7 text-neutral-950 sm:text-lg">
            หากสงสัยหรือติดตรงขั้นตอนไหน สามารถสอบถามได้ทันที
          </p>
          <Button asChild size="lg" className="bg-[#06C755] hover:bg-[#05b64d]">
            <a href={siteConfig.lineUrl} target="_blank" rel="noreferrer">
              <LineMark className="size-5" /> แอด LINE {siteConfig.lineId}
            </a>
          </Button>
        </div>

        <div className="mx-auto mt-8 max-w-5xl overflow-hidden rounded-2xl bg-primary px-4 py-5 sm:px-6 sm:py-6">
          <div className="grid gap-4 rounded-2xl bg-white px-4 py-5 sm:grid-cols-2 sm:px-6 lg:grid-cols-4">
            {promises.map((item) => (
              <div key={item.title} className="flex items-center gap-3">
                <span className="grid size-12 shrink-0 place-items-center rounded-full bg-primary text-white">
                  <item.icon className="size-5" strokeWidth={1.9} aria-hidden="true" />
                </span>
                <p className="text-sm font-bold leading-5 text-neutral-900">
                  {item.title}
                  <span className="block font-semibold text-neutral-700">{item.text}</span>
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function StepRow({ step, index }: { step: Step; index: number }) {
  const content = (
    <>
      <span className="grid w-16 shrink-0 place-items-center bg-primary text-3xl font-black text-white sm:w-[4.5rem] sm:text-4xl">
        {index + 1}
      </span>
      <div className="flex min-w-0 flex-1 items-start gap-3 px-4 py-4 sm:items-center sm:gap-4 sm:px-5 sm:py-5">
        <span
          className={cn(
            "mt-0.5 grid size-12 shrink-0 place-items-center rounded-full border-[1.5px] sm:mt-0",
            step.icon === "line"
              ? "border-[#06C755] bg-[#06C755] text-white"
              : "border-primary bg-white text-primary",
          )}
        >
          {step.icon === "line" ? (
            <LineMark className="size-6" />
          ) : (
            <step.icon className="size-5" strokeWidth={1.8} aria-hidden="true" />
          )}
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="text-lg font-bold leading-snug text-neutral-950 sm:text-xl">{step.title}</h3>
          <p className="mt-1 text-sm leading-6 text-neutral-600">{step.text}</p>
        </div>
      </div>
    </>
  );

  const className =
    "flex overflow-hidden rounded-2xl border border-black/[0.07] bg-white shadow-[0_8px_24px_rgba(139,21,48,0.08)]";

  if (step.href?.startsWith("http")) {
    return (
      <li>
        <a
          href={step.href}
          target="_blank"
          rel="noreferrer"
          className={cn(
            className,
            "transition hover:-translate-y-0.5 hover:border-primary/25 hover:shadow-lg",
          )}
        >
          {content}
        </a>
      </li>
    );
  }

  if (step.href) {
    return (
      <li>
        <Link
          href={step.href}
          className={cn(
            className,
            "transition hover:-translate-y-0.5 hover:border-primary/25 hover:shadow-lg",
          )}
        >
          {content}
        </Link>
      </li>
    );
  }

  return <li className={className}>{content}</li>;
}
