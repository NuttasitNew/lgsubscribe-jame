import "server-only";
import prisma from "@/lib/seo/prisma";
import { seoArticleBlockContentSchema } from "../constant/seo-article-block-schema";
import { convertLegacyArticle } from "../helper/convert-legacy-article.helper";
import { isLegacyArticleContent } from "../helper/is-legacy-article-content.helper";
import { buildArticleEnSourceHash } from "../helper/article-en-source-hash.helper";
import { translateArticleToEn } from "./translate-article-to-en.helper";
import type { SeoArticleJobRunner } from "./seo-article-job-runner.type";
import type { SeoArticleBlockContent } from "../type/seo-article-block.type";

/**
 * @description runner ของงาน TRANSLATE_EN — แปลบทความไทยทั้งเรื่องเป็นอังกฤษแล้วบันทึกลงชุด field EN
 * @logic
 * - แปลจาก **เนื้อไทยในฐาน** เสมอ ไม่ใช่ร่างที่ค้างในหน้า — ฉบับ EN ต้องตรงกับไทยที่บันทึกไว้จริง
 *   (ปุ่มฝั่งหน้าเว็บปิดไว้เมื่อมีร่างค้าง ผู้ใช้จึงต้องกดบันทึกไทยก่อน)
 * - เขียนเฉพาะ field EN + contentEnSourceHash — **ไม่แตะ contentJson ไทยเลย** ต้นฉบับห้ามเปลี่ยนจากการแปล
 * - เก็บ hash ของเนื้อไทยที่แปลมาไว้ด้วย เพื่อให้หน้าแก้ไขรู้ทีหลังว่าฉบับ EN ล้าสมัยหรือยัง
 * - บทความโครงเก่า (v1) แปลงเป็นบล็อกในหน่วยความจำก่อนแปล — ฐานยังเก็บของเดิมไว้เหมือนเดิม
 * - ไม่ push ขึ้นเว็บที่นี่: แปลเสร็จแล้ว push ทันทีจะกลายเป็น deploy เว็บโดยที่ยังไม่มีใครตรวจคำแปล
 * @param job แถวงานในคิว (ใช้ seoArticleId)
 * @returns บทความที่ถูกเติมฉบับ EN
 * @used-by {@link ./run-seo-article-job.helper.ts}
 * @related {@link ./translate-article-to-en.helper.ts}
 */
export const runTranslateEnJob: SeoArticleJobRunner = async (job) => {
  if (!job.seoArticleId) {
    throw new Error(`[SEO-EN-10] งานแปล EN ไม่มี seoArticleId job=${job.seoArticleJobId}`);
  }
  const seoArticleId = job.seoArticleId;

  const article = await prisma.seoArticle.findFirst({ where: { seoArticleId, deletedAt: null } });
  if (!article) throw new Error("[SEO-EN-02] ไม่พบบทความ (อาจถูกลบไประหว่างรอคิว)");

  const raw = article.contentJson as unknown;
  let content: SeoArticleBlockContent;

  if (isLegacyArticleContent(raw)) {
    content = convertLegacyArticle(raw).content;
  } else {
    const parsed = seoArticleBlockContentSchema.safeParse(raw);
    if (!parsed.success) {
      throw new Error(
        `[SEO-EN-03] โครงเนื้อหาของบทความนี้อ่านไม่ได้ — แปลไม่ได้จนกว่าจะแก้ข้อมูล (${parsed.error.issues[0]?.message})`
      );
    }
    content = parsed.data;
  }

  const translated = await translateArticleToEn({
    title: article.title,
    metaDescription: article.metaDescription,
    keywords: article.keywords,
    content,
  });
  translated.warnings.forEach((warning) => console.error(`[SEO-EN-04] job=${job.seoArticleJobId}: ${warning}`));

  await prisma.seoArticle.update({
    where: { seoArticleId },
    data: {
      titleEn: translated.titleEn,
      metaDescriptionEn: translated.metaDescriptionEn,
      keywordsEn: translated.keywordsEn,
      contentJsonEn: translated.contentEn as object,
      contentEnSourceHash: buildArticleEnSourceHash({
        title: article.title,
        metaDescription: article.metaDescription,
        content,
      }),
    },
  });

  return { seoArticleId, title: article.title };
};
