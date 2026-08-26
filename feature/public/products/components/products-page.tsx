import type { Metadata } from "next";
import { Suspense } from "react";
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

      <Suspense
        fallback={<section className="min-h-[50vh] bg-[#f4f1ed]" aria-label="รายการสินค้าจากเอกสาร" />}
      >
        <ProductCatalogBrowser />
      </Suspense>
      <ContactCta />
    </>
  );
}
