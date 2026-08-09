import type { Metadata } from "next";
import Link from "next/link";
import { ContactCta } from "@/components/contact-cta";
import { GeneratedIcon } from "@/components/generated-icon";
import { JsonLd } from "@/components/json-ld";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { createPageMetadata } from "@/lib/site";

export const metadata: Metadata = createPageMetadata({
  title: "คำถาม LG Subscribe ดีไหม ไม่มีบัตรเครดิต ยกเลิก และเครดิตบูโร",
  description: "รวมคำถามที่คนค้นหาเกี่ยวกับ LG Subscribe: คืออะไร ดีไหม คุ้มไหม สัญญากี่ปี ไม่มีบัตรเครดิต สมัครอย่างไร เครดิตบูโร ยกเลิก ครบสัญญา ซ่อม และย้ายบ้าน",
  path: "/faq/",
});

const allFaqs = [
  { q: "LG Subscribe คืออะไร?", a: "บริการเช่าซื้อเครื่องใช้ไฟฟ้า LG แบบชำระรายเดือน พร้อมสิทธิรับประกันและบริการซ่อมบำรุงตามรุ่น แพ็กเกจ และแบบฟอร์มคำสั่งซื้อ" },
  { q: "LG Subscribe ดีไหม และคุ้มไหม?", a: "เหมาะกับผู้ที่ต้องการกระจายค่าใช้จ่ายและให้ความสำคัญกับบริการดูแล ความคุ้มควรพิจารณาจากยอดชำระรวม ระยะสัญญา รายการบริการ และค่าธรรมเนียมยกเลิกเทียบกับทางเลือกอื่น" },
  { q: "LG Subscribe ราคาเริ่มต้นเท่าไร?", a: "ราคาเริ่มต้นแตกต่างตามสินค้า รุ่น ระยะสัญญา และโปรโมชัน ควรขอใบเสนอราคาหรือแบบฟอร์มคำสั่งซื้อที่ระบุยอดต่อเดือนและยอดรวมก่อนสมัคร" },
  { q: "ไม่มีบัตรเครดิต สมัคร LG Subscribe ได้ไหม?", a: "บริการไม่ได้ใช้รูปแบบกันวงเงินบัตรเครดิตเหมือนการผ่อนบัตรทั่วไปทุกกรณี แต่บริษัทตรวจสอบเครดิตและข้อมูลก่อนอนุมัติ ช่องทางชำระล่าสุดให้ยืนยันกับเจ้าหน้าที่" },
  { q: "LG Subscribe ขึ้นเครดิตบูโรไหม?", a: "เงื่อนไขทางการระบุว่ามีการตรวจสอบสถานะเครดิตก่อนอนุมัติ แต่ขอบเขตการรายงานหรือผลต่อเครดิตให้ยึดเอกสารยินยอมและสัญญาของผู้สมัครแต่ละราย" },
  { q: "สมัคร LG Subscribe ใช้เอกสารอะไร?", a: "รายการเอกสารขึ้นอยู่กับประเภทลูกค้าและเกณฑ์ของบริษัท เจ้าหน้าที่จะเป็นผู้แจ้งรายการล่าสุดก่อนส่งคำสั่งซื้อ ไม่ควรส่งเอกสารสำคัญผ่านช่องทางที่ยังไม่ได้ตรวจสอบ" },
  { q: "LG Subscribe สัญญากี่ปี?", a: "ระยะสัญญาแตกต่างกันตามกลุ่มสินค้าและแพ็กเกจ ให้ยึดจำนวนงวดและระยะเวลาที่ระบุในแบบฟอร์มคำสั่งซื้อ" },
  { q: "ยกเลิกสัญญา LG Subscribe ก่อนกำหนดได้ไหม?", a: "สัญญารองรับการบอกเลิกก่อนกำหนดตามเงื่อนไข แต่มีค่าธรรมเนียมหรือค่าปรับ ต้องคืนสินค้า และชำระยอดที่ถึงกำหนด ควรขอใบคำนวณจากบริษัทก่อนตัดสินใจ" },
  { q: "LG Subscribe ครบสัญญาแล้วต้องคืนเครื่องไหม?", a: "สิทธิเมื่อครบกำหนดขึ้นอยู่กับประเภทสัญญาและแบบฟอร์มคำสั่งซื้อ กรุณาตรวจหัวข้อกรรมสิทธิ์และขั้นตอนหลังครบสัญญาในเอกสารของรุ่นที่สมัคร" },
  { q: "สินค้าเสีย ต้องแจ้งซ่อมอย่างไร?", a: "ติดต่อศูนย์บริการหรือช่องทางที่ระบุในสัญญา พร้อมแจ้งรุ่น หมายเลขเครื่อง และอาการ บริการที่ไม่เสียค่าใช้จ่ายขึ้นอยู่กับสาเหตุและขอบเขตความคุ้มครอง" },
  { q: "บริการบำรุงรักษารวมอะไรบ้าง?", a: "แตกต่างตามประเภทสินค้า เช่น เปลี่ยนไส้กรอง ทำความสะอาด ตรวจสอบประสิทธิภาพ หรือจัดส่งชิ้นส่วนตามรอบ โปรดตรวจว่ารุ่นของคุณเป็น Regular Visit หรือ Self Service" },
  { q: "ย้ายบ้านหรือย้ายเครื่องระหว่างสัญญาได้ไหม?", a: "สัญญากำหนดสถานที่ติดตั้งไว้ การย้ายอาจกระทบสิทธิบริการหรือความรับผิดชอบต่อความเสียหาย ควรแจ้งบริษัทและขออนุมัติก่อนย้าย" },
  { q: "LG Subscribe เชื่อถือได้ไหม หรือเป็นมิจฉาชีพ?", a: "ตัวบริการ LG Subscribe มีข้อมูลและเงื่อนไขบนเว็บไซต์ LG Thailand แต่ผู้ขายหรือโฆษณาแต่ละรายต้องตรวจสอบแยกกัน ควรเช็กโดเมน ข้อมูลบริษัท บัญชีรับเงิน และเอกสารสัญญาก่อนส่งข้อมูลหรือชำระเงิน" },
  { q: "ผิดนัดชำระจะเกิดอะไรขึ้น?", a: "เงื่อนไข LG ระบุว่าการผิดนัด 2 งวดติดต่อกันอาจทำให้ยุติบริการซ่อมบำรุงและติดตามสินค้าคืน รวมถึงค่าใช้จ่ายที่เกี่ยวข้อง ควรติดต่อบริษัททันทีเมื่อคาดว่าจะชำระล่าช้า" },
];

export default function FaqPage() {
  const schema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: allFaqs.map((faq) => ({ "@type": "Question", name: faq.q, acceptedAnswer: { "@type": "Answer", text: faq.a } })),
  };

  return (
    <>
      <JsonLd data={schema} />
      <header className="page-hero">
        <div className="container-page max-w-5xl text-center">
          <GeneratedIcon src="/images/generated/icon-consultation-v1.webp" alt="" className="mx-auto" />
          <h1 className="mt-5 text-4xl font-bold sm:text-5xl">คำถามที่คนค้นหาเกี่ยวกับ LG Subscribe</h1>
          <p className="mx-auto mt-5 max-w-3xl text-lg leading-8 text-white/65">คำตอบสั้น ชัด และระมัดระวังเรื่องเงื่อนไข เพื่อให้คุณตัดสินใจจากข้อมูลจริงก่อนลงนาม</p>
        </div>
      </header>

      <section className="section-space">
        <div className="container-page max-w-4xl">
          <Accordion type="single" collapsible className="rounded-2xl border bg-white px-6 sm:px-8">
            {allFaqs.map((faq, index) => (
              <AccordionItem key={faq.q} value={`question-${index}`}>
                <AccordionTrigger className="text-left text-base font-bold leading-7 hover:text-red-700 sm:text-lg">{faq.q}</AccordionTrigger>
                <AccordionContent className="text-sm leading-8 text-muted-foreground sm:text-base">{faq.a}</AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>

          <div className="mt-10 rounded-2xl border border-red-100 bg-red-50 p-7">
            <h2 className="text-2xl font-bold text-red-950">ต้องการอ่านเอกสารทางการ?</h2>
            <p className="mt-3 leading-7 text-red-950/75">คำตอบในหน้านี้เป็นสรุปเพื่อการตัดสินใจ ให้ยึดเอกสารที่บริษัทออกให้และเงื่อนไขฉบับเต็มของ LG เป็นหลัก</p>
            <div className="mt-5 flex flex-wrap gap-3">
              <Button asChild variant="outline" className="border-red-200 bg-white text-red-800"><a href="https://www.lg.com/th/terms-and-conditions-of-subscription/" target="_blank" rel="noreferrer">เงื่อนไขจาก LG Thailand <span aria-hidden="true">↗</span></a></Button>
              <Button asChild variant="link" className="text-red-800"><Link href="/terms/">อ่านฉบับสรุป</Link></Button>
            </div>
          </div>
        </div>
      </section>
      <ContactCta />
    </>
  );
}
