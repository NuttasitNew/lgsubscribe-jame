import type { Metadata } from "next";
import Link from "next/link";
import { ContactCta } from "@/components/contact-cta";
import { GeneratedIcon } from "@/components/generated-icon";
import { HeroProductShowcase } from "@/components/hero-product-showcase";
import { JsonLd } from "@/components/json-ld";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { createPageMetadata, siteConfig } from "@/lib/site";

export const metadata: Metadata = createPageMetadata({
  title: "LG Subscribe คืออะไร ดีไหม คุ้มไหม และเหมาะกับใคร",
  description: "ทำความเข้าใจ LG Subscribe รูปแบบเช่าซื้อรายเดือน ข้อดี ข้อควรรู้ ค่าใช้จ่าย บริการซ่อม และสิ่งที่ต้องอ่านก่อนทำสัญญา",
  path: "/what-is-lg-subscribe/",
});

const questions = [
  { q: "LG Subscribe คืออะไร?", a: "บริการเช่าซื้อเครื่องใช้ไฟฟ้า LG แบบชำระรายเดือน โดยสิทธิรับประกันและบริการซ่อมบำรุงขึ้นอยู่กับสินค้า แพ็กเกจ และแบบฟอร์มคำสั่งซื้อ" },
  { q: "LG Subscribe ดีไหม?", a: "เหมาะกับคนที่ต้องการกระจายค่าใช้จ่ายและให้ความสำคัญกับบริการดูแล แต่ควรเปรียบเทียบยอดชำระรวมและระยะสัญญากับการซื้อรูปแบบอื่น" },
  { q: "LG Subscribe คุ้มไหม?", a: "ความคุ้มขึ้นอยู่กับราคาสินค้า ระยะสัญญา ความถี่ของบริการ และการใช้งานจริง ควรขอแบบฟอร์มคำสั่งซื้อเพื่อคำนวณยอดรวมก่อนตัดสินใจ" },
];

export default function WhatIsPage() {
  const schema = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: "LG Subscribe คืออะไร ดีไหม คุ้มไหม และเหมาะกับใคร",
    description: metadata.description,
    author: { "@type": "Organization", name: siteConfig.shortName },
    publisher: {
      "@type": "Organization",
      name: siteConfig.shortName,
      logo: { "@type": "ImageObject", url: `${siteConfig.url}/brand/lg-logo.svg` },
    },
    mainEntityOfPage: `${siteConfig.url}/what-is-lg-subscribe/`,
  };

  return (
    <>
      <JsonLd data={schema} />
      <article>
        <header className="page-hero">
          <div className="container-page relative z-10 grid items-center gap-10 lg:grid-cols-[1.15fr_0.85fr]">
            <div className="max-w-4xl">
              <p className="text-sm font-bold uppercase tracking-[0.18em] text-red-400">คู่มือก่อนสมัคร</p>
              <h1 className="mt-4 text-4xl font-bold leading-tight sm:text-5xl lg:text-6xl">LG Subscribe คืออะไร ดีไหม และคุ้มกับคุณหรือไม่?</h1>
              <p className="mt-6 text-lg leading-8 text-white/65">สรุปทุกประเด็นที่คนค้นหาบ่อย เพื่อช่วยให้เปรียบเทียบและอ่านสัญญาอย่างเข้าใจก่อนตัดสินใจ</p>
            </div>
            <HeroProductShowcase />
          </div>
        </header>

        <section className="section-space bg-white">
          <div className="container-page max-w-5xl">
            <div className="grid gap-5 md:grid-cols-3">
              {[
                { icon: "/images/generated/icon-monthly-payment-v1.webp", title: "ชำระรายเดือน", text: "ไม่ต้องชำระราคาสินค้าเต็มจำนวนในวันแรก" },
                { icon: "/images/generated/icon-expert-care-v1.webp", title: "มีแผนบริการ", text: "รายการและรอบดูแลแตกต่างตามกลุ่มสินค้า" },
                { icon: "/images/generated/icon-protection-v1.webp", title: "ระยะคุ้มครอง", text: "ยึดระยะที่ระบุในแบบฟอร์มคำสั่งซื้อ" },
              ].map((item) => <Card key={item.title}><CardContent className="p-6"><GeneratedIcon src={item.icon} alt="" /><h2 className="mt-4 text-lg font-bold">{item.title}</h2><p className="mt-2 text-sm leading-6 text-muted-foreground">{item.text}</p></CardContent></Card>)}
            </div>

            <div className="prose prose-neutral mt-14 max-w-none">
              <h2 className="text-3xl font-bold">รูปแบบบริการทำงานอย่างไร</h2>
              <p className="mt-5 leading-8 text-neutral-700">หลังเลือกสินค้าและแพ็กเกจ บริษัทจะตรวจสอบข้อมูล สถานะเครดิต และสถานที่ติดตั้ง เมื่อได้รับอนุมัติจึงนัดจัดส่งหรือติดตั้ง โดยสัญญาเริ่มนับเมื่อการติดตั้งแล้วเสร็จตามเงื่อนไขของ LG</p>

              <h2 className="mt-12 text-3xl font-bold">ข้อดีที่ลูกค้ามักสนใจ</h2>
              <ul className="mt-5 grid gap-3">
                {["กระจายค่าใช้จ่ายเป็นรายเดือน", "มีช่องทางบริการเมื่อเครื่องมีปัญหา", "มีรอบบำรุงรักษาสำหรับสินค้าบางประเภท", "เลือกสินค้าได้หลายกลุ่มภายในบ้าน"].map((item) => <li key={item} className="flex gap-3 leading-7 text-neutral-700"><span aria-hidden="true" className="text-red-700">✓</span>{item}</li>)}
              </ul>

              <div className="mt-12 rounded-2xl border border-amber-200 bg-amber-50 p-6">
                <div className="flex items-start gap-4">
                  <GeneratedIcon src="/images/generated/icon-document-v1.webp" alt="" className="size-12" />
                  <div>
                    <h2 className="text-xl font-bold text-amber-950">ข้อควรรู้ก่อนตัดสินใจ</h2>
                    <p className="mt-3 leading-7 text-amber-900/80">สัญญามีระยะผูกพัน บริษัทตรวจสอบเครดิตก่อนอนุมัติ และสิทธิบริการอาจหยุดเมื่อผิดนัดชำระ โปรดอ่านแบบฟอร์มคำสั่งซื้อและสัญญาฉบับเต็มก่อนลงนาม</p>
                  </div>
                </div>
              </div>

              <h2 className="mt-12 text-3xl font-bold">เหมาะกับใคร</h2>
              <p className="mt-5 leading-8 text-neutral-700">เหมาะกับผู้ที่ต้องการใช้เครื่องใช้ไฟฟ้าพรีเมียม วางแผนค่าใช้จ่ายเป็นรายเดือน และให้คุณค่ากับบริการดูแลระยะยาว หากคุณตั้งใจใช้งานระยะสั้นหรืออาจย้ายที่อยู่บ่อย ควรสอบถามข้อจำกัดและค่าใช้จ่ายล่วงหน้าเป็นพิเศษ</p>

              <h2 className="mt-12 text-3xl font-bold">คำตอบสั้นจากคำค้นยอดนิยม</h2>
              <div className="mt-6 grid gap-5">
                {questions.map((item) => <Card key={item.q}><CardContent className="p-6"><h3 className="text-lg font-bold">{item.q}</h3><p className="mt-3 leading-7 text-muted-foreground">{item.a}</p></CardContent></Card>)}
              </div>

              <div className="mt-10 flex flex-wrap gap-3">
                <Button asChild className="bg-red-600 hover:bg-red-700"><Link href="/application-guide/">ดูขั้นตอนสมัคร <span aria-hidden="true">→</span></Link></Button>
              </div>
            </div>
          </div>
        </section>
      </article>
      <ContactCta />
    </>
  );
}
