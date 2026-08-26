import Image from "next/image";
import Link from "next/link";
import { Clock3, Mail, MapPin, MessageCircle, Phone } from "lucide-react";
import { siteConfig } from "@/lib/site";

const footerNavigation = [
  { href: "/", label: "หน้าแรก" },
  { href: "/contact/", label: "ติดต่อเรา" },
  { href: "/products/", label: "สินค้าทั้งหมด" },
  { href: "/payment-options/", label: "ช่องทางชำระเงิน" },
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
        <div className="container-page flex flex-col gap-3 py-6 text-xs leading-6 text-white/45 md:flex-row md:items-center md:justify-between">
          <p>© {new Date().getFullYear()} LG Subscribe Thailand. All rights reserved.</p>
          <p className="max-w-3xl md:text-right">
            ราคา โปรโมชัน และความคุ้มครองอาจเปลี่ยนแปลง
            โปรดอ่านรายละเอียดในสัญญาและตรวจสอบกับเจ้าหน้าที่ก่อนยืนยันทุกครั้ง
          </p>
        </div>
      </div>
    </footer>
  );
}
