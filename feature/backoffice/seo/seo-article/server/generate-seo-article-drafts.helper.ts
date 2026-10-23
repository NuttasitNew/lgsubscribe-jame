import "server-only";
import prisma from "@/lib/seo/prisma";
import { SeoArticleJobType, SeoArticleOrigin, SeoArticleStatus } from "@prisma/client";
import { getSeoArticleAi } from "./seo-article-ai-model";
import { enqueueSeoArticleJob } from "./enqueue-seo-article-job.helper";
import { resolveSeoArticleSlug } from "./resolve-seo-article-slug.helper";
import { writeSeoArticle, type SeoArticleBriefInput } from "./write-seo-article.helper";
import type { SeoSourceTopic } from "../type/seo-article-content.type";
import type { SeoCategoryGrounding } from "../type/category-grounding.type";
import { SEO_ARTICLE_BLOCK_VERSION, type SeoArticleBlockContent } from "../type/seo-article-block.type";


/**
 * @description สั่ง AI เขียนบทความจากโจทย์ที่ super-admin พิมพ์เอง (ไม่ผ่านแชท) — บันทึกเป็น DRAFT origin=MANUAL
 * @logic
 * - ไม่แตะ LineMessage เลย และไม่มี guard วันซ้ำ (สั่งกี่รอบก็ได้) — คนกดเป็นคนคุมเอง
 * - `sourceDate` ใช้วันที่กดสั่ง (เวลาไทย) เพื่อให้เรียงในหน้ารีวิวได้ตามปกติ
 *   guard ของ cron กรอง origin=CHAT อยู่แล้ว จึงไม่ทำให้ cron วันถัดไป skip
 * - `promptBrief` เก็บโจทย์ดิบไว้ดูย้อนหลังว่าสั่งอะไรไป (ใช้ debug คุณภาพบทความ)
 * - gen รูปเป็น opt-in (default ปิด) เพราะรูป 3 ใบ ≈ ค่า API ที่ไม่ควรเสียตอนลองสั่งเล่น
 * @param params โจทย์ + ตัวเลือกจากฟอร์ม
 * @returns บทความที่สร้าง
 * @used-by {@link ./generate-seo-article-now.action.ts}
 * @related {@link ./write-seo-article.helper.ts}
 */
export const generateSeoArticleFromBrief = async (params: {
  brief: SeoArticleBriefInput;
  generateImages?: boolean;
  requestedBy?: string;
}): Promise<{ seoArticleId: number; slug: string; title: string }> => {
  const todayThai = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Bangkok" }).format(new Date());

  // หัวข้อตั้งต้นสำหรับโหมด MANUAL = โจทย์ที่ผู้ใช้พิมพ์ (count 0 = ไม่ได้มาจากแชท)
  const topic: SeoSourceTopic = {
    topic: params.brief.promptBrief,
    count: 0,
    keywords: params.brief.targetKeyword ? [params.brief.targetKeyword] : [],
    ...(params.brief.targetKeyword ? { targetKeyword: params.brief.targetKeyword } : {}),
  };

  return createSeoArticleDraft({
    topic,
    brief: params.brief,
    sourceDate: todayThai,
    origin: SeoArticleOrigin.MANUAL,
    withImages: params.generateImages ?? false,
    ...(params.requestedBy ? { requestedBy: params.requestedBy } : {}),
  });
};

/**
 * @description สั่ง AI เขียนบทความจากหัวข้อที่เลือกในหมวดบริการ พร้อมแฟ้มข้อมูลจริงของหมวด — บันทึกเป็น DRAFT origin=CATEGORY
 * @logic
 * - ต่างจากโหมด MANUAL ตรงที่แนบ `grounding` (บริการจริง/ช่วงราคา/คำค้นที่เผาเงิน/เขตที่ไปบ่อย) เข้า prompt
 *   → บทความอ้างของจริงของบริษัทได้ และปลดล็อกให้พูดเรื่องราคาได้เฉพาะเมื่อมีราคาป้ายจริงรองรับ
 * - origin=CATEGORY แยกจาก MANUAL เพื่อให้ดูย้อนหลังได้ว่าบทความไหนมาจากทางไหน
 *   (guard กัน cron รันซ้ำนับเฉพาะ CHAT อยู่แล้ว ทั้งสองแบบจึงไม่ไปรบกวน cron)
 * - `promptBrief` เก็บหัวข้อ + ชื่อหมวด ไว้ดูย้อนหลังว่าสั่งอะไรไป
 * @param params หัวข้อที่เลือก + แฟ้มข้อมูลจริง + ตัวเลือกจากฟอร์ม
 * @returns บทความที่สร้าง
 * @used-by {@link ./run-seo-article-job.helper.ts}
 * @related {@link ./build-category-grounding.helper.ts}, {@link ./write-seo-article.helper.ts}
 */
export const generateSeoArticleFromCategory = async (params: {
  topic: string;
  targetKeyword?: string;
  tone?: SeoArticleBriefInput["tone"];
  grounding: SeoCategoryGrounding;
  generateImages?: boolean;
  requestedBy?: string;
}): Promise<{ seoArticleId: number; slug: string; title: string }> => {
  const todayThai = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Bangkok" }).format(new Date());

  const sourceTopic: SeoSourceTopic = {
    topic: params.topic,
    count: 0, // ไม่ได้มาจากแชท จึงไม่มียอดถามจากลูกค้า
    keywords: params.targetKeyword ? [params.targetKeyword] : [],
    ...(params.targetKeyword ? { targetKeyword: params.targetKeyword } : {}),
  };

  return createSeoArticleDraft({
    topic: sourceTopic,
    brief: {
      promptBrief:
        `[หมวด ${params.grounding.categoryName}` +
        `${params.grounding.subcategoryNames?.length ? ` / กลุ่ม ${params.grounding.subcategoryNames.join(", ")}` : ""}] ${params.topic}`,
      ...(params.targetKeyword ? { targetKeyword: params.targetKeyword } : {}),
      ...(params.tone ? { tone: params.tone } : {}),
      grounding: params.grounding,
    },
    sourceDate: todayThai,
    origin: SeoArticleOrigin.CATEGORY,
    withImages: params.generateImages ?? false,
    ...(params.requestedBy ? { requestedBy: params.requestedBy } : {}),
  });
};

/**
 * @description แกนร่วมของทั้ง 3 ทาง (cron จากแชท / สั่งเขียนเอง / สั่งตามหมวด) — เขียนบทความ → หา slug ว่าง → บันทึก DRAFT → โยนงานรูป/แปลเข้าคิว
 * @logic
 * - หา slug ด้วย resolveSeoArticleSlug (วนเติม -2/-3 จนว่างจริง) แทนการเติม suffix ครั้งเดียว
 *   ที่ยังชน `@unique` ได้แล้วทำให้บทความที่เพิ่งเขียนเสร็จหายทั้งเรื่อง
 * - **บันทึกบทความให้จบก่อนเสมอ แล้วค่อยวาดรูป/แปล EN ผ่านคิว** (`SeoArticleJob`)
 *   เดิมทำครบทุกอย่างใน request เดียว = 4-5 นาที ชนเพดาน Vercel 300 วิ ทุกวันตั้งแต่ 26 ก.ค. 2026
 *   และวันที่ 31 ก.ค. ตกขอบจริง: รูปวาดเสร็จขึ้น R2 ครบแล้ว แต่ lambda ถูกฆ่าก่อนเขียน DB = เสียทั้งบทความและค่ารูป
 *   ตอนนี้ต่อให้คิวพังทั้งเส้น บทความก็อยู่ในฐานแล้ว กดสร้างรูป/แปลซ้ำจากหน้ารีวิวได้
 * - งานรูปเป็นคนต่อคิวงานแปลเอง (`translateAfter`) เพราะต้องแปล **หลัง** รูปลงเนื้อหาแล้ว
 *   ไม่งั้นฉบับ EN จะไม่มีบล็อกรูปและถูกตีเป็น "ล้าสมัย" ตั้งแต่วินาทีที่รูปเสร็จ
 * - ไม่ gen รูป → ต่อคิวงานแปลตรง ๆ ได้เลย
 * - เข้าคิวไม่สำเร็จไม่ล้มการสร้างบทความ — แค่ log ไว้ บทความยังใช้งานได้และสั่งซ้ำได้จากหน้ารีวิว
 * @param params topic/brief/sourceDate/origin/withImages/requestedBy
 * @returns บทความที่สร้าง
 * @used-by {@link ./generate-seo-article-drafts.helper.ts}
 * @related {@link ./enqueue-seo-article-job.helper.ts}
 */
const createSeoArticleDraft = async (params: {
  topic: SeoSourceTopic;
  brief?: SeoArticleBriefInput;
  sourceDate: string;
  origin: SeoArticleOrigin;
  withImages: boolean;
  requestedBy?: string;
}): Promise<{ seoArticleId: number; slug: string; title: string }> => {
  const { topic, brief, sourceDate, origin, withImages } = params;
  const requestedBy = params.requestedBy || "ระบบ";

  const article = await writeSeoArticle({ topic, brief });
  if (article.warnings.length > 0) {
    console.error(`[SEO-BLK] บล็อกจาก AI มีปัญหา "${article.title}":`, article.warnings.join(" | "));
  }
  if (article.blocks.length === 0) {
    throw new Error(`[SEO-BLK-01] AI ไม่ได้ส่งเนื้อหาบทความกลับมา (หัวข้อ: ${topic.topic})`);
  }

  const slug = await resolveSeoArticleSlug({
    baseSlug: article.slug,
    isTaken: async (candidate) =>
      Boolean(await prisma.seoArticle.findUnique({ where: { slug: candidate }, select: { seoArticleId: true } })),
  });

  const contentJson: SeoArticleBlockContent = {
    version: SEO_ARTICLE_BLOCK_VERSION,
    category: article.category,
    blocks: article.blocks,
    faq: article.faq,
  };

  const created = await prisma.seoArticle.create({
    data: {
      status: SeoArticleStatus.DRAFT,
      origin,
      ...(brief ? { promptBrief: brief.promptBrief } : {}),
      slug,
      title: article.title,
      metaDescription: article.metaDescription,
      keywords: article.keywords,
      // primary keyword ที่ใช้วัดผล GSC
      targetKeyword: brief?.targetKeyword ?? topic.targetKeyword ?? article.keywords[0] ?? null,
      contentJson: contentJson as unknown as object,
      sourceDate,
      sourceTopics: [topic] as unknown as object,
      aiModel: getSeoArticleAi("writeArticle").label,
    },
    select: { seoArticleId: true, slug: true, title: true },
  });

  // งานหนักที่เหลือทำเบื้องหลัง — บทความอยู่ในฐานแล้ว ต่อให้คิวพังก็ไม่เสียเนื้อหาที่ AI เพิ่งเขียน
  // รูปมาก่อนแล้วค่อยแปล (งานรูปเป็นคนต่อคิวงานแปลเอง) — ไม่ gen รูปก็แปลได้ทันที
  const nextJob = withImages
    ? { jobType: SeoArticleJobType.GENERATE_IMAGES, payload: { translateAfter: true } }
    : { jobType: SeoArticleJobType.TRANSLATE_EN };

  const queued = await enqueueSeoArticleJob({
    jobType: nextJob.jobType,
    label: article.title,
    requestedBy,
    seoArticleId: created.seoArticleId,
    ...("payload" in nextJob ? { payload: nextJob.payload } : {}),
  }).catch((error: unknown) => {
    console.error(
      `[SEO-JOBQ-16] ต่อคิวงานหลังเขียนบทความไม่สำเร็จ "${slug}":`,
      error instanceof Error ? error.message : "Unknown"
    );
    return null;
  });

  if (queued?.failed) {
    console.error(`[SEO-JOBQ-16] บทความ "${slug}" บันทึกแล้ว แต่ส่งงาน ${nextJob.jobType} เข้าคิวไม่สำเร็จ`);
  }

  return created;
};
