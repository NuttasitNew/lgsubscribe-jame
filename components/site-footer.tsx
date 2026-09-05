import Image from "next/image";
import Link from "next/link";
import { Clock3, Mail, MapPin, MessageCircle, Phone } from "lucide-react";
import { SiteViewStats } from "@/components/live-view-count";
import { authorizedAgent, siteConfig, siteOperatorDisclosure } from "@/lib/site";

const footerNavigation = [
  { href: "/", label: "หน้าแรก" },
  { href: "/contact/", label: "ติดต่อเรา" },
  { href: "/products/", label: "สินค้าทั้งหมด" },
  { href: authorizedAgent.path, label: "ความน่าเชื่อถือ" },
  { href: "/faq/", label: "คำถามที่พบบ่อย" },
] as const;

export function SiteFooter() {
  return (
    <footer className="border-t border-black/10 bg-[#171717] pb-28 text-white lg:pb-0">
      <div className="container-page grid gap-12 py-16 md:grid-cols-[1.3fr_0.8fr_1fr]">
        <div>
          <Link href="/" aria-label="LG Subscribe หน้าแรก" className="inline-flex">
            <Image
              src="/brand/lg-subscribe-logo-red.png"
              alt="LG Subscribe"
              width={1581}
              height={316}
              className="h-auto w-[12rem]"
            />
          </Link>
          <p className="mt-5 max-w-md text-sm leading-7 text-white/65">
            บริการเช่าใช้เครื่องใช้ไฟฟ้า LG แบบชำระรายเดือน พร้อมทีมดูแลและคำแนะนำก่อนทำสัญญา
          </p>
          <p className="mt-3 max-w-md text-xs leading-6 text-white/50">{siteOperatorDisclosure.blurb}</p>
        </div>

        <div>
          <h2 className="text-base font-semibold">เมนูเว็บไซต์</h2>
          <ul className="mt-4 grid gap-3 text-sm text-white/65">
            {footerNavigation.map((item) => (
              <li key={item.href}>
                <Link href={item.href} className="hover:text-white">
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h2 className="text-base font-semibold">ติดต่อฝ่ายขาย</h2>
          <ul className="mt-4 grid gap-4 text-sm text-white/65">
            <li>
              <a
                href={siteConfig.lineUrl}
                target="_blank"
                rel="noreferrer"
                className="flex items-start gap-3 hover:text-white"
              >
                <MessageCircle className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden="true" />
                LINE Official Account {siteConfig.lineId}
              </a>
            </li>
            {siteConfig.phoneNumbers.map((phone) => (
              <li key={phone.href}>
                <a href={phone.href} className="flex items-start gap-3 hover:text-white">
                  <Phone className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden="true" />
                  โทร {phone.label}
                </a>
              </li>
            ))}
            <li>
              <a href={`mailto:${siteConfig.email}`} className="flex items-start gap-3 hover:text-white">
                <Mail className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden="true" />
                อีเมล {siteConfig.email}
              </a>
            </li>
            <li className="flex items-start gap-3">
              <MapPin className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden="true" />
              ให้บริการในประเทศไทย
            </li>
            <li className="flex items-start gap-3">
              <Clock3 className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden="true" />
              จันทร์ – อาทิตย์ 09:00–18:00 น.
            </li>
          </ul>
        </div>
      </div>

      <div className="border-t border-white/10">
        <div className="container-page flex flex-col gap-5 py-8 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm font-semibold text-white/85">
              {authorizedAgent.nameTh} · {authorizedAgent.roleTh} · รหัสตัวแทน {authorizedAgent.code}
            </p>
            <p className="mt-2 text-sm leading-7 text-white/55">
              ตรวจสอบสถานะตัวแทนได้ที่ {authorizedAgent.verificationPhone.name}{" "}
              <a href={authorizedAgent.verificationPhone.href} className="text-white/80 hover:text-white">
                {authorizedAgent.verificationPhone.label}
              </a>
            </p>
            <p lang="en" className="mt-1 text-sm leading-7 text-white/45">
              {authorizedAgent.nameEn} · {authorizedAgent.roleEn} · Agent code {authorizedAgent.code}. Verify with{" "}
              {authorizedAgent.verificationPhone.name} {authorizedAgent.verificationPhone.label}.
            </p>
          </div>
          <Link
            href={authorizedAgent.path}
            className="inline-flex h-11 items-center justify-center rounded-md border border-white/20 px-5 text-sm font-semibold text-white hover:bg-white/10"
          >
            ดูหน้าความน่าเชื่อถือ
          </Link>
        </div>
      </div>

      <div className="border-t border-white/10">
        <div className="container-page grid gap-8 py-10 md:grid-cols-2">
          <section aria-labelledby="operator-disclosure-th">
            <h2 id="operator-disclosure-th" className="text-sm font-semibold text-white/80">
              {siteOperatorDisclosure.th.heading}
            </h2>
            <div className="mt-3 grid gap-3 text-sm leading-7 text-white/55">
              <p>{siteOperatorDisclosure.th.identity}</p>
              <p>{siteOperatorDisclosure.th.credentials}</p>
              <p>{siteOperatorDisclosure.th.rights}</p>
              <p>{siteOperatorDisclosure.th.trademark}</p>
            </div>
          </section>
          <section lang="en" aria-labelledby="operator-disclosure-en">
            <h2 id="operator-disclosure-en" className="text-sm font-semibold text-white/80">
              {siteOperatorDisclosure.en.heading}
            </h2>
            <div className="mt-3 grid gap-3 text-sm leading-7 text-white/55">
              <p>{siteOperatorDisclosure.en.identity}</p>
              <p>{siteOperatorDisclosure.en.credentials}</p>
              <p>{siteOperatorDisclosure.en.rights}</p>
              <p>{siteOperatorDisclosure.en.trademark}</p>
            </div>
          </section>
        </div>
      </div>

      <div className="border-t border-white/10">
        <div className="container-page flex flex-col gap-3 py-6 text-xs leading-6 text-white/45 md:flex-row md:items-center md:justify-between">
          <div className="grid gap-2">
            <p>© {new Date().getFullYear()} LG Subscribe Thailand. All rights reserved.</p>
            <SiteViewStats />
          </div>
          <p className="max-w-3xl md:text-right">
            ราคา โปรโมชัน และความคุ้มครองอาจเปลี่ยนแปลง
            โปรดอ่านรายละเอียดในสัญญาและตรวจสอบกับเจ้าหน้าที่ก่อนยืนยันทุกครั้ง
          </p>
        </div>
      </div>
    </footer>
  );
}
