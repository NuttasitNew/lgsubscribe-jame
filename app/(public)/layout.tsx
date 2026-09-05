import { FloatingLineContact } from "@/components/floating-line-contact";
import { FloatingSubscribeDay } from "@/components/floating-subscribe-day";
import { JsonLd } from "@/components/json-ld";
import { MobileDock } from "@/components/mobile-dock";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { siteConfig, siteOperatorDisclosure } from "@/lib/site";

export default function PublicLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const organizationSchema = {
    "@context": "https://schema.org",
    "@type": "Organization",
    "@id": `${siteConfig.url}/#organization`,
    name: siteConfig.shortName,
    url: siteConfig.url,
    logo: `${siteConfig.url}/brand/lg-logo.svg`,
    description: siteConfig.description,
    disambiguatingDescription: siteOperatorDisclosure.en.identity,
    sameAs: [siteConfig.lineUrl],
    email: siteConfig.email,
    contactPoint: siteConfig.phoneNumbers.map((phone) => ({
      "@type": "ContactPoint",
      telephone: phone.label,
      url: siteConfig.lineUrl,
      contactType: "sales",
      availableLanguage: ["Thai"],
    })),
  };

  return (
    <>
      <JsonLd data={organizationSchema} />
      <a
        href="#main-content"
        className="sr-only z-50 rounded-md bg-primary px-4 py-2 text-primary-foreground focus:not-sr-only focus:fixed focus:left-4 focus:top-4"
      >
        ข้ามไปยังเนื้อหาหลัก
      </a>
      <SiteHeader />
      <main id="main-content">{children}</main>
      <SiteFooter />
      <FloatingSubscribeDay />
      <FloatingLineContact />
      <MobileDock />
    </>
  );
}
