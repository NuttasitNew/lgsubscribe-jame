import "server-only";

import { revalidatePath } from "next/cache";
import { SeoArticleStatus, type SeoArticle } from "@prisma/client";

import prisma from "@/lib/seo/prisma";
import { seoArticleBlockContentSchema } from "../constant/seo-article-block-schema";
import { convertLegacyArticle } from "../helper/convert-legacy-article.helper";
import { isBlockArticleContent, isLegacyArticleContent } from "../helper/is-legacy-article-content.helper";
import type { SeoArticleBlockContent } from "../type/seo-article-block.type";
import { buildHurryWebBlogFile, type BuildHurryWebBlogFileResult } from "./build-hurry-web-blog-file.helper";
import { renderBlocksToSections } from "./render-blocks-to-sections.helper";

/**
 * lg-jame serves published articles straight from the database (hmp-frontend pushed a JSON
 * file to another repo instead). The public /blog page and the publish action both go through
 * buildPublicBlogArticle, so an article that passes publish validation renders the same way.
 */

const bangkokDate = (date: Date) => new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Bangkok" }).format(date);

export type NormalizeArticleContentResult =
  | { success: true; content: SeoArticleBlockContent }
  | { success: false; detail: string };

/** Converts legacy v1 content to blocks and validates v2 content against the block schema. */
export function normalizeArticleContent(raw: unknown): NormalizeArticleContentResult {
  if (isLegacyArticleContent(raw)) return { success: true, content: convertLegacyArticle(raw).content };
  if (!isBlockArticleContent(raw)) return { success: false, detail: "โครงเนื้อหาอ่านไม่ได้" };
  const parsed = seoArticleBlockContentSchema.safeParse(raw);
  if (parsed.success) return { success: true, content: parsed.data };
  const issue = parsed.error.issues[0];
  return { success: false, detail: issue ? `${issue.path.join(".")}: ${issue.message}` : "โครงเนื้อหาไม่ตรงสเปก" };
}

type PublicArticleSource = Pick<
  SeoArticle,
  | "slug"
  | "title"
  | "metaDescription"
  | "keywords"
  | "titleEn"
  | "metaDescriptionEn"
  | "keywordsEn"
  | "contentJson"
  | "contentJsonEn"
  | "publishedAt"
  | "contentUpdatedAt"
>;

/** Builds the validated page payload (sections HTML is escaped by renderBlocksToSections). */
export function buildPublicBlogArticle(article: PublicArticleSource, now = new Date()): BuildHurryWebBlogFileResult {
  const normalized = normalizeArticleContent(article.contentJson);
  if (!normalized.success) return { success: false, detail: normalized.detail };

  let contentEn: SeoArticleBlockContent | null = null;
  if (article.contentJsonEn) {
    const parsedEn = seoArticleBlockContentSchema.safeParse(article.contentJsonEn);
    if (parsedEn.success) contentEn = parsedEn.data;
  }

  const rendered = renderBlocksToSections(normalized.content.blocks);
  return buildHurryWebBlogFile({
    article,
    content: normalized.content,
    sections: rendered.sections,
    contentEn,
    existingPublishedAt: bangkokDate(article.publishedAt ?? now),
    today: bangkokDate(article.contentUpdatedAt ?? now),
  });
}

const publicSelect = {
  slug: true,
  title: true,
  metaDescription: true,
  keywords: true,
  titleEn: true,
  metaDescriptionEn: true,
  keywordsEn: true,
  contentJson: true,
  contentJsonEn: true,
  publishedAt: true,
  contentUpdatedAt: true,
} as const;

export async function findPublishedBlogArticle(slug: string) {
  const article = await prisma.seoArticle.findFirst({
    where: { slug, status: SeoArticleStatus.PUBLISHED, deletedAt: null },
    select: publicSelect,
  });
  if (!article) return null;
  const built = buildPublicBlogArticle(article);
  return built.success ? built.data : null;
}

export async function listPublishedBlogArticles() {
  const articles = await prisma.seoArticle.findMany({
    where: { status: SeoArticleStatus.PUBLISHED, deletedAt: null },
    orderBy: { publishedAt: "desc" },
    select: publicSelect,
  });
  return articles.flatMap((article) => {
    const built = buildPublicBlogArticle(article);
    return built.success ? [built.data] : [];
  });
}

/**
 * Article list for pages cached until the next publish (`revalidate = false`).
 * At runtime a database error is rethrown so Next keeps serving the last good page instead of
 * caching an empty list forever; only during `next build` (no prior page exists) it falls back to [].
 */
export async function listPublishedBlogArticlesForCachedPage(label: string) {
  try {
    return await listPublishedBlogArticles();
  } catch (error) {
    if (process.env.NEXT_PHASE !== "phase-production-build") throw error;
    console.error(`${label}: blog articles unavailable during build`, error instanceof Error ? error.message : error);
    return [];
  }
}

/** Refreshes the cached public pages after publish / edit / delete. */
export function revalidateBlog(slug?: string) {
  revalidatePath("/blog/");
  if (slug) revalidatePath(`/blog/${slug}/`);
  revalidatePath("/sitemap.xml");
}
