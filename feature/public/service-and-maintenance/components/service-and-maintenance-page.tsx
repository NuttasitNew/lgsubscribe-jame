import type { Metadata } from "next";
import Link from "next/link";
import { ContactCta } from "@/components/contact-cta";
import { GeneratedIcon } from "@/components/generated-icon";
import { JsonLd } from "@/components/json-ld";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { createPageMetadata } from "@/lib/site";

export const metadata: Metadata = createPageMetadata({
  title: "บริการซ่อมและบำรุงรักษา LG Subscribe ดูแลอะไรบ้าง",
  description: "สรุปบริการ LG Subscribe สำหรับทีวี ตู้เย็น เครื่องซักผ้า เครื่องกรองน้ำ แอร์ เครื่องฟอกอากาศ และเครื่องดูดฝุ่น พร้อมข้อควรรู้",
  path: "/service-and-maintenance/",
});

const serviceGroups = [
  { icon: "/images/products/official/puricare-wd516an-aslplmt.jpg", title: "เครื่องกรองน้ำ", text: "การเปลี่ยนไส้กรอง ทำความสะอาด และตรวจสอบการทำงานตามรอบของแพ็กเกจ" },
  { icon: "/images/generated/icon-expert-care-v1.webp", title: "เครื่องปรับอากาศ", text: "ตรวจสอบประสิทธิภาพ ทำความสะอาด และเปลี่ยนไส้กรองตามรอบบริการ" },
  { icon: "/images/generated/icon-expert-care-v1.webp", title: "เครื่องฟอกอากาศ", text: "เปลี่ยนไส้กรอง ทำความสะอาดภายใน/ภายนอก และตรวจสอบเซ็นเซอร์ฝุ่น" },
  { icon: "/images/products/official/washer-fv1413s4m.jpg", title: "เครื่องซักผ้าและอบผ้า", text: "รายการดูแลขึ้นอยู่กับรุ่น แพ็กเกจ และตัวเลือก Regular Visit หรือ Self Service" },
  { icon: "/images/generated/icon-expert-care-v1.webp", title: "ตู้เย็น", text: "บริการตรวจเช็กหรือดูแลตามรายการในแบบฟอร์มคำสั่งซื้อของรุ่นนั้น" },
  { icon: "/images/generated/icon-expert-care-v1.webp", title: "ทีวีและเครื่องใช้ไฟฟ้าอื่น", text: "การรับประกันและซ่อมบำรุงเป็นไปตามระยะและข้อยกเว้นที่ระบุในสัญญา" },
];

export default function ServicePage() {
  const schema = {
    "@context": "https://schema.org",
    "@type": "Service",
    name: "บริการซ่อมและบำรุงรักษา LG Subscribe",
    description: metadata.description,
    provider: { "@type": "Organization", name: "LG Subscribe" },
    areaServed: { "@type": "Country", name: "Thailand" },
  };

  return (
    <>
      <JsonLd data={schema} />
      <header className="page-hero">
        <div className="container-page max-w-5xl">
          <GeneratedIcon src="/images/generated/icon-expert-care-v1.webp" alt="" />
          <h1 className="mt-5 text-4xl font-bold sm:text-5xl">LG Subscribe ซ่อมและบำรุงรักษาอะไรบ้าง?</h1>
          <p className="mt-5 max-w-3xl text-lg leading-8 text-white/65">บริการไม่ได้เหมือนกันทุกสินค้า หน้าเดียวนี้ช่วยให้รู้ว่าจะถามอะไรและตรวจรายการใดในสัญญา</p>
        </div>
      </header>

      <section className="section-space">
        <div className="container-page max-w-6xl">
          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {serviceGroups.map((group) => <Card key={group.title}><CardContent className="p-7"><GeneratedIcon src={group.icon} alt="" fit={group.icon.includes("/products/official/") ? "contain" : "cover"} /><h2 className="mt-5 text-xl font-bold">{group.title}</h2><p className="mt-3 text-sm leading-7 text-muted-foreground">{group.text}</p></CardContent></Card>)}
          </div>

          <div className="mt-14 grid gap-8 lg:grid-cols-2">
            <div className="rounded-2xl bg-white p-8 shadow-sm">
              <h2 className="text-2xl font-bold">Regular Visit กับ Self Service ต่างกันอย่างไร?</h2>
              <p className="mt-4 leading-8 text-neutral-700">Regular Visit คือการดูแลโดยผู้เชี่ยวชาญตามรอบ ส่วน Self Service คือบริการที่ลูกค้าดำเนินการบางส่วนเองและอาจได้รับอะไหล่หรือไส้กรองทางไปรษณีย์ ตัวเลือกที่ได้รับจริงให้ดูในแบบฟอร์มคำสั่งซื้อ</p>
            </div>
            <div className="rounded-2xl bg-white p-8 shadow-sm">
              <h2 className="text-2xl font-bold">กรณีใดอาจมีค่าใช้จ่ายเพิ่ม?</h2>
              <p className="mt-4 leading-8 text-neutral-700">การใช้งานไม่เหมาะสม ใช้ชิ้นส่วนที่ไม่ได้รับอนุญาต ปฏิเสธหรือเลื่อนบำรุงรักษา หรือย้ายสินค้าแล้วเกิดความเสียหาย อาจกระทบสิทธิหรือมีค่าใช้จ่ายเพิ่มเติมตามเงื่อนไข</p>
            </div>
          </div>

          <div className="mt-12 flex items-start gap-4 rounded-2xl border border-amber-200 bg-amber-50 p-7">
            <GeneratedIcon src="/images/generated/icon-document-v1.webp" alt="" className="size-12" />
            <div>
              <h2 className="text-xl font-bold text-amber-950">ตรวจรายการบริการของรุ่นก่อนสมัคร</h2>
              <p className="mt-3 leading-7 text-amber-950/75">เว็บไซต์นี้สรุปภาพรวมเท่านั้น รอบบริการและชิ้นส่วนที่ครอบคลุมต้องยึดแบบฟอร์มคำสั่งซื้อและเงื่อนไขล่าสุด</p>
              <Button asChild variant="link" className="mt-3 h-auto p-0 text-amber-900"><Link href="/contact/">ส่งรุ่นให้เจ้าหน้าที่ตรวจสอบ</Link></Button>
            </div>
          </div>
        </div>
      </section>
      <ContactCta />
    </>
  );
}
