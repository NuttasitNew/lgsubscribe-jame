import type { Metadata } from "next";
import Link from "next/link";
import { ContactCta } from "@/components/contact-cta";
import { GeneratedIcon } from "@/components/generated-icon";
import { JsonLd } from "@/components/json-ld";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { createPageMetadata } from "@/lib/site";

export const metadata: Metadata = createPageMetadata({
  title: "ยกเลิกสัญญา LG Subscribe ได้ไหม ค่าธรรมเนียมและคืนสินค้า",
  description: "คำตอบเรื่องยกเลิก LG Subscribe ก่อนกำหนด ขั้นตอนขอใบคำนวณ ค่าธรรมเนียม ยอดค้าง การคืนสินค้า และสิ่งที่ควรทำก่อนยกเลิก",
  path: "/cancel-contract/",
});

const faqs = [
  { q: "LG Subscribe ยกเลิกได้ไหม?", a: "สามารถบอกเลิกก่อนกำหนดได้ตามเงื่อนไข แต่โดยทั่วไปต้องคืนสินค้า ชำระยอดที่ถึงกำหนด และรับผิดชอบค่าธรรมเนียมหรือค่าใช้จ่ายตามสัญญา" },
  { q: "ยกเลิก LG Subscribe ฟรีไหม?", a: "ไม่ควรสรุปว่ายกเลิกฟรี เงื่อนไขฉบับเต็มมีวิธีคำนวณแตกต่างตามอายุสัญญาและช่วงเวลาที่ยกเลิก จึงควรขอใบคำนวณเป็นลายลักษณ์อักษร" },
  { q: "ต้องคืนสินค้าอย่างไร?", a: "ให้บริษัทแจ้งขั้นตอนนัดรับ การตรวจสภาพ และรายการอุปกรณ์ที่ต้องคืน ควรถ่ายภาพสภาพสินค้าและเก็บหลักฐานการส่งมอบ" },
];

export default function CancelContractPage() {
  const schema = { "@context": "https://schema.org", "@type": "FAQPage", mainEntity: faqs.map((item) => ({ "@type": "Question", name: item.q, acceptedAnswer: { "@type": "Answer", text: item.a } })) };
  return (
    <>
      <JsonLd data={schema} />
      <header className="page-hero">
        <div className="container-page max-w-5xl">
          <p className="text-sm font-bold uppercase tracking-[0.18em] text-red-400">Contract Cancellation</p>
          <h1 className="mt-4 text-4xl font-bold leading-tight sm:text-5xl">ยกเลิกสัญญา LG Subscribe ได้ไหม?</h1>
          <p className="mt-5 max-w-3xl text-lg leading-8 text-white/65">ยกเลิกได้ตามเงื่อนไข แต่มีผลด้านค่าใช้จ่ายและการคืนสินค้า จึงควรขอตัวเลขจริงก่อนยืนยันการยกเลิก</p>
        </div>
      </header>
      <section className="section-space">
        <div className="container-page max-w-6xl">
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-7">
            <div className="flex items-start gap-4"><GeneratedIcon src="/images/generated/icon-document-v1.webp" alt="" className="size-12" /><div><h2 className="text-2xl font-bold text-amber-950">อย่าคำนวณจากยอดรายเดือนอย่างเดียว</h2><p className="mt-3 leading-8 text-amber-950/75">สูตรในเงื่อนไข LG แบ่งตามอายุสัญญาและเดือนที่ยกเลิก และอาจรวมยอดค้าง ดอกเบี้ย ค่าติดตาม หรือค่าซ่อมตามกรณี</p></div></div>
          </div>

          <div className="mt-10 grid gap-5 md:grid-cols-3">
            {[
              { icon: "/images/generated/icon-consultation-v1.webp", title: "1. แจ้งบริษัท", text: "ขอเลขที่คำร้อง วันที่มีผล และช่องทางติดตามผลอย่างเป็นทางการ" },
              { icon: "/images/generated/icon-monthly-payment-v1.webp", title: "2. ขอใบคำนวณ", text: "ขอแยกยอดค้าง ค่าธรรมเนียม และค่าใช้จ่ายอื่นเป็นลายลักษณ์อักษร" },
              { icon: "/images/generated/icon-delivery-v1.webp", title: "3. นัดคืนสินค้า", text: "ตรวจรายการอุปกรณ์ สภาพสินค้า วันรับคืน และหลักฐานปิดสัญญา" },
            ].map((item) => <Card key={item.title}><CardContent className="p-7"><GeneratedIcon src={item.icon} alt="" /><h2 className="mt-5 text-xl font-bold">{item.title}</h2><p className="mt-3 leading-7 text-muted-foreground">{item.text}</p></CardContent></Card>)}
          </div>

          <div className="mt-14 rounded-2xl bg-white p-8 shadow-sm">
            <h2 className="text-3xl font-bold">เช็กลิสต์หลักฐานที่ควรเก็บ</h2>
            <ul className="mt-6 grid gap-3 leading-7 text-neutral-700 md:grid-cols-2">
              <li>• สัญญาและแบบฟอร์มคำสั่งซื้อฉบับที่ลงนาม</li><li>• ใบคำนวณยอดปิดสัญญา</li><li>• หลักฐานชำระเงินทุกยอด</li><li>• ภาพสินค้าและอุปกรณ์ก่อนส่งคืน</li><li>• ใบรับสินค้าและหนังสือยืนยันปิดสัญญา</li><li>• ชื่อเจ้าหน้าที่ วันเวลา และเลขที่คำร้อง</li>
            </ul>
          </div>

          <div className="mt-12 flex flex-wrap gap-3">
            <Button asChild className="bg-red-600 hover:bg-red-700"><Link href="/contact/">ติดต่อสอบถามเรื่องสัญญา</Link></Button>
            <Button asChild variant="outline"><a href="https://www.lg.com/th/terms-and-conditions-of-subscription/" target="_blank" rel="noreferrer">อ่านเงื่อนไขฉบับเต็ม <span aria-hidden="true">↗</span></a></Button>
            <Button asChild variant="ghost"><Link href="/terms/">ดูสรุปเงื่อนไขทั้งหมด</Link></Button>
          </div>
        </div>
      </section>
      <ContactCta />
    </>
  );
}
