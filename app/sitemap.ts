import type { MetadataRoute } from "next";
import { allProducts } from "@/lib/catalog-products";
import { siteConfig } from "@/lib/site";

export const dynamic = "force-static";

// สำคัญ: sitemap นี้มีไว้สำหรับหน้า public เท่านั้น ห้ามเพิ่ม /backoffice หรือหน้าภายในทุกกรณี แม้เปิด Auth แล้ว
const staticPages = [
  "",
  "/products/",
  "/what-is-lg-subscribe/",
  "/application-guide/",
  "/payment-options/",
  "/terms/",
  "/service-and-maintenance/",
  "/authorized/",
  "/faq/",
  "/contact/",
];

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date("2026-08-09T00:00:00+07:00");
  return [
    ...staticPages.map((path, index) => ({
      url: `${siteConfig.url}${path || "/"}`,
      lastModified,
      changeFrequency: index === 0 ? ("weekly" as const) : ("monthly" as const),
      priority: index === 0 ? 1 : path === "/products/" ? 0.9 : 0.8,
    })),
    ...allProducts.map((product) => ({
      url: `${siteConfig.url}/products/${product.slug}/`,
      lastModified,
      changeFrequency: "monthly" as const,
      priority: 0.8,
    })),
  ];
}
