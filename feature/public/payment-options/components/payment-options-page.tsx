import type { Metadata } from "next";
import Link from "next/link";
import { ContactCta } from "@/components/contact-cta";
import { GeneratedIcon } from "@/components/generated-icon";
import { JsonLd } from "@/components/json-ld";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { createPageMetadata } from "@/lib/site";

export const metadata: Metadata = createPageMetadata({
  title: "LG Subscribe ไม่มีบัตรเครดิต สมัครได้ไหม ช่องทางชำระเงิน",
  description: "สรุปช่องทางชำระ LG Subscribe ทั้งบัตรเครดิต บัตรเดบิต และหักบัญชีอัตโนมัติ พร้อมข้อควรรู้เรื่องการตรวจข้อมูลก่อนอนุมัติ",
  path: "/payment-options/",
});

const faqs = [
  { q: "ไม่มีบัตรเครดิต สมัคร LG Subscribe ได้ไหม?", a: "LG Thailand ระบุช่องทางบัตรเดบิตและการหักบัญชีอัตโนมัติไว้ด้วย แต่ธนาคารที่รองรับ เอกสาร และผลอนุมัติขึ้นอยู่กับเงื่อนไขปัจจุบัน" },
  { q: "ใช้บัตรเดบิตได้ทุกธนาคารหรือไม่?", a: "ไม่ควรถือว่าได้ทุกธนาคาร ควรตรวจรายชื่อธนาคารและประเภทบัตรกับเจ้าหน้าที่ก่อนส่งคำสั่งซื้อ" },
  { q: "หักบัญชีอัตโนมัติต้องตรวจเครดิตไหม?", a: "ช่องทางชำระไม่ได้ยกเว้นขั้นตอนพิจารณา บริษัทอาจตรวจข้อมูลทางการเงิน เครดิต และสถานที่ติดตั้งก่อนอนุมัติ" },
];

export default function PaymentOptionsPage() {
  const schema = { "@context": "https://schema.org", "@type": "FAQPage", mainEntity: faqs.map((item) => ({ "@type": "Question", name: item.q, acceptedAnswer: { "@type": "Answer", text: item.a } })) };
  return (
    <>
      <JsonLd data={schema} />
      <header className="page-hero">
        <div className="container-page max-w-5xl">
          <p className="text-sm font-bold uppercase tracking-[0.18em] text-red-400">Payment Options</p>
          <h1 className="mt-4 text-4xl font-bold leading-tight sm:text-5xl">ไม่มีบัตรเครดิต สมัคร LG Subscribe ได้ไหม?</h1>
          <p className="mt-5 max-w-3xl text-lg leading-8 text-white/65">ได้ในบางช่องทางตามเงื่อนไขปัจจุบัน แต่ “ไม่ใช้บัตรเครดิต” ไม่ได้หมายความว่าอนุมัติอัตโนมัติ</p>
        </div>
      </header>
      <section className="section-space">
        <div className="container-page max-w-6xl">
          <div className="grid gap-5 md:grid-cols-3">
            {[
              { icon: "/images/generated/icon-monthly-payment-v1.webp", title: "บัตรเครดิต", text: "ตรวจประเภทบัตร รอบตัดยอด และชื่อผู้ถือบัตรให้ตรงตามเกณฑ์" },
              { icon: "/images/generated/icon-protection-v1.webp", title: "บัตรเดบิต", text: "มีระบุเป็นทางเลือก แต่ต้องตรวจธนาคารและบัตรที่รองรับล่าสุด" },
              { icon: "/images/generated/icon-document-v1.webp", title: "หักบัญชีอัตโนมัติ", text: "อาจต้องใช้เอกสารบัญชีและผ่านการตรวจข้อมูลทางการเงินเพิ่มเติม" },
            ].map((item) => <Card key={item.title}><CardContent className="p-7"><GeneratedIcon src={item.icon} alt="" /><h2 className="mt-5 text-xl font-bold">{item.title}</h2><p className="mt-3 leading-7 text-muted-foreground">{item.text}</p></CardContent></Card>)}
          </div>

          <div className="mt-14 grid gap-8 lg:grid-cols-[1.2fr_0.8fr]">
            <div className="rounded-2xl bg-white p-8 shadow-sm">
              <h2 className="text-3xl font-bold">สิ่งที่ควรถามก่อนเลือกช่องทางชำระ</h2>
              <ul className="mt-6 grid gap-4 leading-7 text-neutral-700">
                <li>1. ธนาคารและประเภทบัตรใดรองรับในวันที่สมัคร</li>
                <li>2. ต้องใช้เอกสารรายได้หรือ Statement กี่เดือน</li>
                <li>3. วันตัดยอดและวิธีแก้ไขเมื่อหักเงินไม่สำเร็จ</li>
                <li>4. มีค่าธรรมเนียมหรือเงื่อนไขเปลี่ยนช่องทางระหว่างสัญญาหรือไม่</li>
              </ul>
            </div>
            <div className="rounded-2xl border border-red-100 bg-red-50 p-8">
              <GeneratedIcon src="/images/generated/icon-protection-v1.webp" alt="" />
              <h2 className="mt-5 text-2xl font-bold text-red-950">ส่งเอกสารอย่างปลอดภัย</h2>
              <p className="mt-3 leading-8 text-red-950/75">ตรวจชื่อผู้ติดต่อ โดเมน และช่องทางรับเอกสารก่อนส่งบัตรประชาชนหรือข้อมูลบัญชี อย่าส่งรหัส OTP ให้ผู้ขาย</p>
              <Button asChild variant="link" className="mt-5 h-auto p-0 text-red-800"><Link href="/authorized/">วิธีตรวจสอบผู้ขาย</Link></Button>
            </div>
          </div>

          <div className="mt-12 flex flex-wrap gap-3">
            <Button asChild className="bg-red-600 hover:bg-red-700"><Link href="/application-guide/">ดูเอกสารและขั้นตอนสมัคร</Link></Button>
            <Button asChild variant="outline"><a href="https://www.lg.com/th/subscribe/promotions/" target="_blank" rel="noreferrer">ตรวจ FAQ จาก LG Thailand <span aria-hidden="true">↗</span></a></Button>
          </div>
        </div>
      </section>
      <ContactCta />
    </>
  );
}
