import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ContactCta } from "@/components/contact-cta";
import { GeneratedIcon } from "@/components/generated-icon";
import { JsonLd } from "@/components/json-ld";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  authorizedAgent,
  createPageMetadata,
  siteConfig,
  siteOperatorDisclosure,
} from "@/lib/site";

export const metadata: Metadata = createPageMetadata({
  title: `ความน่าเชื่อถือ | ตัวแทนขาย LG Subscribe รหัส ${authorizedAgent.code}`,
  description: `ตรวจสอบสถานะตัวแทนขาย LG Subscribe ${authorizedAgent.nameTh} รหัส ${authorizedAgent.code} ได้ที่ ${authorizedAgent.verificationPhone.name} ${authorizedAgent.verificationPhone.label} ผู้จัดการฝ่ายขายที่ได้รับอนุญาตจาก LG โดยตรง ไม่ใช่เว็บไซต์ทางการของ LG Electronics`,
  path: authorizedAgent.path,
});

const verificationSteps = [
  {
    step: "1",
    title: `โทร ${authorizedAgent.verificationPhone.name}`,
    text: `โทร ${authorizedAgent.verificationPhone.label} ซึ่งเป็นเบอร์ศูนย์บริการลูกค้าของ LG ไม่ใช่เบอร์ฝ่ายขายของเว็บไซต์นี้`,
  },
  {
    step: "2",
    title: "แจ้งรหัสตัวแทน",
    text: `แจ้งรหัส ${authorizedAgent.code} ให้เจ้าหน้าที่เพื่อตรวจสอบสถานะตัวแทนขาย`,
  },
  {
    step: "3",
    title: "รอการยืนยัน",
    text: "เจ้าหน้าที่จะยืนยันได้ว่าเป็นตัวแทนการขายที่ได้รับอนุญาต ไม่ใช่บริษัท LG เอง",
  },
] as const;

export default function AuthorizedPage() {
  const schema = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: "ความน่าเชื่อถือ",
    url: `${siteConfig.url}${authorizedAgent.path}`,
    description: metadata.description,
    mainEntity: {
      "@type": "Person",
      name: authorizedAgent.nameTh,
      alternateName: authorizedAgent.nameEn,
      image: `${siteConfig.url}${authorizedAgent.photo}`,
      jobTitle: authorizedAgent.roleEn,
      identifier: {
        "@type": "PropertyValue",
        name: "LG Subscribe agent code",
        value: authorizedAgent.code,
      },
      telephone: siteConfig.phoneNumbers.map((phone) => phone.label),
      email: siteConfig.email,
      worksFor: {
        "@type": "Organization",
        name: siteConfig.name,
        url: siteConfig.url,
      },
    },
  };

  return (
    <>
      <JsonLd data={schema} />
      <header className="page-hero">
        <div className="container-page max-w-5xl text-center">
          <GeneratedIcon src="/images/generated/icon-protection-v1.webp" alt="" className="mx-auto" />
          <p className="mt-5 text-sm font-bold uppercase tracking-[0.18em] text-red-400">Authorized Sale Agent</p>
          <h1 className="mt-3 text-4xl font-bold sm:text-5xl">ความน่าเชื่อถือ</h1>
          <p className="mx-auto mt-5 max-w-3xl text-lg leading-8 text-white/65">
            ตัวแทนการขายบริการ LG Subscribe ที่ได้รับอนุญาตจาก LG โดยตรง ไม่ใช่เว็บไซต์ทางการของ LG Electronics
            หรือ LG Thailand
          </p>
        </div>
      </header>

      <section className="section-space">
        <div className="container-page max-w-6xl">
          <Card className="border-primary/15 bg-white">
            <CardContent className="p-4 sm:p-6 lg:p-8">
              <figure className="mx-auto w-full max-w-sm">
                <h2 className="text-center text-sm font-bold uppercase tracking-[0.18em] text-primary">
                  ภาพรับรางวัล
                </h2>
                <p className="mt-2 text-center text-lg font-semibold text-neutral-800">
                  คุณ{authorizedAgent.nameTh} รับรางวัลในงาน LG Subscribe
                </p>
                <div className="mt-5 overflow-hidden rounded-[1.75rem] border border-black/10 bg-[#171717]">
                  <Image
                    src={authorizedAgent.photo}
                    alt={authorizedAgent.photoAlt}
                    width={authorizedAgent.photoWidth}
                    height={authorizedAgent.photoHeight}
                    preload
                    sizes="(max-width: 384px) 100vw, 384px"
                    className="h-auto w-full object-contain"
                  />
                </div>
              </figure>

              <div className="mt-8 grid gap-6 lg:grid-cols-[1.15fr_0.85fr] lg:items-center">
                <div>
                  <p className="text-sm font-bold uppercase tracking-[0.18em] text-primary">Authorized Sale Agent</p>
                  <h2 className="mt-3 text-3xl font-bold sm:text-4xl">คุณ{authorizedAgent.nameTh}</h2>
                  <p className="mt-2 text-lg font-semibold text-neutral-700">{authorizedAgent.roleTh}</p>
                  <p lang="en" className="mt-1 text-sm text-neutral-500">
                    {authorizedAgent.nameEn}
                  </p>
                  <p className="mt-4 leading-7 text-muted-foreground">
                    ตัวแทนอย่างเป็นทางการที่ได้รับอนุญาตให้ขาย โปรโมท ทำการตลาด ดูแลลูกค้า
                    และบริหารช่องทางจัดจำหน่ายบริการ LG Subscribe
                  </p>
                </div>
                <div className="rounded-2xl border border-black/10 bg-[#f7f5f2] p-6 text-center">
                  <p className="text-sm font-semibold text-neutral-500">รหัสตัวแทนขาย</p>
                  <p className="mt-2 text-4xl font-bold tracking-[0.14em] text-neutral-950 sm:text-5xl">
                    {authorizedAgent.code}
                  </p>
                  <p className="mt-3 text-sm leading-6 text-neutral-600">
                    ตรวจสอบสถานะได้ที่ {authorizedAgent.verificationPhone.name}
                  </p>
                  <Button asChild size="lg" className="mt-5">
                    <a href={authorizedAgent.verificationPhone.href}>
                      โทร {authorizedAgent.verificationPhone.label}
                    </a>
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="mt-8 grid gap-5 md:grid-cols-2">
            <Card>
              <CardContent className="p-8">
                <GeneratedIcon src="/images/generated/icon-consultation-v1.webp" alt="" />
                <h2 className="mt-5 text-2xl font-bold">วิธีตรวจสอบผู้ขายกับสำนักงานใหญ่</h2>
                <ol className="mt-5 grid gap-5">
                  {verificationSteps.map((item) => (
                    <li key={item.step} className="flex gap-4">
                      <span className="grid size-8 shrink-0 place-items-center rounded-full bg-primary text-sm font-bold text-white">
                        {item.step}
                      </span>
                      <div>
                        <p className="font-semibold text-neutral-950">{item.title}</p>
                        <p className="mt-1 text-sm leading-6 text-muted-foreground">{item.text}</p>
                      </div>
                    </li>
                  ))}
                </ol>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-8">
                <GeneratedIcon src="/images/generated/icon-protection-v1.webp" alt="" />
                <h2 className="mt-5 text-2xl font-bold">สิทธิ์ที่ได้รับจาก LG</h2>
                <ul className="mt-5 grid gap-3 text-sm leading-7 text-muted-foreground">
                  <li>ขายบริการ LG Subscribe ตามที่ได้รับอนุญาต</li>
                  <li>โปรโมทและทำการตลาดที่ได้รับการรับรองจาก LG</li>
                  <li>ดูแลลูกค้าก่อนและหลังการสมัคร</li>
                  <li>บริหารจัดการช่องทางจัดจำหน่ายด้วยตนเอง</li>
                </ul>
                <div className="mt-6 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-950/80">
                  เว็บไซต์นี้ไม่ใช่เว็บไซต์ทางการของ LG Electronics และไม่ได้เป็นบริษัท LG
                  หากไม่แน่ใจให้โทร {authorizedAgent.verificationPhone.name}{" "}
                  {authorizedAgent.verificationPhone.label} แล้วแจ้งรหัส {authorizedAgent.code}
                </div>
              </CardContent>
            </Card>
          </div>

          <Card className="mt-8">
            <CardContent className="grid gap-6 p-8 md:grid-cols-2">
              <div>
                <h2 className="text-2xl font-bold">ช่องทางติดต่อฝ่ายขาย</h2>
                <p className="mt-3 leading-7 text-muted-foreground">
                  ใช้ช่องทางนี้เมื่อต้องการสอบถามรุ่น ราคา หรือเริ่มสมัคร ไม่ใช่เบอร์ตรวจสอบสถานะตัวแทน
                </p>
                <div className="mt-5 grid gap-3">
                  <Button asChild className="bg-[#06C755] hover:bg-[#05b64d]">
                    <a href={siteConfig.lineUrl} target="_blank" rel="noreferrer">
                      LINE Official Account {siteConfig.lineId}
                    </a>
                  </Button>
                  {siteConfig.phoneNumbers.map((phone) => (
                    <Button asChild key={phone.href} variant="outline">
                      <a href={phone.href}>โทรฝ่ายขาย {phone.label}</a>
                    </Button>
                  ))}
                </div>
              </div>
              <div lang="en">
                <h2 className="text-2xl font-bold">{siteOperatorDisclosure.en.heading}</h2>
                <div className="mt-4 grid gap-3 text-sm leading-7 text-muted-foreground">
                  <p>{siteOperatorDisclosure.en.identity}</p>
                  <p>{siteOperatorDisclosure.en.credentials}</p>
                  <p>{siteOperatorDisclosure.en.rights}</p>
                  <p>{siteOperatorDisclosure.en.trademark}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <p className="mt-8 text-center text-sm leading-7 text-muted-foreground">
            <Link href="/contact/" className="font-semibold text-primary hover:underline">
              ดูช่องทางติดต่อทั้งหมด
            </Link>
          </p>
        </div>
      </section>
      <ContactCta />
    </>
  );
}
