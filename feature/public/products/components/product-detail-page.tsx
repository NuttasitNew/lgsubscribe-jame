import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ContactCta } from "@/components/contact-cta";
import { GeneratedIcon } from "@/components/generated-icon";
import { ImageFallback } from "@/components/image-fallback";
import { JsonLd } from "@/components/json-ld";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { createPageMetadata, products, siteConfig } from "@/lib/site";

type ProductPageProps = { params: Promise<{ slug: string }> };

export const dynamicParams = false;

export function generateStaticParams() {
  return products.map((product) => ({ slug: product.slug }));
}

export async function generateMetadata({ params }: ProductPageProps): Promise<Metadata> {
  const { slug } = await params;
  const product = products.find((item) => item.slug === slug);
  if (!product) return {};
  return createPageMetadata({
    title:
      product.monthlyPrice !== null
        ? `${product.name} ราคาในโปรโมชัน ฿${product.monthlyPrice.toLocaleString("th-TH")}/เดือน`
        : `${product.name} ราคาและแพ็กเกจ LG Subscribe`,
    description: `${product.description} ดูรายละเอียดแพ็กเกจ ${product.model} และปรึกษาเจ้าหน้าที่ LG Subscribe`,
    path: `/products/${product.slug}/`,
    image: product.image,
  });
}

export default async function ProductDetailPage({ params }: ProductPageProps) {
  const { slug } = await params;
  const product = products.find((item) => item.slug === slug);
  if (!product) notFound();

  const productSchema = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    model: product.model,
    category: product.category,
    image: `${siteConfig.url}${product.image}`,
    description: product.description,
    brand: { "@type": "Brand", name: "LG" },
    ...(product.monthlyPrice !== null
      ? {
          offers: {
            "@type": "Offer",
            url: `${siteConfig.url}/products/${product.slug}/`,
            priceCurrency: "THB",
            price: product.monthlyPrice,
            availability: "https://schema.org/InStock",
            priceSpecification: {
              "@type": "UnitPriceSpecification",
              price: product.monthlyPrice,
              priceCurrency: "THB",
              unitText: "MONTH",
            },
          },
        }
      : {}),
  };

  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "หน้าแรก", item: `${siteConfig.url}/` },
      { "@type": "ListItem", position: 2, name: "สินค้า", item: `${siteConfig.url}/products/` },
      { "@type": "ListItem", position: 3, name: product.name, item: `${siteConfig.url}/products/${product.slug}/` },
    ],
  };

  return (
    <>
      <JsonLd data={[productSchema, breadcrumbSchema]} />
      <section className="section-space bg-white">
        <div className="container-page">
          <Button asChild variant="ghost" className="mb-8 -ml-3 text-muted-foreground">
            <Link href="/products/">
              <span aria-hidden="true">←</span>
              สินค้าทั้งหมด
            </Link>
          </Button>

          <div className="grid gap-12 lg:grid-cols-[0.72fr_1.28fr] lg:gap-20">
            <div className="grid gap-4 lg:sticky lg:top-28 lg:self-start">
              <ImageFallback label={`ภาพสินค้า ${product.name}`} src={product.image} aspect="square" loading="eager" fit="contain" />
              <div className="rounded-2xl border border-black/10 bg-neutral-950 p-7 text-white">
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-red-400">Product overview</p>
              <p className="mt-8 text-5xl font-bold tracking-[-0.06em] text-white/10">{product.model}</p>
              <dl className="mt-10 divide-y divide-white/10 border-y border-white/10 text-sm">
                <div className="flex justify-between gap-4 py-4"><dt className="text-white/45">หมวดสินค้า</dt><dd className="font-semibold">{product.category}</dd></div>
                <div className="flex justify-between gap-4 py-4"><dt className="text-white/45">รุ่น</dt><dd className="font-semibold">{product.model}</dd></div>
                <div className="flex justify-between gap-4 py-4"><dt className="text-white/45">ระยะสัญญา</dt><dd className="font-semibold">{product.contractMonths ? `${product.contractMonths} งวด` : "สอบถามล่าสุด"}</dd></div>
              </dl>
              </div>
            </div>
            <div>
              <Badge className="bg-neutral-950">{product.category}</Badge>
              <p className="mt-5 text-sm font-bold uppercase tracking-[0.18em] text-red-700">{product.model}</p>
              <h1 className="mt-3 text-4xl font-bold leading-tight text-neutral-950 sm:text-5xl">{product.name}</h1>
              <p className="mt-6 text-lg leading-8 text-muted-foreground">{product.description}</p>

              <div className="mt-8 rounded-2xl border border-red-100 bg-red-50 p-6">
                {product.monthlyPrice !== null ? (
                  <>
                    <p className="text-sm text-red-800">ราคาโปรโมชันที่ปรากฏในภาพอ้างอิง</p>
                    <p className="mt-1 text-4xl font-bold text-red-700">
                      ฿{product.monthlyPrice.toLocaleString("th-TH")}
                      <span className="text-base font-medium">/เดือน</span>
                    </p>
                  </>
                ) : (
                  <p className="text-2xl font-bold text-red-700">สอบถามราคาและรุ่นที่ร่วมรายการล่าสุด</p>
                )}
                <p className="mt-2 text-xs leading-5 text-red-800/70">ตรวจสอบข้อมูลเมื่อ {siteConfig.offerReviewedAt} ราคา ระยะสัญญา และสิทธิจริงให้ยึดแบบฟอร์มคำสั่งซื้อ ณ วันที่สมัคร</p>
              </div>

              <ul className="mt-8 grid gap-4">
                {product.highlights.map((highlight) => (
                  <li key={highlight} className="flex items-center gap-3 font-medium text-neutral-800">
                    <span className="grid size-6 place-items-center rounded-full bg-red-100 text-red-700">
                      <span aria-hidden="true">✓</span>
                    </span>
                    {highlight}
                  </li>
                ))}
              </ul>

              <div className="mt-9 flex flex-col gap-3 sm:flex-row">
                <Button asChild size="lg" className="rounded-full bg-red-600 px-7 hover:bg-red-700">
                  <a href={siteConfig.lineUrl} target="_blank" rel="noreferrer">
                    สอบถามรุ่นนี้
                  </a>
                </Button>
                <Button asChild size="lg" variant="outline" className="rounded-full px-7">
                  <Link href="/terms/">
                    อ่านเงื่อนไข
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="section-space bg-neutral-950 text-white">
        <div className="container-page grid gap-6 md:grid-cols-3">
          {[
            { icon: "/images/generated/icon-protection-v1.webp", title: product.warrantyYears !== null ? `คุ้มครองสูงสุด ${product.warrantyYears} ปี` : "ระยะคุ้มครองตามแพ็กเกจ", text: "ระยะจริงขึ้นอยู่กับรุ่นและแพ็กเกจ" },
            { icon: "/images/generated/icon-expert-care-v1.webp", title: "บริการซ่อมบำรุง", text: "ตามรายการและรอบบริการในสัญญา" },
            { icon: "/images/generated/icon-document-v1.webp", title: product.contractMonths !== null ? `${product.contractMonths} งวดในภาพอ้างอิง` : "จำนวนงวดตามแบบฟอร์มคำสั่งซื้อ", text: "ตรวจสอบระยะเวลาจริงก่อนลงนาม" },
          ].map((item) => (
              <Card key={item.title} className="border-white/10 bg-white/5 text-white">
                <CardContent className="p-7">
                  <GeneratedIcon src={item.icon} alt="" />
                  <h2 className="mt-5 text-xl font-bold">{item.title}</h2>
                  <p className="mt-2 text-sm leading-6 text-white/60">{item.text}</p>
                </CardContent>
              </Card>
          ))}
        </div>
      </section>
      <ContactCta />
    </>
  );
}
