import type { Metadata } from "next";
import "@fontsource/ibm-plex-sans-thai/400.css";
import "@fontsource/ibm-plex-sans-thai/500.css";
import "@fontsource/ibm-plex-sans-thai/600.css";
import "@fontsource/ibm-plex-sans-thai/700.css";
import { JsonLd } from "@/components/json-ld";
import { FloatingLineContact } from "@/components/floating-line-contact";
import { MobileDock } from "@/components/mobile-dock";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { siteConfig } from "@/lib/site";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(siteConfig.url),
  title: {
    default: siteConfig.title,
    template: `%s | ${siteConfig.shortName}`,
  },
  description: siteConfig.description,
  keywords: [...siteConfig.keywords],
  authors: [{ name: siteConfig.shortName }],
  creator: siteConfig.shortName,
  publisher: siteConfig.shortName,
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    locale: "th_TH",
    url: "/",
    siteName: siteConfig.shortName,
    title: siteConfig.title,
    description: siteConfig.description,
    images: [{ url: "/brand/lg-logo-social.png", alt: "LG" }],
  },
  twitter: {
    card: "summary_large_image",
    title: siteConfig.title,
    description: siteConfig.description,
    images: ["/brand/lg-logo-social.png"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
  category: "shopping",
  icons: {
    icon: "/icon.svg",
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  const organizationSchema = {
    "@context": "https://schema.org",
    "@type": "Organization",
    "@id": `${siteConfig.url}/#organization`,
    name: siteConfig.shortName,
    url: siteConfig.url,
    logo: `${siteConfig.url}/brand/lg-logo.svg`,
    description: siteConfig.description,
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
    <html lang="th" className="scroll-smooth" data-scroll-behavior="smooth">
      <body className="min-h-screen bg-background text-foreground antialiased">
        <JsonLd data={organizationSchema} />
        <a
          href="#main-content"
          className="sr-only z-50 rounded-md bg-primary px-4 py-2 text-primary-foreground focus:not-sr-only focus:fixed focus:left-4 focus:top-4"
        >
          ข้ามไปยังเนื้อหาหลัก
        </a>
        <SiteHeader />
        <main id="main-content" className="pb-36 lg:pb-0">{children}</main>
        <SiteFooter />
        <FloatingLineContact />
        <MobileDock />
      </body>
    </html>
  );
}
