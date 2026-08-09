import type { Metadata } from "next";
import { GeneratedIcon } from "@/components/generated-icon";
import { JsonLd } from "@/components/json-ld";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { createPageMetadata, siteConfig } from "@/lib/site";

export const metadata: Metadata = createPageMetadata({
  title: "ติดต่อ LG Subscribe โทร LINE และอีเมล",
  description: "ติดต่อฝ่ายขาย LG Subscribe ผ่าน LINE OA @lgsubscribe โทรศัพท์ หรืออีเมล เพื่อสอบถามราคา รุ่นสินค้า เอกสารสมัคร เงื่อนไขสัญญา และบริการหลังการขาย",
  path: "/contact/",
});

export default function ContactPage() {
  const schema = {
    "@context": "https://schema.org",
    "@type": "ContactPage",
    name: metadata.title,
    url: `${siteConfig.url}/contact/`,
    mainEntity: { "@type": "Organization", name: siteConfig.shortName, sameAs: [siteConfig.lineUrl], telephone: siteConfig.phoneNumbers.map((phone) => phone.label), email: siteConfig.email },
  };

  return (
    <>
      <JsonLd data={schema} />
      <header className="page-hero">
        <div className="container-page max-w-5xl text-center">
          <p className="text-sm font-bold uppercase tracking-[0.18em] text-red-400">Contact LG Subscribe</p>
          <h1 className="mt-4 text-4xl font-bold sm:text-5xl">ติดต่อฝ่ายขาย LG Subscribe</h1>
          <p className="mx-auto mt-5 max-w-3xl text-lg leading-8 text-white/65">สอบถามรุ่น ราคา โปรโมชัน เอกสารสมัคร และเงื่อนไขก่อนทำสัญญาผ่าน LINE โทรศัพท์ หรืออีเมล</p>
        </div>
      </header>

      <section className="section-space">
        <div className="container-page grid max-w-5xl gap-5 md:grid-cols-2">
          <Card><CardContent className="p-8"><GeneratedIcon src="/images/generated/icon-consultation-v1.webp" alt="" /><h2 className="mt-5 text-2xl font-bold">LINE Official Account</h2><p className="mt-3 text-3xl font-bold text-neutral-950">{siteConfig.lineId}</p><p className="mt-3 leading-7 text-muted-foreground">ใช้ช่องทางนี้สำหรับทุกการแชทกับฝ่ายขาย รวมถึงส่งชื่อรุ่น รูปสินค้า เอกสาร หรือขอราคาแพ็กเกจล่าสุด</p><Button asChild className="mt-6 bg-[#06C755] hover:bg-[#05b64d]"><a href={siteConfig.lineUrl} target="_blank" rel="noreferrer">เพิ่มเพื่อนและเปิด LINE</a></Button></CardContent></Card>
          <Card><CardContent className="p-8"><GeneratedIcon src="/images/generated/icon-consultation-v1.webp" alt="" /><h2 className="mt-5 text-2xl font-bold">โทรศัพท์</h2><p className="mt-3 leading-7 text-muted-foreground">ติดต่อฝ่ายขายได้ที่</p><div className="mt-4 grid gap-3">{siteConfig.phoneNumbers.map((phone) => <Button asChild key={phone.href} variant="outline" className="justify-start"><a href={phone.href}>โทร {phone.label}</a></Button>)}</div></CardContent></Card>
          <Card className="md:col-span-2"><CardContent className="p-8"><GeneratedIcon src="/images/generated/icon-document-v1.webp" alt="" /><h2 className="mt-5 text-2xl font-bold">อีเมล</h2><p className="mt-3 leading-7 text-muted-foreground">สำหรับส่งเอกสารหรือขอรายละเอียดเป็นลายลักษณ์อักษร</p><a href={`mailto:${siteConfig.email}`} className="mt-4 inline-block font-bold text-red-700 hover:underline">{siteConfig.email}</a></CardContent></Card>
          <div className="md:col-span-2 rounded-2xl border border-amber-200 bg-amber-50 p-7 text-sm leading-7 text-amber-950/80">อย่าส่งรหัส OTP รหัสผ่าน หรือข้อมูลทางการเงินที่ละเอียดอ่อนผ่านแชท โปรดตรวจสอบชื่อ LINE OA ว่าเป็น {siteConfig.lineId} ก่อนส่งข้อมูลทุกครั้ง</div>
        </div>
      </section>
    </>
  );
}
