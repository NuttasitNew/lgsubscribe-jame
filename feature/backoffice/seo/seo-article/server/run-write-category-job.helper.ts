import "server-only";
import { buildCategoryGrounding } from "./build-category-grounding.helper";
import { generateSeoArticleFromCategory } from "./generate-seo-article-drafts.helper";
import type { SeoArticleJobRunner } from "./seo-article-job-runner.type";
import type { SeoArticleTone } from "../constant/seo-article-tone";
import type { SeoArticleWriteCategoryPayload } from "../type/seo-article-job-payload.type";

/**
 * @description runner ของงาน WRITE_CATEGORY — เขียนบทความ 1 เรื่องจากหัวข้อที่ติ๊กเลือกในหมวดบริการ
 * @logic
 * - อ่านข้อมูลจริงของหมวด (บริการ/คำค้น Ads/คำที่เกือบติดหน้าแรก) มาเป็น grounding แล้วให้ AI เขียน
 * - หมวดถูกลบระหว่างรอคิวได้ (คิวอาจค้างเป็นชั่วโมง) → โยน error ที่บอกสาเหตุจริงให้คนอ่านเข้าใจ
 * @param job แถวงานในคิว (ใช้ categoryCode / topic / targetKeyword / tone / generateImages)
 * @returns บทความที่เขียนได้
 * @used-by {@link ./run-seo-article-job.helper.ts}
 * @related {@link ./build-category-grounding.helper.ts}
 */
export const runWriteCategoryJob: SeoArticleJobRunner = async (job) => {
  if (!job.categoryCode) {
    throw new Error(`[SEO-JOB-10] งานเขียนตามหมวดไม่มี categoryCode job=${job.seoArticleJobId}`);
  }

  const payload = (job.payload ?? {}) as unknown as Partial<SeoArticleWriteCategoryPayload>;
  if (payload.subcategoryNames != null && !Array.isArray(payload.subcategoryNames)) {
    throw new Error(`[SEO-JOB-11] payload กลุ่มบริการย่อยไม่ถูกต้อง job=${job.seoArticleJobId}`);
  }
  const subcategoryNames = [
    ...(payload.subcategoryNames ?? []),
    ...(payload.subcategoryName ? [payload.subcategoryName] : []),
  ];
  const normalizedSubcategoryNames = [...new Set(subcategoryNames.map((name) => name.trim()).filter(Boolean))];
  const grounding = await buildCategoryGrounding(job.categoryCode, normalizedSubcategoryNames);
  if (!grounding) {
    throw new Error(
      normalizedSubcategoryNames.length > 0
        ? `[SEO-JOB-02] ไม่พบกลุ่มบริการย่อย (${normalizedSubcategoryNames.join(", ")}) ในหมวด "${job.categoryCode}" แล้ว`
        : `[SEO-JOB-02] ไม่พบหมวดหมู่บริการ "${job.categoryCode}" แล้ว (อาจถูกลบไประหว่างรอคิว)`
    );
  }

  const created = await generateSeoArticleFromCategory({
    topic: job.topic,
    ...(job.targetKeyword ? { targetKeyword: job.targetKeyword } : {}),
    ...(job.tone ? { tone: job.tone as SeoArticleTone } : {}),
    grounding,
    generateImages: job.generateImages,
    requestedBy: job.requestedBy,
  });

  return { seoArticleId: created.seoArticleId, title: created.title };
};
