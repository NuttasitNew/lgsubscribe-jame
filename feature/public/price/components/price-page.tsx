import type { Metadata } from "next";
import Link from "next/link";
import { ContactCta } from "@/components/contact-cta";
import { GeneratedIcon } from "@/components/generated-icon";
import { JsonLd } from "@/components/json-ld";
import { ProductCard } from "@/components/product-card";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { createPageMetadata, products, siteConfig } from "@/lib/site";

export const metadata: Metadata = createPageMetadata({
  title: "LG Subscribe ราคาเท่าไร โปรโมชันรายเดือน และวิธีเทียบยอดรวม",
  description: "ตรวจราคา LG Subscribe รายเดือน วันที่อัปเดตโปรโมชัน วิธีคำนวณยอดรวมตลอดสัญญา และรายการที่ควรขอก่อนสมัคร",
  path: "/price/",
});

const priceFaqs = [
  { q: "LG Subscribe ราคาเริ่มต้นเท่าไร?", a: "ราคาแตกต่างตามสินค้า รุ่น ระยะสัญญา แพ็กเกจบริการ และโปรโมชัน ตัวเลขในเว็บไซต์นี้ใช้เพื่ออ้างอิงเบื้องต้นและต้องยืนยันในแบบฟอร์มคำสั่งซื้อ" },
  { q: "ควรดูเฉพาะยอดต่อเดือนหรือไม่?", a: "ไม่ควร ควรคูณยอดต่อเดือนด้วยจำนวนงวด แล้วตรวจค่าติดตั้งส่วนเกิน ค่าบริการที่อยู่นอกเงื่อนไข และค่าธรรมเนียมยกเลิกก่อนกำหนดด้วย" },
  { q: "ราคาในรูปโฆษณาคือราคาตลอดสัญญาหรือไม่?", a: "อาจเป็นราคาโปรโมชันเฉพาะช่วงหรือมีเงื่อนไขเพิ่มเติม ให้ขอใบเสนอราคาที่ระบุยอดของทุกช่วง จำนวนงวด และยอดรวมก่อนลงนาม" },
];

export default function PricePage() {
  const schema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: priceFaqs.map((item) => ({ "@type": "Question", name: item.q, acceptedAnswer: { "@type": "Answer", text: item.a } })),
  };

  return (
    <>
      <JsonLd data={schema} />
      <header className="page-hero">
        <div className="container-page max-w-5xl">
          <p className="text-sm font-bold uppercase tracking-[0.18em] text-red-400">Price Guide</p>
          <h1 className="mt-4 text-4xl font-bold leading-tight sm:text-5xl">LG Subscribe ราคาเท่าไร และต้องเทียบอะไรบ้าง?</h1>
          <p className="mt-5 max-w-3xl text-lg leading-8 text-white/65">รวมราคาที่ปรากฏในสื่ออ้างอิง พร้อมวิธีตรวจยอดจริงก่อนตัดสินใจ ไม่สรุปความคุ้มจากยอดต่อเดือนเพียงตัวเดียว</p>
        </div>
      </header>

      <section className="section-space">
        <div className="container-page">
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6 text-amber-950">
            <p className="font-bold">ตรวจข้อมูลล่าสุดเมื่อ {siteConfig.offerReviewedAt}</p>
            <p className="mt-2 text-sm leading-7 text-amber-950/75">โปรโมชันเปลี่ยนได้และบางภาพอาจแสดงราคาเฉพาะช่วง ให้ยึดใบเสนอราคาและแบบฟอร์มคำสั่งซื้อที่ออกให้คุณเป็นหลัก</p>
          </div>
          <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {products.map((product) => <ProductCard key={product.slug} product={product} />)}
          </div>

          <div className="mt-16 grid gap-5 md:grid-cols-3">
            {[
              { icon: "/images/generated/icon-monthly-payment-v1.webp", title: "ยอดรวมตลอดสัญญา", text: "ยอดรายเดือน × จำนวนงวด และตรวจว่าราคาเปลี่ยนตามช่วงโปรโมชันหรือไม่" },
              { icon: "/images/generated/icon-document-v1.webp", title: "ค่าใช้จ่ายอื่น", text: "อุปกรณ์ติดตั้งส่วนเกิน การย้ายเครื่อง และกรณีซ่อมนอกขอบเขตอาจมีค่าใช้จ่าย" },
              { icon: "/images/generated/icon-protection-v1.webp", title: "เงื่อนไขยกเลิก", text: "ขอตารางคำนวณค่าธรรมเนียมก่อนกำหนดสำหรับอายุสัญญาที่กำลังเลือก" },
            ].map((item) => <Card key={item.title}><CardContent className="p-7"><GeneratedIcon src={item.icon} alt="" /><h2 className="mt-5 text-xl font-bold">{item.title}</h2><p className="mt-3 leading-7 text-muted-foreground">{item.text}</p></CardContent></Card>)}
          </div>

          <div className="mt-12 rounded-2xl bg-neutral-950 p-8 text-white">
            <GeneratedIcon src="/images/generated/icon-document-v1.webp" alt="" />
            <h2 className="mt-5 text-2xl font-bold">ก่อนสมัคร ขอเอกสารที่เห็นตัวเลขครบ</h2>
            <p className="mt-3 max-w-3xl leading-8 text-white/65">ควรมีชื่อรุ่น ยอดต่อเดือนทุกช่วง จำนวนงวด ยอดรวม รายการติดตั้ง ขอบเขตบริการ และค่าธรรมเนียมยกเลิกในเอกสารเดียวกัน</p>
            <div className="mt-6 flex flex-wrap gap-3"><Button asChild className="bg-red-600 hover:bg-red-700"><Link href="/contact/">ขอราคาล่าสุด</Link></Button><Button asChild variant="outline" className="border-white/25 bg-transparent text-white hover:bg-white/10 hover:text-white"><Link href="/cancel-contract/">อ่านเรื่องยกเลิกสัญญา</Link></Button></div>
          </div>
        </div>
      </section>
      <ContactCta />
    </>
  );
}
