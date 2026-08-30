import type { Metadata } from "next";
import { CreditCard, MessageCircle } from "lucide-react";
import { ContactCta } from "@/components/contact-cta";
import { JsonLd } from "@/components/json-ld";
import { LineMark } from "@/components/line-mark";
import { Button } from "@/components/ui/button";
import { createPageMetadata, siteConfig } from "@/lib/site";

export const metadata: Metadata = createPageMetadata({
  title: "สมัคร LG Subscribe ใช้บัตรเครดิตใบเดียวก็จบ",
  description:
    "สมัคร LG Subscribe ใช้บัตรเครดิตใบเดียวก็เพียงพอ รายละเอียดอื่นๆ แอด LINE OA @lgsubscribe ได้เลย",
  path: "/application-guide/",
});

const steps = [
  {
    title: "มีบัตรเครดิต 1 ใบ",
    text: "ใช้บัตรเครดิตใบเดียวก็สมัครได้ ไม่ต้องเตรียมเอกสารหลายอย่างให้ยุ่งยาก",
    Icon: CreditCard,
  },
  {
    title: "แอด LINE เพื่อดำเนินการต่อ",
    text: "รุ่น ราคา แพ็กเกจ และการนัดหมาย คุยกับเจ้าหน้าที่ทาง LINE ได้เลย",
    Icon: MessageCircle,
  },
] as const;

export default function ApplicationGuidePage() {
  const schema = {
    "@context": "https://schema.org",
    "@type": "HowTo",
    name: "วิธีสมัคร LG Subscribe",
    description: metadata.description,
    step: steps.map((step, index) => ({
      "@type": "HowToStep",
      position: index + 1,
      name: step.title,
      text: step.text,
    })),
  };

  return (
    <>
      <JsonLd data={schema} />
      <header className="page-hero">
        <div className="container-page max-w-5xl">
          <p className="text-sm font-bold uppercase tracking-[0.18em] text-red-400">Application Guide</p>
          <h1 className="mt-4 text-4xl font-bold sm:text-5xl">สมัคร LG Subscribe ใช้บัตรเครดิตใบเดียวก็จบ</h1>
          <p className="mt-5 max-w-3xl text-lg leading-8 text-white/65">
            ไม่ต้องเตรียมเอกสารหลายอย่าง รายละเอียดอื่นๆ กดแอด LINE ได้เลย
          </p>
          <Button asChild size="lg" className="mt-8 bg-[#06C755] hover:bg-[#05b64d]">
            <a href={siteConfig.lineUrl} target="_blank" rel="noreferrer">
              <LineMark className="size-5" /> เพิ่มเพื่อน LINE {siteConfig.lineId}
            </a>
          </Button>
        </div>
      </header>

      <section className="section-space">
        <div className="container-page">
          <div className="grid gap-5 md:grid-cols-2">
            {steps.map(({ title, text, Icon }, index) => (
              <article
                key={title}
                className="rounded-2xl border border-black/[0.07] bg-white p-7 shadow-[0_6px_22px_rgba(0,0,0,0.05)]"
              >
                <span className="grid size-12 place-items-center rounded-full border border-primary/15 bg-[#fff5f6] text-primary">
                  <Icon className="size-5" strokeWidth={1.8} aria-hidden="true" />
                </span>
                <p className="mt-5 text-xs font-bold uppercase tracking-[0.18em] text-primary">
                  ขั้นตอน {String(index + 1).padStart(2, "0")}
                </p>
                <h2 className="mt-2 text-2xl font-bold">{title}</h2>
                <p className="mt-3 leading-7 text-muted-foreground">{text}</p>
              </article>
            ))}
          </div>

          <div className="mt-10 rounded-2xl border border-[#06C755]/20 bg-[#f3fff6] p-7 sm:p-9">
            <h2 className="text-2xl font-bold text-neutral-950">รายละเอียดอื่นๆ แอด LINE ได้เลย</h2>
            <p className="mt-3 max-w-3xl leading-7 text-neutral-700">
              สอบถามรุ่นที่สนใจ ยอดต่อเดือน หรือนัดหมายติดตั้ง คุยกับเจ้าหน้าที่ที่ LINE Official Account{" "}
              {siteConfig.lineId} ได้ทันที
            </p>
            <Button asChild size="lg" className="mt-6 bg-[#06C755] hover:bg-[#05b64d]">
              <a href={siteConfig.lineUrl} target="_blank" rel="noreferrer">
                <LineMark className="size-5" /> เพิ่มเพื่อน LINE
              </a>
            </Button>
          </div>
        </div>
      </section>
      <ContactCta />
    </>
  );
}
