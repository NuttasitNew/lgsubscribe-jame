import "server-only";
import prisma from "@/lib/seo/prisma";
import { SeoArticleImagePlacement, SeoArticleImageStyle } from "@prisma/client";
import { isOpenAiConfigured } from "@/lib/openai/generate-image";
import {
  buildSingleImagePrompt,
  type SingleImagePlacement,
  type SingleImageStyle,
} from "./build-single-image-prompt.helper";
import { buildArticleImageBrief } from "./build-article-image-brief.helper";
import { ARTICLE_IMAGE_SIZE, generateAndUploadArticleImage } from "./generate-and-upload-article-image.helper";
import { withTechnicianReferenceHint } from "./with-technician-reference-hint.helper";
import { recordArticleImage } from "./record-article-image.helper";
import { findArticleProductImageUrls } from "./find-article-product-images.helper";
import { selectBrandReferenceKinds } from "../../brand-profile/helper/select-brand-reference-kinds.helper";
import type { SeoArticleJobRunner } from "./seo-article-job-runner.type";
import type { SeoArticleSingleImagePayload } from "../type/seo-article-job-payload.type";

/**
 * @description runner ของงาน SINGLE_IMAGE — สั่ง AI (gpt-image-2.5-sunburst) วาดรูปประกอบบทความทีละใบ
 * @logic
 * - **ห้ามแตะ contentJson เด็ดขาด** — หน้าแก้ไขเป็นเจ้าของร่างที่กำลังแก้ (SeoArticle.draftJson)
 *   รูปเดินทางกลับหน้าจอผ่าน `resultJson` ของ job แล้วผู้ใช้กดบันทึกบทความเองทีหลัง
 * - เขียนได้ที่เดียวคือ SeoArticleImage (คลังรูป) ซึ่งเป็นคนละก้อนกับเนื้อบทความ จึงไม่ทับร่าง
 *   บันทึกทันทีที่วาดเสร็จเพราะทุกใบมีค่าใช้จ่ายจริง ต้องหยิบกลับมาใช้ได้แม้ผู้ใช้จะปิดหน้าไปแล้ว
 * - อ่าน title/slug จากฐานเป็นบริบท + ตั้งชื่อไฟล์ — **ไม่รับจาก client** (client ส่งมาได้แค่คำสั่งวาด)
 * - ผู้ใช้ไม่พิมพ์คำสั่ง = ให้ AI อ่านบริบทแล้วเขียนคำสั่งวาดแทน จงใจให้ผลไหลเข้า buildSingleImagePrompt
 *   ต่อเหมือนคำสั่งที่คนพิมพ์เอง ทั้งสองทางจึงผ่านด่านตรวจ + ล็อกแบรนด์ชุดเดียวกัน ไม่แตกเป็นสองสูตร
 * - ตรวจคำสั่งวาดที่นี่ (ไม่ใช่ตอนเข้าคิว) เพราะทางอัตโนมัติต้องให้ AI คิดคำสั่งก่อนถึงจะตรวจได้
 *   คำสั่งที่ไม่ผ่านจึงจบเป็น FAILED พร้อมเหตุผลบนบล็อกนั้น
 * @param job แถวงานในคิว (seoArticleId + payload คำสั่งวาด)
 * @returns รูปที่วาดได้ (หน้าแก้ไขจับคู่กับคำสั่งของตัวเองด้วยเลข job ไม่ใช่ค่าใน result)
 * @used-by {@link ./run-seo-article-job.helper.ts}
 * @related {@link ./build-single-image-prompt.helper.ts}
 */
export const runSingleImageJob: SeoArticleJobRunner = async (job) => {
  if (!job.seoArticleId) {
    throw new Error(`[SEO-IMG-GEN-10] งานวาดรูปไม่มี seoArticleId job=${job.seoArticleJobId}`);
  }
  const seoArticleId = job.seoArticleId;
  // payload เป็น Json ในฐาน — ตัว action ตอนเข้าคิวเป็นคนตรวจรูปร่างให้แล้ว (placement ผ่านด่านมาแน่)
  const payload = (job.payload ?? {}) as unknown as SeoArticleSingleImagePayload;

  const article = await prisma.seoArticle.findUnique({
    where: { seoArticleId },
    select: { slug: true, title: true, contentJson: true },
  });
  if (!article) throw new Error("[SEO-IMG-GEN-04] ไม่พบบทความ (อาจถูกลบไประหว่างรอคิว)");

  if (!isOpenAiConfigured()) {
    throw new Error("[SEO-IMG-GEN-06] ยังไม่ได้ตั้งค่า CHATGPT_API_KEY — สั่งวาดรูปไม่ได้");
  }

  const placement: SingleImagePlacement = payload.placement;
  const style: SingleImageStyle = payload.style ?? "photo";

  let description = (payload.description ?? "").trim();
  let suggestedAlt = "";

  if (description.length === 0) {
    try {
      const brief = await buildArticleImageBrief({
        articleTitle: article.title,
        ...(payload.nearbyHeading ? { nearbyHeading: payload.nearbyHeading } : {}),
        ...(payload.nearbyText ? { nearbyText: payload.nearbyText } : {}),
        placement,
        style,
      });
      description = brief.description;
      suggestedAlt = brief.alt;
    } catch (error) {
      throw new Error(
        `[SEO-IMG-GEN-09] AI คิดคำสั่งวาดไม่สำเร็จ — ${error instanceof Error ? error.message : "Unknown"}`
      );
    }
  }

  const built = buildSingleImagePrompt({
    description,
    articleTitle: article.title,
    ...(payload.nearbyHeading ? { nearbyHeading: payload.nearbyHeading } : {}),
    placement,
    style,
  });
  if (!built.ok) throw new Error(built.message);

  // ภาพถ่ายที่พูดถึงเครื่องใช้ไฟฟ้า → แนบรูปสินค้าจริงรุ่นที่บทความพูดถึง ให้วาดเครื่องรุ่นที่เราขายจริง
  // ภาพฉาก/เอกสาร/อินโฟกราฟิก ไม่แนบ (กติการูปสินค้าบังคับให้มีเครื่องในฉาก)
  const productReferenceUrls =
    style === "photo" && selectBrandReferenceKinds(description).includes("equipment")
      ? findArticleProductImageUrls({ title: article.title, content: article.contentJson })
      : [];

  let url: string;
  try {
    url = await generateAndUploadArticleImage(built.prompt, `${article.slug}-${placement}-${style}`, {
      // อินโฟกราฟิกห้ามแนบรูปอ้างอิงแบรนด์ (เป็นภาพถ่าย จะดึงผลให้ออกมาเป็นภาพเหมือนจริง)
      withBrandReference: style !== "infographic",
      referenceDescription: withTechnicianReferenceHint(description),
      ...(productReferenceUrls.length ? { productReferenceUrls } : {}),
    });
  } catch (error) {
    throw new Error(`[SEO-IMG-GEN-07] วาดรูปไม่สำเร็จ — ${error instanceof Error ? error.message : "Unknown"}`);
  }

  const alt = suggestedAlt || built.alt;

  // เข้าคลังรูปทันทีที่วาดเสร็จ — ใบนี้เสียเงินไปแล้ว ต้องกลับมาหยิบได้แม้ผู้ใช้จะปิดหน้าไป
  await recordArticleImage({
    seoArticleId,
    url,
    alt,
    prompt: description,
    placement: placement === "cover" ? SeoArticleImagePlacement.COVER : SeoArticleImagePlacement.INLINE,
    style: style === "infographic" ? SeoArticleImageStyle.INFOGRAPHIC : SeoArticleImageStyle.PHOTO,
    createdBy: job.requestedBy,
  });

  return {
    seoArticleId,
    title: article.title,
    resultJson: {
      url,
      width: ARTICLE_IMAGE_SIZE.width,
      height: ARTICLE_IMAGE_SIZE.height,
      alt,
      // ส่งคำสั่งที่ใช้วาดจริงกลับไปด้วย เพื่อให้หน้าแก้ไขเติมลงช่องแล้วกด "วาดใหม่" ต่อได้
      // ไม่งั้นทางอัตโนมัติจะกลายเป็นกล่องดำ วาดออกมาไม่ถูกใจแล้วแก้ต่อไม่ได้เลย
      description,
    },
  };
};
