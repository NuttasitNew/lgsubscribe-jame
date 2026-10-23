import type { SeoArticleCategory } from "../type/seo-article-content.type";

/**
 * @description ชื่อไทยของหมวดบทความบนหน้า /blog ของ lg-jame
 * @logic key ต้องตรงกับ `SeoArticleCategory` และ seoArticleCategorySchema
 * @used-by {@link seo-article-list-section.tsx}, {@link seo-article-meta-form.tsx}, หน้า /blog
 */
export const SEO_ARTICLE_CATEGORY_LABEL: Record<SeoArticleCategory, string> = {
  productGuide: "รู้จักสินค้า",
  buyingGuide: "วิธีเลือกซื้อ",
  careTips: "ดูแลและใช้งาน",
  services: "LG Subscribe",
};
