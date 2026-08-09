import Link from "next/link";
import { BrandLogo } from "@/components/brand-logo";
import { navigation, siteConfig } from "@/lib/site";

export function SiteFooter() {
  return (
    <footer className="border-t border-black/10 bg-[#171717] text-white">
      <div className="container-page grid gap-12 py-16 md:grid-cols-[1.3fr_0.8fr_1fr]">
        <div>
          <div className="flex items-center gap-3">
            <span className="rounded-xl bg-white px-3 py-2">
              <BrandLogo alt="LG" className="w-[4.5rem]" />
            </span>
            <span className="text-xl font-bold">Subscribe</span>
          </div>
          <p className="mt-5 max-w-md text-sm leading-7 text-white/65">
            บริการเช่าใช้เครื่องใช้ไฟฟ้า LG แบบชำระรายเดือน พร้อมทีมดูแลและคำแนะนำก่อนทำสัญญา
          </p>
        </div>

        <div>
          <h2 className="text-base font-semibold">เมนูเว็บไซต์</h2>
          <ul className="mt-4 grid gap-3 text-sm text-white/65">
            {navigation.map((item) => (
              <li key={item.href}>
                <Link href={item.href} className="hover:text-white">
                  {item.label}
                </Link>
              </li>
            ))}
            <li><Link href="/price/" className="hover:text-white">ราคาและโปรโมชัน</Link></li>
            <li><Link href="/payment-options/" className="hover:text-white">ช่องทางชำระเงิน</Link></li>
            <li><Link href="/cancel-contract/" className="hover:text-white">การยกเลิกสัญญา</Link></li>
          </ul>
        </div>

        <div>
          <h2 className="text-base font-semibold">ติดต่อฝ่ายขาย</h2>
          <ul className="mt-4 grid gap-4 text-sm text-white/65">
            <li>
              <a href={siteConfig.lineUrl} target="_blank" rel="noreferrer" className="flex items-start gap-3 hover:text-white">
                LINE Official Account {siteConfig.lineId}
              </a>
            </li>
            {siteConfig.phoneNumbers.map((phone) => (
              <li key={phone.href}>
                <a href={phone.href} className="flex items-start gap-3 hover:text-white">
                  โทร {phone.label}
                </a>
              </li>
            ))}
            <li>
              <a href={`mailto:${siteConfig.email}`} className="flex items-start gap-3 hover:text-white">
                อีเมล {siteConfig.email}
              </a>
            </li>
            <li>ให้บริการในประเทศไทย</li>
          </ul>
        </div>
      </div>

      <div className="border-t border-white/10">
        <div className="container-page flex flex-col gap-3 py-6 text-xs leading-6 text-white/45 md:flex-row md:items-center md:justify-between">
          <p>© {new Date().getFullYear()} LG Subscribe Thailand. All rights reserved.</p>
          <p className="max-w-3xl md:text-right">
            ราคา โปรโมชัน และความคุ้มครองอาจเปลี่ยนแปลง โปรดอ่านรายละเอียดในสัญญาและตรวจสอบกับเจ้าหน้าที่ก่อนยืนยันทุกครั้ง
          </p>
        </div>
      </div>
    </footer>
  );
}
