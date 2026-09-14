import Link from "next/link";
import { notFound } from "next/navigation";
import { createPageMetadata, siteConfig } from "@/lib/site";
import { seoCategories, getSeoCategory } from "@/lib/seo-categories";
import { allProducts } from "@/lib/catalog-products";
import { getProductKnowledgeGuide } from "@/lib/product-knowledge";
import { ProductCard } from "@/components/product-card";
import { ContactCta } from "@/components/contact-cta";
import { JsonLd } from "@/components/json-ld";
export const dynamicParams = false;
export function generateStaticParams() {
  return seoCategories.map(({ slug }) => ({ slug }));
}
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const category = getSeoCategory((await params).slug);
  if (!category) return {};
  return createPageMetadata({
    title: category.title,
    description: category.description,
    path: `/categories/${category.slug}/`,
  });
}
export default async function CategoryPage({ params }: { params: Promise<{ slug: string }> }) {
  const category = getSeoCategory((await params).slug);
  if (!category) notFound();
  const products = allProducts.filter((product) => product.category === category.category);
  const guide = getProductKnowledgeGuide(category.category)!;
  return (
    <>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "BreadcrumbList",
          itemListElement: [
            { "@type": "ListItem", position: 1, name: "หน้าแรก", item: siteConfig.url },
            { "@type": "ListItem", position: 2, name: "สินค้า", item: `${siteConfig.url}/products/` },
            {
              "@type": "ListItem",
              position: 3,
              name: category.label,
              item: `${siteConfig.url}/categories/${category.slug}/`,
            },
          ],
        }}
      />
      <section className="border-b bg-red-50/50">
        <div className="container-page py-12 sm:py-16">
          <nav aria-label="เส้นทางหน้า" className="text-sm text-muted-foreground">
            <Link href="/products/" className="underline">
              สินค้า LG Subscribe
            </Link>{" "}
            / {category.label}
          </nav>
          <h1 className="mt-6 max-w-4xl text-3xl font-bold leading-tight sm:text-4xl">{category.title}</h1>
          <p className="mt-5 max-w-3xl text-lg leading-8 text-muted-foreground">{category.intro}</p>
          <div className="mt-6 flex flex-wrap gap-3">
            <a href="#compare" className="rounded-lg bg-primary px-5 py-3 font-semibold text-white">
              เปรียบเทียบรุ่นและราคา
            </a>
            <Link
              href="/application-guide/"
              className="rounded-lg border border-primary px-5 py-3 font-semibold text-primary"
            >
              วิธีสมัครและเอกสาร
            </Link>
          </div>
        </div>
      </section>
      <section id="compare" className="container-page scroll-mt-28 py-12">
        <h2 className="text-2xl font-bold">เปรียบเทียบ{category.label} LG แบบรายเดือน</h2>
        <p className="mt-3 max-w-3xl leading-7 text-muted-foreground">
          ราคาอ้างอิงแพ็กเกจในรายการสินค้า โปรโมชั่นอาจใช้เฉพาะบางรอบบิล ระยะสัญญา บริการ
          และค่าใช้จ่ายรวมต้องยืนยันตามรุ่นก่อนสมัคร
        </p>
        <div className="mt-6 overflow-x-auto">
          <table className="w-full min-w-[540px] text-left text-sm">
            <thead className="border-b bg-muted">
              <tr>
                <th className="p-3">รุ่น</th>
                <th className="p-3">ราคาแพ็กเกจรายเดือน*</th>
                <th className="p-3">รายละเอียด</th>
              </tr>
            </thead>
            <tbody>
              {products.map((p) => (
                <tr key={p.slug} className="border-b">
                  <td className="p-3 font-medium">{p.model}</td>
                  <td className="p-3">
                    {p.monthlyPrice !== null ? `฿${p.monthlyPrice.toLocaleString("th-TH")}` : "สอบถามแพ็กเกจ"}
                  </td>
                  <td className="p-3">
                    <Link href={`/products/${p.slug}/`} className="text-primary underline">
                      ดู {p.model}
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-xs leading-5 text-muted-foreground">
          *ราคาและสิทธิประโยชน์เป็นไปตามเงื่อนไขแพ็กเกจ ไม่ใช่ราคาเหมาจ่ายตลอดสัญญา
          ตรวจยอดแต่ละช่วงและค่าใช้จ่ายรวมกับเจ้าหน้าที่
        </p>
      </section>
      <section className="container-page pb-12">
        <div className="grid gap-6 md:grid-cols-2">
          <div className="rounded-2xl border p-6">
            <h2 className="text-xl font-bold">เลือกให้เหมาะกับบ้าน</h2>
            <p className="mt-3 leading-7 text-muted-foreground">{guide.summary}</p>
            <ul className="mt-4 list-disc space-y-3 pl-5 text-sm leading-6">
              {guide.selectionCriteria.map((text) => (
                <li key={text}>{text}</li>
              ))}
            </ul>
          </div>
          <div className="rounded-2xl border p-6">
            <h2 className="text-xl font-bold">ติดตั้งและดูแลระหว่างใช้งาน</h2>
            <ul className="mt-4 list-disc space-y-3 pl-5 text-sm leading-6">
              {guide.installation.map((text) => (
                <li key={text}>{text}</li>
              ))}
            </ul>
            <p className="mt-4 text-sm leading-7">{guide.care}</p>
            <Link
              href="/service-and-maintenance/"
              className="mt-4 inline-block text-sm text-primary underline"
            >
              รายละเอียดบริการดูแล
            </Link>
          </div>
        </div>
      </section>
      <section className="container-page pb-12">
        <h2 className="mb-6 text-2xl font-bold">รุ่นที่มีให้เลือก</h2>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {products.map((product) => (
            <ProductCard key={product.slug} product={product} />
          ))}
        </div>
      </section>
      <section className="container-page pb-12">
        <h2 className="text-2xl font-bold">คำถามก่อนเลือก{category.label}รายเดือน</h2>
        <div className="mt-5 space-y-3">
          {category.questions.map((item) => (
            <details className="rounded-xl border p-5" key={item.q}>
              <summary className="cursor-pointer font-semibold">{item.q}</summary>
              <p className="mt-3 leading-7 text-muted-foreground">{item.a}</p>
            </details>
          ))}
        </div>
        <p className="mt-6 leading-7">
          อ่านเพิ่มเติม{" "}
          <Link href="/what-is-lg-subscribe/" className="text-primary underline">
            LG Subscribe คืออะไร
          </Link>{" "}
          หรือ{" "}
          <Link href="/authorized/" className="text-primary underline">
            ตรวจสอบข้อมูลตัวแทนผู้ดูแลเว็บไซต์
          </Link>
        </p>
        <nav aria-label="หมวดสินค้าอื่น" className="mt-6 flex flex-wrap gap-3">
          {seoCategories
            .filter((c) => c.slug !== category.slug)
            .map((c) => (
              <Link
                key={c.slug}
                href={`/categories/${c.slug}/`}
                className="rounded-full border px-4 py-2 text-sm"
              >
                {c.label}รายเดือน
              </Link>
            ))}
        </nav>
      </section>
      <ContactCta />
    </>
  );
}
