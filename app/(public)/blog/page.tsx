import type { Metadata } from "next";
import { BlogIndexPage } from "@/feature/public/blog/components/blog-index-page";
import { listPublishedBlogArticlesForCachedPage } from "@/feature/backoffice/seo/seo-article/server/public-blog-article.helper";
import { createPageMetadata } from "@/lib/site";

// Cached until publish / edit / delete in the backoffice calls revalidatePath("/blog/") — no timed regeneration.
export const revalidate = false;

export const metadata: Metadata = createPageMetadata({
  title: "บทความ LG Subscribe | วิธีเลือกและดูแลเครื่องใช้ไฟฟ้า LG",
  description: "รวมบทความวิธีเลือกรุ่น การดูแลเครื่องใช้ไฟฟ้า LG และสิ่งที่ควรรู้ก่อนสมัครเช่าใช้ LG Subscribe",
  path: "/blog/",
});

export default async function BlogPage() {
  const articles = await listPublishedBlogArticlesForCachedPage("blog");
  return <BlogIndexPage articles={articles} />;
}
