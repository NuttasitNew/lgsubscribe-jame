import "server-only";
import { generateSeoArticleFromBrief } from "./generate-seo-article-drafts.helper";
import type { SeoArticleJobRunner } from "./seo-article-job-runner.type";
import type { SeoArticleTone } from "../constant/seo-article-tone";
import type { SeoArticleWriteNowPayload } from "../type/seo-article-job-payload.type";

/**
 * @description runner ของงาน WRITE_NOW — ปุ่ม "สร้างร่างทันที" และ "สั่งเขียนเอง" บนหน้า hub
 * @logic
 * - ไม่มี promptBrief → error (lg-jame ไม่มีโหมดร่างจากแชท)
 * - มี promptBrief → โหมด MANUAL: ข้ามแชททั้งหมด เขียนตามโจทย์ + บันทึก origin=MANUAL
 * - โหมดแชทอาจไม่ได้บทความเลย (ไม่มีหัวข้อที่คุ้ม) ซึ่ง **ไม่ใช่ความพัง** → คืน output เปล่า ๆ ให้ job เป็น DONE
 *   ผู้ใช้เห็นบนแถบสถานะว่างานจบแล้วแต่ไม่มีเรื่องใหม่ ดีกว่าทำเป็น FAILED แล้วชวนให้กดสั่งซ้ำเรื่อย ๆ
 * @param job แถวงานในคิว (อ่านโจทย์จาก payload, tone/generateImages จากคอลัมน์ปกติ)
 * @returns บทความเรื่องแรกที่เขียนได้ (โหมดแชทอาจได้หลายเรื่อง — ใช้เรื่องแรกเป็นตัวแทนในข้อความแจ้ง)
 * @used-by {@link ./run-seo-article-job.helper.ts}
 * @related {@link ./generate-seo-article-drafts.helper.ts}
 */
export const runWriteNowJob: SeoArticleJobRunner = async (job) => {
  const payload = (job.payload ?? {}) as SeoArticleWriteNowPayload;
  const promptBrief = payload.promptBrief?.trim();

  if (promptBrief) {
    const created = await generateSeoArticleFromBrief({
      brief: {
        promptBrief,
        ...(payload.targetKeyword ? { targetKeyword: payload.targetKeyword } : {}),
        ...(payload.category ? { category: payload.category } : {}),
        ...(job.tone ? { tone: job.tone as SeoArticleTone } : {}),
      },
      generateImages: job.generateImages,
      requestedBy: job.requestedBy,
    });

    return { seoArticleId: created.seoArticleId, title: created.title };
  }

  // lg-jame ไม่มีโหมด "ร่างจากแชทเมื่อวาน" — งาน WRITE_NOW ต้องมีโจทย์เสมอ
  throw new Error("[SEO-NOW-01] ต้องพิมพ์โจทย์บทความก่อนสั่งเขียน");
};
