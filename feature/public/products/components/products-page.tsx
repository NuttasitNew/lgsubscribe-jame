import type { Metadata } from "next";
import Link from "next/link";
import { seoCategories } from "@/lib/seo-categories";
import { ContactCta } from "@/components/contact-cta";
import { JsonLd } from "@/components/json-ld";
import { ProductCatalogBrowser } from "@/feature/public/products/components/product-catalog-browser";
import { catalogProducts } from "@/lib/catalog-products";
import { createPageMetadata, siteConfig } from "@/lib/site";

export const metadata: Metadata = createPageMetadata({
  title: "สินค้า LG Subscribe ราคาเริ่มต้นรายเดือน",
  description:
    "รวมทีวี ตู้เย็น เครื่องซักผ้า เครื่องกรองน้ำ เครื่องดูดฝุ่น และเครื่องล้างจาน LG Subscribe พร้อมราคาเริ่มต้นรายเดือน",
  path: "/products/",
});

export default function ProductsPage() {
  const itemListSchema = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "สินค้า LG Subscribe",
    itemListElement: catalogProducts.map((product, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: product.name,
      url: `${siteConfig.url}/products/${product.slug}/`,
    })),
  };

  return (
    <>
      <JsonLd data={itemListSchema} />
      <h1 className="sr-only">สินค้าเครื่องใช้ไฟฟ้า LG แบบรายเดือน</h1>

      <ProductCatalogBrowser />
      <section className="container-page py-10">
        <h2 className="text-2xl font-bold">เลือกแพ็กเกจตามประเภทสินค้า</h2>
        <p className="mt-3 text-muted-foreground">เปรียบเทียบรุ่น ราคา และสิ่งที่ต้องเตรียมก่อนสมัคร</p>
        <nav aria-label="คู่มือเลือกสินค้ารายเดือน" className="mt-5 flex flex-wrap gap-3">
          {seoCategories.map((category) => (
            <Link
              key={category.slug}
              href={`/categories/${category.slug}/`}
              className="rounded-xl border px-4 py-3 font-medium text-primary"
            >
              {category.label} LG รายเดือน
            </Link>
          ))}
        </nav>
      </section>
      <ContactCta />
    </>
  );
}
