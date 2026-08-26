import type { Metadata } from "next";
import Link from "next/link";
import { ContactCta } from "@/components/contact-cta";
import { GeneratedIcon } from "@/components/generated-icon";
import { JsonLd } from "@/components/json-ld";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { createPageMetadata, siteConfig } from "@/lib/site";

export const metadata: Metadata = createPageMetadata({
  title: "สมัคร LG Subscribe ใช้อะไรบ้าง ขั้นตอน เอกสาร และการอนุมัติ",
  description: "คู่มือสมัคร LG Subscribe ตั้งแต่เลือกสินค้า เตรียมข้อมูล ตรวจสอบเครดิต ทำสัญญา ไปจนถึงจัดส่งและติดตั้ง",
  path: "/application-guide/",
});

const steps = [
  { icon: "/images/generated/icon-consultation-v1.webp", title: "1. เลือกสินค้าและแพ็กเกจ", text: "แจ้งรุ่นที่สนใจ งบรายเดือน และสถานที่ติดตั้งให้เจ้าหน้าที่ตรวจสอบ" },
  { icon: "/images/generated/icon-document-v1.webp", title: "2. เตรียมข้อมูลประกอบคำสั่งซื้อ", text: "เอกสารที่ใช้ขึ้นอยู่กับประเภทลูกค้าและหลักเกณฑ์ของบริษัท เจ้าหน้าที่จะแจ้งรายการล่าสุด" },
  { icon: "/images/generated/icon-protection-v1.webp", title: "3. ตรวจสอบเครดิตและข้อมูล", text: "บริษัทตรวจสอบสถานะเครดิต สถานที่ติดตั้ง/จัดส่ง และข้อมูลอื่นก่อนพิจารณาอนุมัติ" },
  { icon: "/images/generated/icon-delivery-v1.webp", title: "4. นัดจัดส่งหรือติดตั้ง", text: "เมื่อคำสั่งซื้อได้รับอนุมัติ บริษัทจะติดต่อเพื่อนัดหมายและส่งสัญญาคู่ฉบับทางอีเมล" },
];

export default function ApplicationGuidePage() {
  const schema = {
    "@context": "https://schema.org",
    "@type": "HowTo",
    name: "วิธีสมัคร LG Subscribe",
    description: metadata.description,
    totalTime: "P7D",
    step: steps.map((step, index) => ({ "@type": "HowToStep", position: index + 1, name: step.title, text: step.text })),
  };

  return (
    <>
      <JsonLd data={schema} />
      <header className="page-hero">
        <div className="container-page max-w-5xl">
          <p className="text-sm font-bold uppercase tracking-[0.18em] text-red-400">Application Guide</p>
          <h1 className="mt-4 text-4xl font-bold sm:text-5xl">สมัคร LG Subscribe ใช้อะไรบ้าง?</h1>
          <p className="mt-5 max-w-3xl text-lg leading-8 text-white/65">ขั้นตอนที่ควรรู้ก่อนส่งข้อมูล พร้อมคำตอบเรื่องบัตรเครดิต การตรวจเครดิต และการอนุมัติ</p>
        </div>
      </header>

      <section className="section-space">
        <div className="container-page max-w-5xl">
          <div className="grid gap-5 md:grid-cols-2">
            {steps.map((step) => <Card key={step.title}><CardContent className="p-7"><GeneratedIcon src={step.icon} alt="" /><h2 className="mt-5 text-xl font-bold">{step.title}</h2><p className="mt-3 leading-7 text-muted-foreground">{step.text}</p></CardContent></Card>)}
          </div>

          <div className="mt-14 grid gap-8 lg:grid-cols-2">
            <div className="rounded-2xl bg-white p-7 shadow-sm">
              <h2 className="text-2xl font-bold">ไม่มีบัตรเครดิต สมัครได้ไหม?</h2>
              <p className="mt-4 leading-8 text-neutral-700">รูปแบบชำระไม่ได้จำกัดว่าต้องกันวงเงินบัตรเครดิตเหมือนการผ่อนบัตรทั่วไป แต่บริษัทมีขั้นตอนตรวจสอบเครดิตและข้อมูลก่อนอนุมัติ ช่องทางชำระจริงให้ยืนยันกับเจ้าหน้าที่ตามแพ็กเกจล่าสุด</p>
            </div>
            <div className="rounded-2xl bg-white p-7 shadow-sm">
              <h2 className="text-2xl font-bold">LG Subscribe ขึ้นเครดิตบูโรไหม?</h2>
              <p className="mt-4 leading-8 text-neutral-700">เงื่อนไขทางการระบุว่าบริษัทตรวจสอบสถานะเครดิตก่อนอนุมัติ แต่ขอบเขตการรายงานหรือผลต่อเครดิตอาจขึ้นอยู่กับสัญญาและผู้ให้บริการชำระเงิน ควรถามเจ้าหน้าที่และอ่านเอกสารยินยอมโดยตรง</p>
            </div>
          </div>

          <div className="mt-12 rounded-2xl border border-red-100 bg-red-50 p-7">
            <h2 className="text-2xl font-bold text-red-950">เช็กลิสต์ก่อนลงนาม</h2>
            <ul className="mt-5 grid gap-3">
              {["ยอดชำระรายเดือนและยอดรวมตลอดสัญญา", "ระยะสัญญาและวันที่เริ่มนับ", "ขอบเขตรับประกันและรอบบำรุงรักษา", "ช่องทางชำระเงินและเงื่อนไขผิดนัด", "เงื่อนไขย้ายสถานที่ติดตั้งหรือย้ายบ้าน"].map((item) => <li key={item} className="flex gap-3 text-red-950/80"><span aria-hidden="true">✓</span>{item}</li>)}
            </ul>
          </div>

          <div className="mt-10 flex flex-wrap gap-3">
            <Button asChild className="bg-red-600 hover:bg-red-700"><a href={siteConfig.lineUrl} target="_blank" rel="noreferrer">สอบถามรายการเอกสารล่าสุด</a></Button>
            <Button asChild variant="outline"><Link href="/terms/">อ่านสรุปเงื่อนไขสัญญา</Link></Button>
          </div>
        </div>
      </section>
      <ContactCta />
    </>
  );
}
