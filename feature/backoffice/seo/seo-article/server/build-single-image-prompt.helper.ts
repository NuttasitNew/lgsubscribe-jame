import { INFOGRAPHIC_STYLE } from "./article-image-style.constant";

/** ความยาวสูงสุดของคำอธิบายที่ผู้ใช้พิมพ์สั่งวาด — ยาวกว่านี้โมเดลเริ่มหลุดประเด็น + เปลืองโทเคน */
export const MAX_IMAGE_DESCRIPTION_LENGTH = 400;

/** ความยาวสูงสุดของ alt ที่ระบบเสนอ — alt ยาวเกินนี้ screen reader อ่านไม่จบและ Google ตัดทิ้ง */
export const MAX_SUGGESTED_ALT_LENGTH = 120;

/** รูปที่สั่งวาดใช้ตรงไหนของบทความ — คุมมุมภาพให้ต่างกัน */
export type SingleImagePlacement = "cover" | "inline";

/**
 * ชนิดของภาพที่สั่งวาด
 * - `photo` = ภาพถ่ายไลฟ์สไตล์ (ห้ามมีตัวหนังสือในภาพ)
 * - `infographic` = แผนภาพแบน ๆ มีตัวหนังสือไทยในภาพ
 */
export type SingleImageStyle = "photo" | "infographic";

export interface BuildSingleImagePromptParams {
  /** ข้อความอิสระที่ผู้ใช้พิมพ์บอกว่าอยากได้ภาพอะไร (หรือคำสั่งที่ AI เขียนให้ตอนกดวาดอัตโนมัติ) */
  description: string;
  /** ชื่อบทความ — ใช้เป็นบริบทให้ภาพเข้ากับเนื้อหา */
  articleTitle: string;
  /** หัวข้อที่บล็อกรูปอยู่ใกล้ที่สุด (ถ้ามี) — ช่วยให้รูปแทรกตรงกับหัวข้อนั้น */
  nearbyHeading?: string;
  placement: SingleImagePlacement;
  /** ไม่ส่งมา = ภาพถ่าย (พฤติกรรมเดิมก่อนมีอินโฟกราฟิก) */
  style?: SingleImageStyle;
}

export type BuildSingleImagePromptResult =
  | { ok: true; prompt: string; alt: string }
  | { ok: false; code: string; message: string };

/** ยุบช่องว่าง/ขึ้นบรรทัดใหม่ให้เหลือเว้นวรรคเดียว — กันคนวางข้อความยาวมีบรรทัดว่างเพียบ */
const collapseWhitespace = (value: string): string => value.replace(/\s+/g, " ").trim();

/** ตัดข้อความให้ไม่เกินความยาวที่กำหนด โดยตัดที่ช่องว่างคำสุดท้าย (ไม่ตัดกลางคำ) */
const truncateAtWord = (value: string, maxLength: number): string => {
  if (value.length <= maxLength) return value;
  const sliced = value.slice(0, maxLength);
  const lastSpace = sliced.lastIndexOf(" ");
  return (lastSpace > 0 ? sliced.slice(0, lastSpace) : sliced).trim();
};

/**
 * @description แปลง "คำสั่งวาดที่ผู้ใช้พิมพ์" + บริบทบทความ → prompt ฉบับเต็มของ gpt-image-2 + alt ที่เสนอให้
 * @logic
 * - ตรวจก่อนเสมอ: ว่าง → [SEO-IMG-GEN-02], ยาวเกิน MAX_IMAGE_DESCRIPTION_LENGTH → [SEO-IMG-GEN-03]
 *   (ตรวจความยาวหลังยุบช่องว่างแล้ว เพื่อไม่ให้การเว้นบรรทัดไปกินโควตา)
 * - ลำดับความสำคัญใน prompt: **คำสั่งของผู้ใช้มาก่อน** บริบทบทความ แล้วค่อยล็อกแบรนด์ + โทนภาพ
 *   ต่างจาก flow ยกชุดที่บังคับมุมภาพเอง (SECTION_SHOTS ห้ามมีช่าง) — ตรงนี้ผู้ใช้เป็นคนสั่ง จึงห้ามไปขัดคำสั่งเขา
 * - แนวทางและรูปบริษัทถูกเติมจากฐานที่ generateAndUploadArticleImage เพื่อให้ prompt ตรงรูปอ้างอิงล่าสุด
 * - alt ที่เสนอ = คำอธิบายของผู้ใช้เอง (ยุบช่องว่าง + ตัดที่ท้ายคำไม่เกิน MAX_SUGGESTED_ALT_LENGTH)
 *   จงใจไม่ยิงโมเดลภาษาเพิ่มเพื่อเดา alt — คำอธิบายที่ผู้ใช้พิมพ์คือคำบรรยายภาพที่ตรงที่สุดอยู่แล้ว
 *   และ alt ต้องได้ทันทีแม้ตอนสั่งวาดล้มเหลว ผู้ใช้แก้ต่อได้เองในช่อง alt
 * @param params คำอธิบายจากผู้ใช้ + ชื่อบทความ + หัวข้อใกล้เคียง + ตำแหน่งที่ใช้รูป
 * @returns { ok: true, prompt, alt } หรือ { ok: false, code, message } เมื่อคำอธิบายไม่ผ่าน
 * @used-by {@link ./generate-single-article-image.action.ts}
 * @related {@link ./article-image-style.constant.ts}
 */
export const buildSingleImagePrompt = (params: BuildSingleImagePromptParams): BuildSingleImagePromptResult => {
  const description = collapseWhitespace(params.description ?? "");
  if (description.length === 0) {
    return { ok: false, code: "SEO-IMG-GEN-02", message: "[SEO-IMG-GEN-02] ต้องพิมพ์บอกก่อนว่าอยากได้ภาพแบบไหน" };
  }
  if (description.length > MAX_IMAGE_DESCRIPTION_LENGTH) {
    return {
      ok: false,
      code: "SEO-IMG-GEN-03",
      message: `[SEO-IMG-GEN-03] คำอธิบายยาวเกินไป (${description.length}/${MAX_IMAGE_DESCRIPTION_LENGTH} ตัวอักษร)`,
    };
  }

  const title = collapseWhitespace(params.articleTitle ?? "");
  const heading = collapseWhitespace(params.nearbyHeading ?? "");

  const isInfographic = params.style === "infographic";

  // อินโฟกราฟิกไม่มี "มุมกล้อง" — บรีฟตำแหน่งจึงต้องพูดถึงหน้าที่ของแผนภาพแทน ไม่งั้นโมเดลจะเผลอวาดเป็นรูปถ่าย
  const placementBrief = isInfographic
    ? params.placement === "cover"
      ? "This infographic is the cover of the article: it must summarise the whole article at a glance."
      : "This infographic sits inside the article: it must explain only the one section it belongs to, not the whole article."
    : params.placement === "cover"
      ? "This is the cover image of the article: a wide, inviting establishing shot that works as the header banner."
      : "This is an in-article illustration photo, NOT the cover.";

  const context = [
    title.length > 0 ? `The article is titled "${title}".` : "",
    heading.length > 0 ? `The image sits under the section "${heading}".` : "",
  ]
    .filter(Boolean)
    .join(" ");

  const intent =
    `A Thai editor asked for exactly this picture: "${description}". ` +
    "That request is the priority — follow it literally, and use the article context only to keep the scene consistent with the article.";

  // ⚠️ ต่อท้ายได้ทีละสไตล์เท่านั้น — IMAGE_STYLE ห้ามมีตัวหนังสือ ส่วน INFOGRAPHIC_STYLE บังคับให้มี
  //    ถ้าใส่ทั้งคู่ คำสั่งจะขัดกันเองและได้ภาพที่เดาผลไม่ได้
  const styleBlock = isInfographic ? INFOGRAPHIC_STYLE : "";

  // อินโฟกราฟิกเป็นแผนภาพ ไม่มีคนและไม่มีเครื่อง — ล็อกยูนิฟอร์ม/เครื่องจึงไม่มีความหมายและรังแต่จะกวนโมเดล
  const prompt = [placementBrief, context, intent, styleBlock].filter(Boolean).join(" ");

  return { ok: true, prompt, alt: truncateAtWord(description, MAX_SUGGESTED_ALT_LENGTH) };
};
