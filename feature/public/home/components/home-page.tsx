import Link from "next/link";
import { ContactCta } from "@/components/contact-cta";
import { GeneratedIcon } from "@/components/generated-icon";
import { HeroProductShowcase } from "@/components/hero-product-showcase";
import { ImageFallback } from "@/components/image-fallback";
import { JsonLd } from "@/components/json-ld";
import { ProductCard } from "@/components/product-card";
import { SectionHeading } from "@/components/section-heading";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { faqs, products, siteConfig } from "@/lib/site";

const benefits = [
  ["/images/generated/icon-monthly-payment-v1.webp", "เริ่มต้นได้โดยไม่ใช้เงินก้อน", "เลือกยอดรายเดือนและระยะสัญญาให้เหมาะกับแผนค่าใช้จ่าย"],
  ["/images/generated/icon-expert-care-v1.webp", "บริการดูแลตามแพ็กเกจ", "รอบบริการและความคุ้มครองระบุชัดเจนตามสินค้าแต่ละกลุ่ม"],
  ["/images/generated/icon-protection-v1.webp", "เงื่อนไขตรวจสอบได้", "อ่านระยะสัญญา การรับประกัน และข้อยกเว้นก่อนยืนยันทุกครั้ง"],
  ["/images/generated/icon-delivery-v1.webp", "จัดส่งและติดตั้งถึงบ้าน", "เจ้าหน้าที่นัดหมายหลังคำสั่งซื้อและข้อมูลลูกค้าได้รับอนุมัติ"],
] as const;

const topics = [
  ["01", "/what-is-lg-subscribe/", "LG Subscribe คืออะไร", "เข้าใจรูปแบบบริการ ข้อดี ข้อควรรู้ และเหมาะกับใคร"],
  ["02", "/application-guide/", "สมัครอย่างไร ใช้อะไรบ้าง", "เตรียมข้อมูล เอกสาร ขั้นตอนอนุมัติ และการติดตั้ง"],
  ["03", "/price/", "ราคาและยอดรวมตลอดสัญญา", "เทียบยอดรายเดือน จำนวนงวด และค่าใช้จ่ายที่อาจเกิดขึ้น"],
  ["04", "/terms/", "สัญญาและการยกเลิก", "อ่านประเด็นสำคัญก่อนลงนามและขอข้อมูลจากเจ้าหน้าที่"],
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

      <section className="relative overflow-hidden bg-[#171717] text-white">
        <div className="container-page grid min-h-[720px] items-center gap-10 py-12 lg:grid-cols-[1.08fr_0.92fr] lg:gap-14 lg:py-20">
          <div className="relative z-10 max-w-4xl">
            <p className="mb-6 text-xs font-bold uppercase tracking-[0.2em] text-red-400">Life&apos;s Good.</p>
            <h1 className="pb-1 text-[2.75rem] font-bold leading-[1.16] tracking-normal sm:text-6xl sm:leading-[1.12] lg:text-7xl">
              ชีวิตดี ๆ เริ่มที่บ้าน
              <span className="block text-red-500">ง่ายขึ้นด้วย LG Subscribe</span>
            </h1>
            <p className="mt-8 max-w-2xl text-lg leading-8 text-white/65">
              เลือกสินค้า LG ที่เหมาะกับบ้าน พร้อมแผนรายเดือนและบริการดูแลตามแพ็กเกจ ให้ทุกวันสบายใจตั้งแต่เริ่มต้น
            </p>
            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
              <Button asChild size="lg" className="rounded-full px-7">
                <Link href="/products/">ดูสินค้าทั้งหมด <span aria-hidden="true">→</span></Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="rounded-full border-white/20 bg-transparent px-7 text-white hover:bg-white/10 hover:text-white">
                <a href={siteConfig.lineUrl} target="_blank" rel="noreferrer">คุยกับเจ้าหน้าที่ทาง LINE</a>
              </Button>
            </div>
          </div>

          <HeroProductShowcase />

          <div className="relative z-10 col-span-full grid grid-cols-3 border-y border-white/15">
            {[["เริ่มต้น", "หลักร้อย/เดือน"], ["ระยะสัญญา", "ตามรุ่นและแพ็กเกจ"], ["บริการ", "นัดหมายถึงบ้าน"]].map(([label, value]) => (
              <div key={label} className="border-r border-white/15 px-3 py-5 last:border-r-0 sm:px-6">
                <p className="text-xs uppercase tracking-[0.16em] text-white/40">{label}</p>
                <p className="mt-2 text-sm font-semibold sm:text-base">{value}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="border-b border-black/10 bg-white">
        <div className="container-page grid md:grid-cols-2 lg:grid-cols-4">
          {benefits.map(([icon, title, description], index) => (
            <article key={title} className="border-black/10 px-6 py-9 md:border-r lg:last:border-r-0">
              <div className="flex items-center justify-between">
                <GeneratedIcon src={icon} alt="" className="size-12" />
                <span className="text-xs font-bold text-neutral-300">0{index + 1}</span>
              </div>
              <h2 className="mt-6 text-lg font-bold">{title}</h2>
              <p className="mt-3 text-sm leading-7 text-muted-foreground">{description}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="section-space">
        <div className="container-page">
          <SectionHeading align="left" eyebrow="สินค้าที่น่าสนใจ" title="เลือกจากการใช้งานจริง ไม่ใช่แค่ราคา" description={`ราคาเป็นข้อมูลอ้างอิงที่ตรวจสอบเมื่อ ${siteConfig.offerReviewedAt} โปรดให้เจ้าหน้าที่ยืนยันข้อเสนอล่าสุดก่อนสมัคร`} />
          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {products.map((product) => <ProductCard key={product.slug} product={product} />)}
          </div>
        </div>
      </section>

      <section className="border-y border-black/10 bg-white">
        <div className="container-page grid items-center gap-10 py-16 lg:grid-cols-[0.92fr_1.08fr] lg:gap-16 lg:py-24">
          <ImageFallback
            label="ภาพสินค้าเครื่องกรองน้ำ LG PuriCare ในโปรแกรม Subscription"
            src="/images/products/official/puricare-wd516an-aslplmt.jpg"
            fallbackSrc="/images/service-showcase-generated.webp"
            aspect="landscape"
            fit="contain"
          />
          <div>
            <p className="eyebrow">LG Subscribe คืออะไร</p>
            <h2 className="mt-4 text-4xl font-bold leading-tight sm:text-5xl">เลือกสินค้าเป็นรายเดือน พร้อมบริการที่วางแผนไว้</h2>
            <p className="mt-6 text-lg leading-8 text-muted-foreground">พื้นที่นี้ยังรักษาตำแหน่งสำหรับภาพตัวแทนและสินค้า LG เพื่อให้เปลี่ยนเป็นภาพจริงได้ภายหลังโดยไม่ต้องรื้อ layout ใหม่</p>
            <ul className="mt-8 grid gap-4">
              {["ตรวจสอบเครดิตและสถานที่ติดตั้งก่อนอนุมัติ", "สัญญาเริ่มเมื่อจัดส่งหรือติดตั้งแล้วเสร็จ", "บริการและระยะคุ้มครองขึ้นอยู่กับแพ็กเกจ"].map((item) => (
                <li key={item} className="flex items-start gap-3 text-sm font-medium leading-7"><span className="mt-2 size-2 shrink-0 rounded-full bg-primary" />{item}</li>
              ))}
            </ul>
            <Button asChild variant="outline" className="mt-9 rounded-full px-6"><Link href="/what-is-lg-subscribe/">อ่านรายละเอียด <span aria-hidden="true">→</span></Link></Button>
          </div>
        </div>
      </section>

      <section className="border-y border-black/10 bg-white">
        <div className="container-page grid lg:grid-cols-[0.72fr_1.28fr]">
          <div className="py-16 pr-8 lg:border-r lg:py-24 lg:pr-16">
            <p className="eyebrow">ก่อนสมัคร</p>
            <h2 className="mt-4 text-4xl font-bold leading-tight">สี่เรื่องที่ควรรู้ ก่อนเลือกแพ็กเกจ</h2>
            <p className="mt-5 leading-8 text-muted-foreground">เราแยกเนื้อหาตามคำถามที่ลูกค้าค้นหาจริง เพื่อให้เปรียบเทียบและตัดสินใจได้ง่ายขึ้น</p>
          </div>
          <div>
            {topics.map(([number, href, title, description]) => (
              <Link key={href} href={href} className="group grid gap-3 border-b border-black/10 py-7 last:border-b-0 sm:grid-cols-[56px_1fr_auto] sm:items-center sm:px-8">
                <span className="text-xs font-bold text-primary">{number}</span>
                <span><strong className="block text-lg">{title}</strong><span className="mt-1 block text-sm leading-6 text-muted-foreground">{description}</span></span>
                <span aria-hidden="true" className="text-lg transition-transform group-hover:translate-x-1">→</span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="section-space">
        <div className="container-page grid gap-10 lg:grid-cols-[0.65fr_1.35fr]">
          <div>
            <p className="eyebrow">How it works</p>
            <h2 className="mt-4 text-4xl font-bold">เริ่มต้นง่ายใน 3 ขั้นตอน</h2>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            {[["/images/generated/icon-consultation-v1.webp", "เลือก", "เลือกรุ่น งบ และระยะสัญญาที่สนใจ"], ["/images/generated/icon-document-v1.webp", "ตรวจสอบ", "รับรายละเอียด ราคา และเงื่อนไขล่าสุด"], ["/images/generated/icon-delivery-v1.webp", "นัดหมาย", "ยืนยันข้อมูลและนัดจัดส่งหรือติดตั้ง"]].map(([icon, title, text], index) => (
              <article key={title} className="editorial-card p-6"><GeneratedIcon src={icon} alt="" className="size-12" /><p className="mt-8 text-xs font-bold text-neutral-400">STEP 0{index + 1}</p><h3 className="mt-2 text-xl font-bold">{title}</h3><p className="mt-3 text-sm leading-7 text-muted-foreground">{text}</p></article>
            ))}
          </div>
        </div>
      </section>

      <section className="border-t border-black/10 bg-white">
        <div className="container-page grid gap-10 py-16 lg:grid-cols-[0.65fr_1.35fr] lg:py-24">
          <div><p className="eyebrow">คำถามยอดนิยม</p><h2 className="mt-4 text-4xl font-bold">ตอบให้ชัด ก่อนตัดสินใจ</h2></div>
          <Accordion type="single" collapsible className="border-t border-black/10">
            {faqs.map((faq, index) => <AccordionItem key={faq.question} value={`faq-${index}`}><AccordionTrigger className="py-6 text-base">{faq.question}</AccordionTrigger><AccordionContent>{faq.answer}</AccordionContent></AccordionItem>)}
          </Accordion>
        </div>
      </section>

      <ContactCta />
    </>
  );
}
