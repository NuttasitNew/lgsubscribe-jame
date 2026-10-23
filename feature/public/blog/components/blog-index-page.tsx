import Image from "next/image";
import Link from "next/link";
import { ContactCta } from "@/components/contact-cta";
import { Card, CardContent } from "@/components/ui/card";
import { SEO_ARTICLE_CATEGORY_LABEL } from "@/feature/backoffice/seo/seo-article/components/seo-article-category-label";
import type { HurryWebBlogFileV2 } from "@/feature/backoffice/seo/seo-article/server/build-hurry-web-blog-file.helper";
import { formatThaiDate } from "@/feature/public/blog/lib/blog-dates";

export function BlogIndexPage({ articles }: { articles: HurryWebBlogFileV2[] }) {
  return (
    <>
      <header className="page-hero">
        <div className="container-page max-w-5xl">
          <p className="text-sm font-bold uppercase tracking-[0.18em] text-red-400">บทความ</p>
          <h1 className="mt-3 text-4xl font-bold sm:text-5xl">ความรู้เครื่องใช้ไฟฟ้า LG และการเช่าใช้</h1>
          <p className="mt-5 max-w-3xl text-lg leading-8 text-white/65">
            วิธีเลือกรุ่นให้เหมาะกับบ้าน การดูแลเครื่อง และสิ่งที่ควรรู้ก่อนสมัคร LG Subscribe
          </p>
        </div>
      </header>

      <section className="section-space">
        <div className="container-page">
          {articles.length === 0 ? (
            <p className="py-10 text-center text-muted-foreground">ยังไม่มีบทความ</p>
          ) : (
            <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {articles.map((article) => (
                <li key={article.slug}>
                  <Link
                    href={`/blog/${article.slug}/`}
                    className="group block h-full rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                  >
                    <Card className="h-full overflow-hidden transition-shadow group-hover:shadow-md">
                      {article.coverImage && (
                        <div className="relative aspect-[3/2] bg-neutral-100">
                          <Image
                            src={article.coverImage}
                            alt={article.coverImageAlt ?? ""}
                            fill
                            sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
                            quality={75}
                            className="object-cover"
                          />
                        </div>
                      )}
                      <CardContent className="space-y-3 p-5">
                        <p className="text-xs font-semibold text-primary">
                          {SEO_ARTICLE_CATEGORY_LABEL[article.category]} · {formatThaiDate(article.publishedAt)}
                        </p>
                        <h2 className="line-clamp-2 text-lg font-bold leading-snug group-hover:text-primary">
                          {article.title}
                        </h2>
                        <p className="line-clamp-3 text-sm leading-6 text-muted-foreground">{article.metaDescription}</p>
                      </CardContent>
                    </Card>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
      <ContactCta />
    </>
  );
}
