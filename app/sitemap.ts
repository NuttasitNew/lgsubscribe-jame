import type { MetadataRoute } from "next";
import { listPublishedBlogArticlesForCachedPage } from "@/feature/backoffice/seo/seo-article/server/public-blog-article.helper";
import { allProducts } from "@/lib/catalog-products";
import { siteConfig } from "@/lib/site";

// Static pages + products are fixed per deploy; /blog articles come from the database and
// publishing revalidates /sitemap.xml, so there is no timed regeneration.
export const revalidate = false;

// สำคัญ: sitemap นี้มีไว้สำหรับหน้า public เท่านั้น ห้ามเพิ่ม /backoffice หรือหน้าภายในทุกกรณี แม้เปิด Auth แล้ว
const staticPages = [
  "",
  "/products/",
  "/what-is-lg-subscribe/",
  "/application-guide/",
  "/service-and-maintenance/",
  "/faq/",
  "/blog/",
  "/authorized/",
  "/contact/",
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const lastModified = new Date("2026-08-09T00:00:00+07:00");
  const articles = await listPublishedBlogArticlesForCachedPage("sitemap");
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
    ...articles.map((article) => ({
      url: `${siteConfig.url}/blog/${article.slug}/`,
      lastModified: new Date(`${article.updatedAt}T00:00:00+07:00`),
      changeFrequency: "monthly" as const,
      priority: 0.7,
    })),
  ];
}
