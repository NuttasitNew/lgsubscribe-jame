import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ContactCta } from "@/components/contact-cta";
import { GeneratedIcon } from "@/components/generated-icon";
import { JsonLd } from "@/components/json-ld";
import { ProductGallery } from "@/feature/public/products/components/product-gallery";
import { ProductSpecifications } from "@/feature/public/products/components/product-specifications";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { allProducts } from "@/lib/catalog-products";
import { getProductKnowledgeGuide } from "@/lib/product-knowledge";
import { getProductSpecificationRecord } from "@/lib/product-specifications";
import { buildProductGallery } from "@/lib/promotion-images";
import { createPageMetadata, siteConfig } from "@/lib/site";

type ProductPageProps = { params: Promise<{ slug: string }> };

export const dynamicParams = false;

export function generateStaticParams() {
  return allProducts.map((product) => ({ slug: product.slug }));
}

export async function generateMetadata({ params }: ProductPageProps): Promise<Metadata> {
  const { slug } = await params;
  const product = allProducts.find((item) => item.slug === slug);
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
  const product = allProducts.find((item) => item.slug === slug);
  if (!product) notFound();
  const specificationRecord = getProductSpecificationRecord(product.model);
  const structuredSpecifications =
    specificationRecord?.status === "verified"
      ? specificationRecord.groups.flatMap((group) =>
          group.items.map((item) => ({
            "@type": "PropertyValue",
            name: `${group.title} - ${item.label}`,
            value: item.value,
          })),
        )
      : [];

  const gallery = buildProductGallery(product);

  const productSchema = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    model: specificationRecord?.sourceModel ?? product.model,
    mpn: specificationRecord?.sourceModel ?? product.model,
    category: product.category,
    image: gallery.map((item) => `${siteConfig.url}${item.src}`),
    description: product.description,
    brand: { "@type": "Brand", name: "LG" },
    ...(structuredSpecifications.length ? { additionalProperty: structuredSpecifications } : {}),
    ...(product.reviews?.length
      ? {
          aggregateRating: {
            "@type": "AggregateRating",
            ratingValue: (
              product.reviews.reduce((total, review) => total + review.rating, 0) / product.reviews.length
            ).toFixed(1),
            reviewCount: product.reviews.length,
            bestRating: 5,
          },
          review: product.reviews.map((review) => ({
            "@type": "Review",
            author: { "@type": "Person", name: review.reviewer },
            name: review.title,
            reviewBody: review.summary,
            reviewRating: { "@type": "Rating", ratingValue: review.rating, bestRating: 5 },
          })),
        }
      : {}),
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

  const knowledgeGuide = getProductKnowledgeGuide(product.category);

  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "หน้าแรก", item: `${siteConfig.url}/` },
      { "@type": "ListItem", position: 2, name: "สินค้า", item: `${siteConfig.url}/products/` },
      {
        "@type": "ListItem",
        position: 3,
        name: product.name,
        item: `${siteConfig.url}/products/${product.slug}/`,
      },
    ],
  };

  return (
    <>
      <JsonLd data={[productSchema, breadcrumbSchema]} />
      <nav
        aria-label="สินค้าที่กำลังดู"
        className="sticky top-[76px] z-30 border-b border-black/[0.07] bg-white/95 backdrop-blur-xl"
      >
        <div className="container-page flex h-14 items-center justify-between gap-3 sm:gap-4">
          <Button asChild variant="ghost" className="-ml-3 shrink-0 text-muted-foreground">
            <Link href="/products/">
              <span aria-hidden="true">←</span>
              สินค้าทั้งหมด
            </Link>
          </Button>
          <p
            title={product.name}
            className="min-w-0 truncate text-right text-sm font-semibold text-neutral-950 sm:text-base"
          >
            {product.name}
          </p>
        </div>
      </nav>
      <section className="bg-white pb-16 pt-6 sm:pb-20 sm:pt-8 lg:pb-24 lg:pt-10">
        <div className="container-page">
          <div className="grid gap-12 lg:grid-cols-[minmax(0,0.72fr)_minmax(0,1.28fr)] lg:gap-20">
            <div className="grid min-w-0 gap-4 lg:sticky lg:top-[132px] lg:self-start">
              <ProductGallery images={gallery} productName={product.name} model={product.model} countSession />
              <div className="rounded-2xl border border-black/10 bg-neutral-950 p-7 text-white">
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-red-400">Product overview</p>
                <p className="mt-8 text-5xl font-bold tracking-[-0.06em] text-white/10">{product.model}</p>
                <dl className="mt-10 divide-y divide-white/10 border-y border-white/10 text-sm">
                  <div className="flex justify-between gap-4 py-4">
                    <dt className="text-white/45">หมวดสินค้า</dt>
                    <dd className="font-semibold">{product.category}</dd>
                  </div>
                  <div className="flex justify-between gap-4 py-4">
                    <dt className="text-white/45">รุ่น</dt>
                    <dd className="font-semibold">{product.model}</dd>
                  </div>
                  <div className="flex justify-between gap-4 py-4">
                    <dt className="text-white/45">ระยะสัญญา</dt>
                    <dd className="font-semibold">
                      {product.contractMonths ? `${product.contractMonths} งวด` : "สอบถามล่าสุด"}
                    </dd>
                  </div>
                </dl>
              </div>
            </div>
            <div>
              <Badge className="bg-neutral-950">{product.category}</Badge>
              <p className="mt-5 text-sm font-bold uppercase tracking-[0.18em] text-red-700">
                {product.model}
              </p>
              <h1 className="mt-3 text-4xl font-bold leading-tight text-neutral-950 sm:text-5xl">
                {product.name}
              </h1>
              <p className="mt-6 text-lg leading-8 text-muted-foreground">{product.description}</p>

              {product.monthlyPrice !== null ? (
                <div className="mt-8 rounded-2xl border border-red-100 bg-red-50 p-6">
                  <p className="text-sm text-red-800">เริ่มต้น</p>
                  <p className="mt-1 text-4xl font-bold text-red-700">
                    ฿{product.monthlyPrice.toLocaleString("th-TH")}
                    <span className="text-base font-medium">/เดือน</span>
                  </p>
                </div>
              ) : null}

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

              <div className="mt-9">
                <Button asChild size="lg" className="rounded-full bg-red-600 px-7 hover:bg-red-700">
                  <a href={siteConfig.lineUrl} target="_blank" rel="noreferrer">
                    สอบถามรุ่นนี้
                  </a>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {specificationRecord ? (
        <ProductSpecifications model={product.model} record={specificationRecord} />
      ) : null}

      {knowledgeGuide ? (
        <section
          className="section-space border-y border-black/10 bg-[#f4f1ed]"
          aria-labelledby="product-knowledge-title"
        >
          <div className="container-page">
            <div className="grid gap-10 lg:grid-cols-[0.78fr_1.22fr] lg:gap-20">
              <div>
                <p className="eyebrow">คู่มือเลือก {knowledgeGuide.category}</p>
                <h2
                  id="product-knowledge-title"
                  className="mt-4 text-3xl font-bold leading-tight text-neutral-950 sm:text-4xl"
                >
                  ข้อมูลที่ควรรู้ก่อนตัดสินใจ
                </h2>
                <p className="mt-5 leading-8 text-neutral-600">{knowledgeGuide.summary}</p>
                <div className="mt-6 flex flex-wrap gap-2">
                  {knowledgeGuide.highlights.map((highlight) => (
                    <span
                      key={highlight}
                      className="rounded-full border border-black/10 bg-white px-3 py-1.5 text-xs font-semibold text-neutral-700"
                    >
                      {highlight}
                    </span>
                  ))}
                </div>
              </div>

              <div className="grid gap-5 sm:grid-cols-2">
                <article className="rounded-2xl border border-black/10 bg-white p-6">
                  <h3 className="text-lg font-bold text-neutral-950">เช็กก่อนเลือก</h3>
                  <ul className="mt-4 grid gap-3">
                    {knowledgeGuide.selectionCriteria.map((item) => (
                      <li key={item} className="flex gap-3 text-sm leading-6 text-neutral-600">
                        <span aria-hidden="true" className="font-bold text-red-700">
                          ✓
                        </span>
                        {item}
                      </li>
                    ))}
                  </ul>
                </article>
                <article className="rounded-2xl border border-black/10 bg-white p-6">
                  <h3 className="text-lg font-bold text-neutral-950">ติดตั้งและดูแล</h3>
                  <ul className="mt-4 grid gap-3">
                    {knowledgeGuide.installation.map((item) => (
                      <li key={item} className="flex gap-3 text-sm leading-6 text-neutral-600">
                        <span aria-hidden="true" className="font-bold text-red-700">
                          •
                        </span>
                        {item}
                      </li>
                    ))}
                  </ul>
                  <p className="mt-4 border-t border-black/10 pt-4 text-sm leading-6 text-neutral-600">
                    {knowledgeGuide.care}
                  </p>
                </article>
              </div>
            </div>
          </div>
        </section>
      ) : null}

      {product.reviews?.length ? (
        <section className="section-space bg-white" aria-labelledby="customer-reviews-title">
          <div className="container-page">
            <div className="flex flex-col justify-between gap-6 border-b border-black/10 pb-8 md:flex-row md:items-end">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-red-700">
                  Verified customer voices
                </p>
                <h2
                  id="customer-reviews-title"
                  className="mt-3 text-3xl font-bold text-neutral-950 sm:text-4xl"
                >
                  รีวิวจากผู้ใช้งานจริง
                </h2>
                <p className="mt-4 max-w-2xl text-sm leading-6 text-neutral-500">
                  ความคิดเห็นจากลูกค้าที่เลือกใช้ WashTower™ กับเราในชีวิตประจำวัน
                </p>
              </div>
              <div className="rounded-2xl bg-neutral-950 px-6 py-5 text-white">
                <p className="text-3xl font-black">
                  {(
                    product.reviews.reduce((total, review) => total + review.rating, 0) /
                    product.reviews.length
                  ).toFixed(1)}
                  <span className="ml-2 text-lg tracking-[0.08em] text-amber-300">★★★★★</span>
                </p>
                <p className="mt-1 text-xs text-white/55">จาก {product.reviews.length} รีวิวของลูกค้า</p>
              </div>
            </div>

            <div className="mt-8 grid gap-5 lg:grid-cols-3">
              {product.reviews.map((review) => (
                <article
                  key={`${review.reviewer}-${review.title}`}
                  className="flex flex-col rounded-2xl border border-black/10 bg-[#faf9f7] p-7"
                >
                  <div className="flex items-center justify-between gap-4">
                    <p className="font-bold text-neutral-950">{review.reviewer}</p>
                    <p className="tracking-[0.12em] text-amber-500" aria-label={`${review.rating} จาก 5 ดาว`}>
                      {"★".repeat(review.rating)}
                      <span className="text-neutral-300">{"★".repeat(5 - review.rating)}</span>
                    </p>
                  </div>
                  <h3 className="mt-6 text-xl font-bold leading-7 text-neutral-950">{review.title}</h3>
                  <p className="mt-3 text-sm leading-7 text-neutral-600">“{review.summary}”</p>
                  <p className="mt-auto border-t border-black/10 pt-5 text-xs font-medium text-neutral-400">
                    {review.context}
                  </p>
                </article>
              ))}
            </div>
          </div>
        </section>
      ) : null}

      <section className="section-space bg-neutral-950 text-white">
        <div className="container-page grid gap-6 md:grid-cols-3">
          {[
            {
              icon: "/images/generated/icon-protection-v1.webp",
              title:
                product.warrantyYears !== null
                  ? `คุ้มครองสูงสุด ${product.warrantyYears} ปี`
                  : "ระยะคุ้มครองตามแพ็กเกจ",
              text: "ระยะจริงขึ้นอยู่กับรุ่นและแพ็กเกจ",
            },
            {
              icon: "/images/generated/icon-expert-care-v1.webp",
              title: "บริการซ่อมบำรุง",
              text: "ตามรายการและรอบบริการในสัญญา",
            },
            {
              icon: "/images/generated/icon-document-v1.webp",
              title:
                product.contractMonths !== null
                  ? `${product.contractMonths} งวดในภาพอ้างอิง`
                  : "จำนวนงวดตามแบบฟอร์มคำสั่งซื้อ",
              text: "ตรวจสอบระยะเวลาจริงก่อนลงนาม",
            },
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
