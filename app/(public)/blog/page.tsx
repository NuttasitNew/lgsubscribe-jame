import type { Metadata } from "next";
import { BlogIndexPage } from "@/feature/public/blog/components/blog-index-page";
import { listPublishedBlogArticles } from "@/feature/backoffice/seo/seo-article/server/public-blog-article.helper";
import { createPageMetadata } from "@/lib/site";

// Articles come from the database; publishing in the backoffice calls revalidatePath("/blog/").
export const revalidate = 3600;

export const metadata: Metadata = createPageMetadata({
  title: "บทความ LG Subscribe | วิธีเลือกและดูแลเครื่องใช้ไฟฟ้า LG",
  description: "รวมบทความวิธีเลือกรุ่น การดูแลเครื่องใช้ไฟฟ้า LG และสิ่งที่ควรรู้ก่อนสมัครเช่าใช้ LG Subscribe",
  path: "/blog/",
});

export default async function BlogPage() {
  // Keep the page up during a database outage; the next revalidate or publish refills it.
  const articles = await listPublishedBlogArticles().catch((error: unknown) => {
    console.error("blog: articles unavailable", error instanceof Error ? error.message : error);
    return [];
  });
  return <BlogIndexPage articles={articles} />;
}
