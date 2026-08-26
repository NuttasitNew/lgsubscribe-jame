import type { Metadata } from "next";
import { ContactCta } from "@/components/contact-cta";
import { GeneratedIcon } from "@/components/generated-icon";
import { ImageFallback } from "@/components/image-fallback";
import { JsonLd } from "@/components/json-ld";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { createPageMetadata, siteConfig } from "@/lib/site";

export const metadata: Metadata = createPageMetadata({
  title: "LG Subscribe เชื่อถือได้ไหม ตรวจสอบเว็บไซต์และป้องกันมิจฉาชีพ",
  description: "วิธีตรวจสอบช่องทาง LG Subscribe ให้ปลอดภัย เช็ก HTTPS ข้อมูลติดต่อ เอกสารบริษัท สัญญา และหลีกเลี่ยงการโอนเงินไปยังบัญชีที่ไม่ได้ยืนยัน",
  path: "/authorized/",
  image: "/images/generated/icon-protection-v1.webp",
});

const trustChecks = [
  { icon: "/images/generated/icon-protection-v1.webp", title: "ตรวจสอบ HTTPS และโดเมน", text: "อ่านชื่อโดเมนทุกตัวอักษรและหลีกเลี่ยงลิงก์ที่เลียนแบบหรือสะกดใกล้เคียง" },
  { icon: "/images/generated/icon-document-v1.webp", title: "ตรวจข้อมูลนิติบุคคล", text: "ตรวจชื่อบริษัท เลขทะเบียน และข้อมูลผู้รับเงินให้ตรงกับเอกสารทางการ" },
  { icon: "/images/generated/icon-consultation-v1.webp", title: "ยืนยันกับเจ้าหน้าที่", text: "หากได้รับโปรโมชันจากโฆษณาหรือโซเชียล ควรยืนยันราคาและช่องทางชำระอีกครั้ง" },
  { icon: "/images/generated/icon-protection-v1.webp", title: "อ่านสัญญาก่อนโอน", text: "ขอแบบฟอร์มคำสั่งซื้อ ตารางชำระ และเงื่อนไขสัญญาเป็นลายลักษณ์อักษร" },
];

export default function AuthorizedPage() {
  const schema = { "@context": "https://schema.org", "@type": "WebPage", name: metadata.title, description: metadata.description, url: `${siteConfig.url}/authorized/`, about: { "@type": "Thing", name: "การตรวจสอบ LG Subscribe และป้องกันมิจฉาชีพ" } };
  return (
    <>
      <JsonLd data={schema} />
      <header className="page-hero">
        <div className="container-page relative z-10 grid items-center gap-10 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="max-w-4xl">
            <GeneratedIcon src="/images/generated/icon-protection-v1.webp" alt="" />
            <h1 className="mt-5 text-4xl font-bold leading-tight sm:text-5xl">LG Subscribe เชื่อถือได้ไหม และตรวจสอบอย่างไร?</h1>
            <p className="mt-5 max-w-3xl text-lg leading-8 text-white/65">คำค้น “LG Subscribe มิจฉาชีพ” สะท้อนว่าลูกค้าต้องการความมั่นใจก่อนส่งเอกสารหรือชำระเงิน นี่คือเช็กลิสต์ที่ควรทำทุกครั้ง</p>
          </div>
          <ImageFallback label="ภาพยืนยันข้อมูลธุรกิจและความน่าเชื่อถือ" fallbackSrc="/images/dbd-verified.png" aspect="wide" tone="dark" />
        </div>
      </header>

      <section className="section-space">
        <div className="container-page max-w-6xl">
          <div className="grid gap-5 md:grid-cols-2">
            {trustChecks.map((check) => <Card key={check.title}><CardContent className="p-7"><GeneratedIcon src={check.icon} alt="" /><h2 className="mt-5 text-xl font-bold">{check.title}</h2><p className="mt-3 leading-7 text-muted-foreground">{check.text}</p></CardContent></Card>)}
          </div>

          <div className="mt-14 rounded-2xl bg-white p-8 shadow-sm">
            <h2 className="text-3xl font-bold">สัญญาณเตือนที่ไม่ควรมองข้าม</h2>
            <ul className="mt-6 grid gap-4 text-neutral-700 md:grid-cols-2">
              <li>• เร่งให้โอนเงินทันทีโดยไม่ส่งรายละเอียดสัญญา</li>
              <li>• บัญชีรับเงินเป็นบุคคลที่ตรวจสอบความเกี่ยวข้องไม่ได้</li>
              <li>• ขอรหัส OTP รหัสผ่าน หรือข้อมูลบัตรเกินความจำเป็น</li>
              <li>• ราคาแตกต่างจากช่องทางอื่นมากและไม่ยอมยืนยันเป็นลายลักษณ์อักษร</li>
            </ul>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button asChild className="bg-red-600 hover:bg-red-700"><a href={siteConfig.lineUrl} target="_blank" rel="noreferrer">ยืนยันกับเจ้าหน้าที่</a></Button>
            </div>
          </div>
        </div>
      </section>
      <ContactCta />
    </>
  );
}
