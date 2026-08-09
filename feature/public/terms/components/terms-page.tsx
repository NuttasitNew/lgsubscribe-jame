import type { Metadata } from "next";
import Link from "next/link";
import { ContactCta } from "@/components/contact-cta";
import { GeneratedIcon } from "@/components/generated-icon";
import { JsonLd } from "@/components/json-ld";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { createPageMetadata } from "@/lib/site";

export const metadata: Metadata = createPageMetadata({
  title: "เงื่อนไข LG Subscribe สัญญากี่ปี ยกเลิกได้ไหม และครบสัญญา",
  description: "สรุปเงื่อนไข LG Subscribe ที่คนค้นหาบ่อย: ระยะสัญญา การตรวจเครดิต ผิดนัด ยกเลิกก่อนกำหนด คืนสินค้า ย้ายบ้าน และบริการหลังครบสัญญา",
  path: "/terms/",
});

const topics = [
  { icon: "/images/generated/icon-document-v1.webp", title: "การอนุมัติ", text: "บริษัทมีสิทธิพิจารณาคำสั่งซื้อ และตรวจสอบสถานะเครดิต สถานที่ติดตั้ง/จัดส่ง และข้อมูลของลูกค้าก่อนอนุมัติ" },
  { icon: "/images/generated/icon-monthly-payment-v1.webp", title: "ระยะสัญญา", text: "ระยะเวลาแตกต่างตามสินค้าและแพ็กเกจ โดยสัญญาเริ่มนับเมื่อจัดส่งหรือติดตั้งแล้วเสร็จ" },
  { icon: "/images/generated/icon-protection-v1.webp", title: "การผิดนัดชำระ", text: "เงื่อนไข LG ระบุว่าการผิดนัด 2 งวดติดต่อกันอาจทำให้บริการซ่อมบำรุงสิ้นสุดและมีการติดตามสินค้าคืน" },
  { icon: "/images/generated/icon-delivery-v1.webp", title: "ยกเลิกก่อนกำหนด", text: "สามารถเกิดขึ้นได้ตามเงื่อนไข แต่มีค่าธรรมเนียมหรือค่าปรับและต้องคืนสินค้า โปรดขอตารางคำนวณก่อนตัดสินใจ" },
];

const contractFaqs = [
  { q: "LG Subscribe สัญญากี่ปี?", a: "ไม่มีระยะเดียวสำหรับทุกสินค้า ระยะสัญญาและจำนวนงวดให้ยึดแบบฟอร์มคำสั่งซื้อของรุ่นและแพ็กเกจที่เลือก" },
  { q: "ยกเลิกสัญญา LG Subscribe ได้ไหม?", a: "สัญญารองรับการบอกเลิกก่อนกำหนดตามเงื่อนไข แต่มีค่าธรรมเนียมหรือค่าปรับ ลูกค้าต้องคืนสินค้าและชำระยอดที่ถึงกำหนด โปรดขอใบคำนวณจากบริษัทก่อนดำเนินการ" },
  { q: "ครบสัญญาแล้วต้องทำอะไร?", a: "สิทธิและการดำเนินการเมื่อครบสัญญาขึ้นอยู่กับประเภทสัญญาและแบบฟอร์มคำสั่งซื้อ ส่วนบริการซ่อมบำรุงที่หมดระยะแล้วต้องทำสัญญาบริการใหม่หากต้องการต่อ" },
  { q: "ย้ายบ้านหรือย้ายเครื่องได้ไหม?", a: "สัญญากำหนดสถานที่ติดตั้งไว้ การย้ายอาจกระทบสิทธิบริการ โดยเฉพาะเมื่อเกิดความเสียหายหรือย้ายออกนอกพื้นที่ให้บริการ จึงควรแจ้งบริษัทก่อนย้าย" },
];

export default function TermsPage() {
  const schema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: contractFaqs.map((item) => ({ "@type": "Question", name: item.q, acceptedAnswer: { "@type": "Answer", text: item.a } })),
  };

  return (
    <>
      <JsonLd data={schema} />
      <header className="page-hero">
        <div className="container-page max-w-5xl">
          <p className="text-sm font-bold uppercase tracking-[0.18em] text-red-400">Contract Guide</p>
          <h1 className="mt-4 text-4xl font-bold leading-tight sm:text-5xl">เงื่อนไข LG Subscribe สัญญากี่ปี และยกเลิกได้ไหม?</h1>
          <p className="mt-5 max-w-3xl text-lg leading-8 text-white/65">สรุปเป็นภาษาง่ายจากเงื่อนไขของ LG เพื่อช่วยให้รู้ว่าต้องถามอะไร ก่อนลงนามในสัญญาจริง</p>
        </div>
      </header>

      <section className="section-space">
        <div className="container-page max-w-6xl">
          <div className="grid gap-5 md:grid-cols-2">
            {topics.map((topic) => <Card key={topic.title}><CardContent className="p-7"><GeneratedIcon src={topic.icon} alt="" /><h2 className="mt-5 text-xl font-bold">{topic.title}</h2><p className="mt-3 leading-7 text-muted-foreground">{topic.text}</p></CardContent></Card>)}
          </div>

          <div className="mt-14 rounded-2xl border border-amber-200 bg-amber-50 p-7">
            <div className="flex items-start gap-4">
              <GeneratedIcon src="/images/generated/icon-document-v1.webp" alt="" className="size-12" />
              <div>
                <h2 className="text-2xl font-bold text-amber-950">หน้านี้เป็นคำอธิบาย ไม่ใช่ตัวสัญญา</h2>
                <p className="mt-3 leading-8 text-amber-950/75">ราคาหรือเงื่อนไขสามารถเปลี่ยนแปลงได้ และแบบฟอร์มคำสั่งซื้อเป็นส่วนหนึ่งของสัญญา ให้ยึดเอกสารที่ออกในวันที่สมัครเป็นหลัก</p>
                <Button asChild variant="link" className="mt-4 h-auto p-0 text-amber-900">
                  <a href="https://www.lg.com/th/terms-and-conditions-of-subscription/" target="_blank" rel="noreferrer">
                    เปิดเงื่อนไขฉบับเต็มจาก LG Thailand
                    <span aria-hidden="true">↗</span>
                  </a>
                </Button>
              </div>
            </div>
          </div>

          <div className="mt-14 grid gap-6">
            <h2 className="text-3xl font-bold">คำถามที่ค้นหาบ่อยเกี่ยวกับสัญญา</h2>
            {contractFaqs.map((item) => <Card key={item.q}><CardContent className="p-7"><h3 className="text-xl font-bold">{item.q}</h3><p className="mt-3 leading-8 text-muted-foreground">{item.a}</p></CardContent></Card>)}
          </div>

          <div className="mt-12 rounded-2xl bg-neutral-950 p-8 text-white">
            <h2 className="text-2xl font-bold">ก่อนลงนาม ควรขอข้อมูล 5 รายการ</h2>
            <ol className="mt-5 grid gap-3 text-white/70 md:grid-cols-2">
              <li>1. จำนวนงวดและยอดชำระรวม</li>
              <li>2. ตารางค่าธรรมเนียมยกเลิก</li>
              <li>3. รายการบริการและรอบบำรุงรักษา</li>
              <li>4. เงื่อนไขผิดนัดและการคืนสินค้า</li>
              <li>5. สิทธิเมื่อครบกำหนดสัญญา</li>
            </ol>
            <Button asChild className="mt-7 bg-red-600 hover:bg-red-700"><Link href="/contact/">สอบถามเจ้าหน้าที่</Link></Button>
          </div>
        </div>
      </section>
      <ContactCta />
    </>
  );
}
