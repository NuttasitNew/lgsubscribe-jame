import "server-only";
import prisma from "@/lib/seo/prisma";
import { SeoArticleJobType, SeoArticleStatus } from "@prisma/client";
import { revalidateBlog } from "./public-blog-article.helper";
import { generateArticleImages } from "./generate-article-images.helper";
import { enqueueSeoArticleJob } from "./enqueue-seo-article-job.helper";
import { removeArticleImageBlocks } from "./article-image-blocks.helper";
import { convertLegacyArticle } from "../helper/convert-legacy-article.helper";
import { isLegacyArticleContent } from "../helper/is-legacy-article-content.helper";
import { restoreArticleCoverImage } from "../helper/restore-article-cover-image.helper";
import type { SeoArticleJobRunner } from "./seo-article-job-runner.type";
import type { SeoArticleBlockContent } from "../type/seo-article-block.type";
import type { SeoArticleGenerateImagesPayload } from "../type/seo-article-job-payload.type";
import { siteConfig } from "@/lib/site";
import { findArticleProductImageUrls } from "./find-article-product-images.helper";

/** path รูปใน public/ → URL เต็มบนเว็บจริง (OpenAI ต้องโหลดรูปจาก URL; บน Vercel ไฟล์ public ไม่อยู่ใน function) */
const toAbsoluteSiteUrls = (paths?: string[]) =>
  (paths ?? []).filter((path) => path.startsWith("/")).map((path) => `${siteConfig.url}${path}`);

/**
 * @description runner ของงาน GENERATE_IMAGES — gen รูปปก + รูปแทรกใหม่ยกชุด (gpt-image-2.5-sunburst → R2) ให้บทความเดิม
 * @logic
 * 1. ล้างรูปเดิมใน "ก้อน input ที่ส่งเข้า gen" เท่านั้น เพื่อข้าม guard กันสร้างซ้ำ — DB ยังไม่ถูกแตะ
 *    ⚠️ ปกเดิมถูกเก็บไว้เสมอ ถ้า job ปกพัง (rejected) จะคืนค่าเดิมกลับ [SEO-IMG-07]
 *    ไม่งั้นบทความที่ Google index แล้วจะเสีย og:image + JSON-LD image + การ์ดแชร์ LINE/FB ถาวร
 * 2. gen เสร็จค่อย UPDATE contentJson ครั้งเดียว
 * 2.5 `payload.translateAfter` (บทความที่เพิ่งถูกเขียนใหม่) → ต่อคิวงานแปล EN ทันทีที่รูปลงเนื้อหาแล้ว
 *    ต้องเป็นลำดับนี้เท่านั้น: แปลก่อนมีรูป = ฉบับ EN ไม่มีบล็อกรูปและ hash ไม่ตรงตั้งแต่วินาทีแรก
 * 3. DRAFT: จบแค่ DB (รูปจะขึ้นเว็บตอนกดเผยแพร่)
 * 4. PUBLISHED: push ไฟล์ทับบน hurry-web ด้วย (ไม่งั้นรูปใหม่อยู่แค่ใน DB เว็บยังเป็นรูปเก่า)
 *    — ประกอบไฟล์ทีละ field ด้วย buildHurryWebBlogFile ตัวเดียวกับ publish (ห้าม spread ไฟล์เดิม
 *      ไม่งั้น `blocks` เก่าติดมาแล้วไม่ถูกอัปเดต → เว็บอ่าน blocks ชนะ sections = รูปใหม่ไม่ขึ้น)
 *    — ดึงจากไฟล์เดิมแค่ publishedAt ไม่ให้วันที่เผยแพร่เพี้ยน แล้วอัป publishedCommitSha
 *    — push พังไม่ rollback รูปใน DB (กดซ้ำได้) แต่โยน error ให้ job เป็น FAILED พร้อมเหตุที่ชัด
 * @param job แถวงานในคิว (ใช้ seoArticleId + requestedBy สำหรับข้อความ commit)
 * @returns บทความที่ถูกใส่รูปใหม่
 * @used-by {@link ./run-seo-article-job.helper.ts}
 * @related {@link ./build-hurry-web-blog-file.helper.ts}
 */
export const runGenerateImagesJob: SeoArticleJobRunner = async (job) => {
  if (!job.seoArticleId) {
    throw new Error(`[SEO-IMG-10] งาน gen รูปไม่มี seoArticleId job=${job.seoArticleJobId}`);
  }
  const seoArticleId = job.seoArticleId;

  const article = await prisma.seoArticle.findUnique({ where: { seoArticleId } });
  if (!article) throw new Error("[SEO-IMG-02] ไม่พบบทความ (อาจถูกลบไประหว่างรอคิว)");

  const isPublished = article.status === SeoArticleStatus.PUBLISHED;
  if (article.status !== SeoArticleStatus.DRAFT && !isPublished) {
    throw new Error("[SEO-IMG-03] gen รูปได้เฉพาะร่าง (DRAFT) หรือบทความที่เผยแพร่แล้ว");
  }

  // แถวเก่ายังเป็นโครง v1 (sections + html) → แปลงเป็นบล็อกก่อน แล้วค่อยทำงานบนโครงเดียว
  const raw = article.contentJson as unknown;
  const content: SeoArticleBlockContent = isLegacyArticleContent(raw)
    ? convertLegacyArticle(raw).content
    : (raw as SeoArticleBlockContent);

  // ปกเดิมต้องเก็บไว้ก่อนเสมอ — ถ้า job ปกพังแต่รูปแทรกสำเร็จ ต้องคืนค่าเดิมกลับ
  const previousCoverImage = content.coverImage;
  const previousCoverImageAlt = content.coverImageAlt;

  // ล้างรูปใน input ที่ส่งเข้า generateArticleImages เท่านั้น — ปุ่มนี้คือ "สร้างรูปใหม่ทั้งบทความ"
  // จึงตั้งใจข้าม guard กันซ้ำ (guard อยู่ใน generateArticleImages ซึ่งจะไม่ยิง API ถ้ารูปยังอยู่ครบ)
  const cleared: SeoArticleBlockContent = {
    ...content,
    coverImage: undefined,
    coverImageAlt: undefined,
    blocks: removeArticleImageBlocks(content.blocks ?? []),
  };

  const payload = (job.payload ?? {}) as SeoArticleGenerateImagesPayload;
  const imageResult = await generateArticleImages({
    slug: article.slug,
    title: article.title,
    content: cleared,
    // งานจาก keyword research ส่งรุ่นมาให้ ; กดวาดใหม่จากหน้าแก้ไขไม่มี → หารุ่นจากเนื้อบทความเอง
    productImageUrls: payload.productImagePaths?.length
      ? toAbsoluteSiteUrls(payload.productImagePaths)
      : findArticleProductImageUrls(content),
  });
  if (imageResult.generated === 0) {
    throw new Error(`[SEO-IMG-04] gen รูปไม่สำเร็จ: ${imageResult.errors[0] ?? "Unknown"}`);
  }
  imageResult.errors.forEach((error) => console.error(`[SEO-IMG-04] บางรูปพัง job=${job.seoArticleJobId}: ${error}`));

  // gen ปกพัง (rejected) → คืนปกเดิม ห้ามปล่อยให้ contentJson/ไฟล์บนเว็บไม่มีปก
  const restored = restoreArticleCoverImage(imageResult.content, previousCoverImage, previousCoverImageAlt);
  const nextContent = restored.content;
  if (restored.coverFailed) {
    console.error(
      restored.coverRestored
        ? `[SEO-IMG-07] gen ปกไม่สำเร็จ — คืนปกเดิม ${nextContent.coverImage}`
        : "[SEO-IMG-07] gen ปกไม่สำเร็จ และบทความนี้ไม่มีปกเดิมให้คืน"
    );
  }

  // อัป contentUpdatedAt ด้วย — ถ้ามีร่างค้างอยู่ หน้าแก้ไขต้องรู้ว่าร่างนั้นเก่ากว่าเนื้อจริงแล้ว
  // (ไม่งั้นกดบันทึกร่างเก่าทับ = รูปที่เพิ่ง gen หายทั้งชุด — เคสจริง SEO:9 2026-07-20)
  await prisma.seoArticle.update({
    where: { seoArticleId },
    data: { contentJson: nextContent as object, contentUpdatedAt: new Date() },
  });

  // บทความที่เพิ่งเขียนใหม่สั่ง translateAfter มา — ต่อคิวงานแปลตรงนี้ ไม่ใช่ตอนสร้างบทความ
  // เพราะฉบับ EN ต้องแปลจากเนื้อที่ "มีรูปแล้ว" ไม่งั้นได้ EN ที่ไม่มีบล็อกรูปและถูกตีว่าล้าสมัยทันที
  if (payload.translateAfter) {
    const queued = await enqueueSeoArticleJob({
      jobType: SeoArticleJobType.TRANSLATE_EN,
      label: article.title,
      requestedBy: job.requestedBy,
      seoArticleId,
    }).catch((error: unknown) => {
      console.error(
        `[SEO-JOBQ-17] ต่อคิวงานแปล EN หลังวาดรูปไม่สำเร็จ job=${job.seoArticleJobId}:`,
        error instanceof Error ? error.message : "Unknown"
      );
      return null;
    });
    if (queued?.failed) {
      console.error(`[SEO-JOBQ-17] รูปเสร็จแล้ว แต่ส่งงานแปล EN เข้าคิวไม่สำเร็จ job=${job.seoArticleJobId}`);
    }
  }

  if (!isPublished) return { seoArticleId, title: article.title };

  // เผยแพร่ไปแล้ว → หน้าเว็บอ่านจากฐานข้อมูล แค่ revalidate ให้เห็นรูปชุดใหม่
  revalidateBlog(article.slug);

  return { seoArticleId, title: article.title };
};
