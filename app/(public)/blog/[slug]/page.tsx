import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { BlogArticlePage } from "@/feature/public/blog/components/blog-article-page";
import { findPublishedBlogArticle } from "@/feature/backoffice/seo/seo-article/server/public-blog-article.helper";
import { createPageMetadata } from "@/lib/site";

// Rendered on first request and cached until publish / edit / delete in the backoffice revalidates the path.
export const revalidate = false;
export const dynamicParams = true;

export function generateStaticParams() {
  return [];
}

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const article = await findPublishedBlogArticle(slug);
  if (!article) return {};
  const metadata = createPageMetadata({
    title: article.title,
    description: article.metaDescription,
    path: `/blog/${article.slug}/`,
    ...(article.coverImage ? { image: article.coverImage } : {}),
  });
  return {
    ...metadata,
    keywords: article.keywords,
    openGraph: {
      ...metadata.openGraph,
      type: "article",
      publishedTime: article.publishedAt,
      modifiedTime: article.updatedAt,
    },
  };
}

export default async function BlogArticleRoute({ params }: Props) {
  const { slug } = await params;
  const article = await findPublishedBlogArticle(slug);
  if (!article) notFound();
  return <BlogArticlePage article={article} />;
}
