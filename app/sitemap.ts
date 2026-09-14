import type { MetadataRoute } from "next";
import { allProducts } from "@/lib/catalog-products";
import { siteConfig } from "@/lib/site";
import { seoCategories } from "@/lib/seo-categories";

export const dynamic = "force-static";

// สำคัญ: sitemap นี้มีไว้สำหรับหน้า public เท่านั้น ห้ามเพิ่ม /backoffice หรือหน้าภายในทุกกรณี แม้เปิด Auth แล้ว
const staticPages = [
  "",
  "/products/",
  "/what-is-lg-subscribe/",
  "/application-guide/",
  "/service-and-maintenance/",
  "/faq/",
  "/authorized/",
  "/contact/",
];

export default function sitemap(): MetadataRoute.Sitemap {
  // Omit lastmod when a reliable per-page content date is unavailable.
  // Google should not be told that every page changed on each build.
  return [
    ...staticPages.map((path, index) => ({
      url: `${siteConfig.url}${path || "/"}`,
      changeFrequency: index === 0 ? ("weekly" as const) : ("monthly" as const),
      priority: index === 0 ? 1 : path === "/products/" ? 0.9 : 0.8,
    })),
    ...allProducts.map((product) => ({
      url: `${siteConfig.url}/products/${product.slug}/`,
      changeFrequency: "monthly" as const,
      priority: 0.8,
    })),
    ...seoCategories.map((category) => ({
      url: `${siteConfig.url}/categories/${category.slug}/`,
      changeFrequency: "monthly" as const,
      priority: 0.8,
    })),
  ];
}
