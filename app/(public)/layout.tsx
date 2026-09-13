import inlineCampaignImage from "@/lib/subscribe-day-image-inline.json";
import {
  isSubscribeDayActive,
  subscribeDayCampaign,
  subscribeDayPopupStorageKey,
  SUBSCRIBE_DAY_START,
  SUBSCRIBE_DAY_END,
} from "@/lib/subscribe-day";
import { FloatingLineContact } from "@/components/floating-line-contact";
import { FloatingSubscribeDay } from "@/components/floating-subscribe-day";
import { JsonLd } from "@/components/json-ld";
import { MobileDock } from "@/components/mobile-dock";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { siteConfig, siteOperatorDisclosure } from "@/lib/site";

export default function PublicLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const initialCampaignActive = isSubscribeDayActive();
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
      <script
        dangerouslySetInnerHTML={{
          __html: `(function(){var hidden=Date.now()<Date.parse(${JSON.stringify(SUBSCRIBE_DAY_START)})||Date.now()>=Date.parse(${JSON.stringify(SUBSCRIBE_DAY_END)});try{hidden=hidden||sessionStorage.getItem(${JSON.stringify(subscribeDayPopupStorageKey)})==="1"}catch{}document.documentElement.toggleAttribute("data-subscribe-day-hidden",hidden)})()`,
        }}
      />
      <FloatingSubscribeDay
        initialActive={initialCampaignActive}
        image={
          // This small critical image is included in the first response to avoid an extra RTT.
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={inlineCampaignImage.src}
            alt={subscribeDayCampaign.alt}
            fetchPriority="high"
            decoding="async"
            width={750}
            height={750}
            className="h-auto w-full"
          />
        }
      />
      <SiteHeader />
      <main id="main-content">{children}</main>
      <SiteFooter />
      <FloatingLineContact />
      <MobileDock />
    </>
  );
}
