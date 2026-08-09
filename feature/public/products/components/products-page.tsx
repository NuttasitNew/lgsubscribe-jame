import type { Metadata } from "next";
import { ContactCta } from "@/components/contact-cta";
import { JsonLd } from "@/components/json-ld";
import { ProductCard } from "@/components/product-card";
import { SectionHeading } from "@/components/section-heading";
import { createPageMetadata, products, siteConfig } from "@/lib/site";

export const metadata: Metadata = createPageMetadata({
  title: "สินค้า LG Subscribe ราคาเริ่มต้นรายเดือน",
  description: "รวมทีวี ตู้เย็น เครื่องซักผ้า เครื่องกรองน้ำ เครื่องดูดฝุ่น และเครื่องล้างจาน LG Subscribe พร้อมราคาเริ่มต้นรายเดือน",
  path: "/products/",
});

export default function ProductsPage() {
  const itemListSchema = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "สินค้า LG Subscribe",
    itemListElement: products.map((product, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: product.name,
      url: `${siteConfig.url}/products/${product.slug}/`,
    })),
  };

  return (
    <>
      <JsonLd data={itemListSchema} />
      <section className="page-hero">
        <div className="container-page">
          <p className="text-sm font-bold uppercase tracking-[0.18em] text-red-400">LG Subscribe Products</p>
          <h1 className="mt-4 max-w-4xl text-4xl font-bold sm:text-5xl">สินค้าเครื่องใช้ไฟฟ้า LG แบบรายเดือน</h1>
          <p className="mt-5 max-w-3xl text-lg leading-8 text-white/65">
            เลือกดูรุ่นยอดนิยมพร้อมราคาเริ่มต้น สิทธิบริการและราคาจริงขึ้นอยู่กับแพ็กเกจ โปรโมชัน และผลการพิจารณาของบริษัท
          </p>
        </div>
      </section>

      <section className="section-space">
        <div className="container-page">
          <SectionHeading
            title="เลือกสินค้าที่เข้ากับบ้านของคุณ"
            description="หน้ารายละเอียดแต่ละรุ่นถูกสร้างแบบ static เพื่อให้โหลดเร็ว แชร์ง่าย และค้นหาเจอจาก Google ได้ชัดเจน"
          />
          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {products.map((product, index) => (
              <ProductCard key={product.slug} product={product} eager={index === 0} />
            ))}
          </div>
        </div>
      </section>
      <ContactCta />
    </>
  );
}
