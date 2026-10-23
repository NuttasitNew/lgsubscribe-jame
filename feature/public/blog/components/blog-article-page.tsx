import Image from "next/image";
import Link from "next/link";
import { ContactCta } from "@/components/contact-cta";
import { JsonLd } from "@/components/json-ld";
import { SEO_ARTICLE_CATEGORY_LABEL } from "@/feature/backoffice/seo/seo-article/components/seo-article-category-label";
import type { HurryWebBlogFileV2 } from "@/feature/backoffice/seo/seo-article/server/build-hurry-web-blog-file.helper";
import { formatThaiDate } from "@/feature/public/blog/lib/blog-dates";
import { siteConfig } from "@/lib/site";

// Section HTML comes from renderBlocksToSections: every text run is escaped and links pass
// toSafeArticleHref, so it contains only the tags that renderer emits (p, h3, ul/ol, table, strong, em, a, hr, blockquote).
const articleBody =
  "text-[1.0625rem] leading-8 text-neutral-700 [&_a]:font-medium [&_a]:text-primary [&_a]:underline [&_a]:underline-offset-4 [&_blockquote]:border-l-4 [&_blockquote]:border-primary/40 [&_blockquote]:pl-4 [&_h3]:mt-8 [&_h3]:text-xl [&_h3]:font-bold [&_h3]:text-neutral-900 [&_hr]:my-8 [&_li]:mt-2 [&_ol]:mt-4 [&_ol]:list-decimal [&_ol]:pl-6 [&_p]:mt-4 [&_strong]:text-neutral-900 [&_table]:mt-5 [&_table]:w-full [&_table]:border-collapse [&_table]:text-sm [&_td]:border [&_td]:border-neutral-200 [&_td]:p-3 [&_th]:border [&_th]:border-neutral-200 [&_th]:bg-neutral-50 [&_th]:p-3 [&_th]:text-left [&_ul]:mt-4 [&_ul]:list-disc [&_ul]:pl-6";

export function BlogArticlePage({ article }: { article: HurryWebBlogFileV2 }) {
  const url = `${siteConfig.url}/blog/${article.slug}/`;
  const schema = [
    {
      "@context": "https://schema.org",
      "@type": "BlogPosting",
      headline: article.title,
      description: article.metaDescription,
      keywords: article.keywords.join(", "),
      datePublished: article.publishedAt,
      dateModified: article.updatedAt,
      ...(article.coverImage ? { image: [article.coverImage] } : {}),
      author: { "@type": "Organization", name: siteConfig.shortName },
      publisher: {
        "@type": "Organization",
        name: siteConfig.shortName,
        logo: { "@type": "ImageObject", url: `${siteConfig.url}/brand/lg-logo.svg` },
      },
      mainEntityOfPage: url,
    },
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "หน้าแรก", item: `${siteConfig.url}/` },
        { "@type": "ListItem", position: 2, name: "บทความ", item: `${siteConfig.url}/blog/` },
        { "@type": "ListItem", position: 3, name: article.title, item: url },
      ],
    },
    ...(article.faq.length > 0
      ? [
          {
            "@context": "https://schema.org",
            "@type": "FAQPage",
            mainEntity: article.faq.map((item) => ({
              "@type": "Question",
              name: item.question,
              acceptedAnswer: { "@type": "Answer", text: item.answer },
            })),
          },
        ]
      : []),
  ];

  return (
    <>
      <JsonLd data={schema} />
      <article>
        <header className="page-hero">
          <div className="container-page max-w-4xl">
            <nav aria-label="breadcrumb" className="text-sm text-white/60">
              <Link href="/blog/" className="hover:text-white">
                บทความ
              </Link>
              <span aria-hidden="true"> / </span>
              <span>{SEO_ARTICLE_CATEGORY_LABEL[article.category]}</span>
            </nav>
            <h1 className="mt-4 text-3xl font-bold leading-tight sm:text-4xl lg:text-5xl">{article.title}</h1>
            <p className="mt-5 text-lg leading-8 text-white/65">{article.metaDescription}</p>
            <p className="mt-5 text-sm text-white/50">
              เผยแพร่ {formatThaiDate(article.publishedAt)}
              {article.updatedAt !== article.publishedAt && ` · ปรับปรุง ${formatThaiDate(article.updatedAt)}`}
            </p>
          </div>
        </header>

        <div className="section-space bg-white">
          <div className="container-page max-w-3xl">
            {article.coverImage && (
              <div className="relative mb-10 aspect-[3/2] overflow-hidden rounded-2xl bg-neutral-100">
                <Image
                  src={article.coverImage}
                  alt={article.coverImageAlt ?? article.title}
                  fill
                  priority
                  sizes="(min-width: 768px) 768px, 100vw"
                  quality={75}
                  className="object-cover"
                />
              </div>
            )}

            {article.sections.map((section, index) => (
              <section key={index} className={index > 0 ? "mt-12" : undefined}>
                {section.heading && <h2 className="text-2xl font-bold text-neutral-900 sm:text-3xl">{section.heading}</h2>}
                {section.image && (
                  <div className="relative mt-6 aspect-[3/2] overflow-hidden rounded-xl bg-neutral-100">
                    <Image
                      src={section.image.url}
                      alt={section.image.alt}
                      fill
                      sizes="(min-width: 768px) 768px, 100vw"
                      quality={75}
                      className="object-cover"
                    />
                  </div>
                )}
                <div className={articleBody} dangerouslySetInnerHTML={{ __html: section.html }} />
              </section>
            ))}

            {article.faq.length > 0 && (
              <section className="mt-14 rounded-2xl border border-neutral-200 bg-neutral-50 p-6 sm:p-8">
                <h2 className="text-2xl font-bold text-neutral-900">คำถามที่พบบ่อย</h2>
                <dl className="mt-6 space-y-6">
                  {article.faq.map((item) => (
                    <div key={item.question}>
                      <dt className="font-semibold text-neutral-900">{item.question}</dt>
                      <dd className="mt-2 whitespace-pre-line leading-7 text-neutral-700">{item.answer}</dd>
                    </div>
                  ))}
                </dl>
              </section>
            )}
          </div>
        </div>
      </article>
      <ContactCta />
    </>
  );
}
