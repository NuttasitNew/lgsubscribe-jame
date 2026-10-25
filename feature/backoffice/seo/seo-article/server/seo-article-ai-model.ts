import "server-only";

import type { ProviderOptions } from "@ai-sdk/provider-utils";

import { getConfiguredModel } from "@/lib/ai/chat-model";
import { getCallProviderOptions } from "@/lib/ai/prompt-cache-options";
import type { ResolvedChatModel } from "@/lib/ai/type/ai-chat-provider.type";

/** งาน AI ทั้งหมดในสาย SEO/FAQ — แต่ละงานมีเพดานคุณภาพกับต้นทุนที่ควรจ่ายไม่เท่ากัน */
export type SeoAiTask =
  | "writeArticle"
  | "translateArticle"
  | "writeFaq"
  | "translateFaq"
  | "suggestTopics"
  | "extractChatTopics"
  | "imageBrief"
  | "classifyPraise"
  | "researchKeywords"
  | "analyzeSerp"
  | "researchCompare";

type SeoAiTaskProfile = {
  openai: string;
  anthropic: string;
  reasoningEffort: "low" | "medium" | "high" | "xhigh" | "max";
};

/** งานเขียนที่ลูกค้าอ่านจริงบนเว็บ — ใช้ effort สูงในงานที่ต้องเรียบเรียง */
const WRITER_MODEL = { openai: "gpt-6-luna", anthropic: "claude-sonnet-5-5" } as const;
/** งานท่อภายใน — ใช้รุ่นเดียวกันแต่ลด effort ตามความซับซ้อนของงาน */
const PIPELINE_MODEL = { openai: "gpt-6-luna", anthropic: "claude-haiku-5-5" } as const;

/**
 * ตาราง model + effort ต่องาน — เกณฑ์แบ่ง 2 ชั้น
 * 1. OpenAI ใช้ gpt-6-luna ทุกงาน; Anthropic แยกรุ่นสำหรับเนื้อหาที่ลูกค้าอ่านกับงานท่อภายใน
 * 2. effort สูงเฉพาะงานที่ต้อง "คิด" (เรียบเรียงบทความ/ตอบให้ถูกเรื่องธุรกิจ)
 *    งานแปลกับงานดึงข้อมูลไม่ได้ดีขึ้นตาม effort แต่จ่าย reasoning token เพิ่มเต็ม ๆ
 */
const SEO_AI_TASK_PROFILE: Record<SeoAiTask, SeoAiTaskProfile> = {
  /** เขียนบทความไทยเต็มใบ — output ยาวสุดในระบบ สำนวนคือคุณค่าทั้งหมดของงานนี้ */
  writeArticle: { ...WRITER_MODEL, reasoningEffort: "high" },
  /** แปลบทความเป็น EN — ลูกค้าอ่านจริง แต่ต้นฉบับคิดมาแล้ว ไม่ต้อง reason ซ้ำ */
  translateArticle: { ...WRITER_MODEL, reasoningEffort: "medium" },
  /** เขียน FAQ หน้าถาม-ตอบ — ลูกค้าอ่าน + ตอบผิดเรื่องราคา/บริการแล้วเสียหายจริง */
  writeFaq: { ...WRITER_MODEL, reasoningEffort: "high" },
  /** แปล FAQ เป็น EN */
  translateFaq: { ...WRITER_MODEL, reasoningEffort: "medium" },
  /** เสนอหัวข้อจากหมวดบริการ — output สั้นมาก ค่าโมเดลแทบไม่ขยับ แต่หัวข้อผิด = บทความทั้งใบเสียเปล่า */
  suggestTopics: { ...WRITER_MODEL, reasoningEffort: "medium" },
  /** ดึงหัวข้อจากแชทเมื่อวาน — extraction จาก log ที่มีคำตอบอยู่แล้ว ไม่ต้องใช้ตัวเขียนเก่ง */
  extractChatTopics: { ...PIPELINE_MODEL, reasoningEffort: "medium" },
  /** เขียน prompt ส่งต่อให้ gpt-image-2 — งาน mechanical ผลลัพธ์ไม่ถึงสายตาลูกค้า */
  imageBrief: { ...PIPELINE_MODEL, reasoningEffort: "low" },
  /** จัดหมวดคำชมลูกค้า — classification ล้วน ไม่มีอะไรให้คิด */
  classifyPraise: { ...PIPELINE_MODEL, reasoningEffort: "low" },
  /** research คำค้นของกลุ่มลูกค้า (ค้นเว็บ + อ่านข้อมูลยอดค้นหา) — เลือกคำผิด = เขียนบทความที่ไม่มีใครค้น */
  researchKeywords: { ...WRITER_MODEL, reasoningEffort: "high" },
  /** อ่านบทความอันดับต้น ๆ แล้วหาช่องโหว่ — ค้นเว็บหลายรอบ ใช้ effort กลางพอ */
  analyzeSerp: { ...WRITER_MODEL, reasoningEffort: "medium" },
  /** เก็บข้อมูลแบรนด์คู่เทียบพร้อมแหล่งอ้างอิง — ตัวเลขผิดในตารางเทียบ = เสียความน่าเชื่อถือทั้งเว็บ */
  researchCompare: { ...WRITER_MODEL, reasoningEffort: "high" },
};

/** ค่าเริ่มต้นของ worker เขียนบทความ — ใช้อ้างอิงใน log/ทดสอบ */
export const SEO_AI_DEFAULT_MODEL = SEO_AI_TASK_PROFILE.writeArticle.openai;

/**
 * @description resolve model + providerOptions ของงาน SEO/FAQ แต่ละงานจากตาราง profile เดียวกัน
 * @access server-only
 * @logic
 * - model/effort มาจาก {@link SEO_AI_TASK_PROFILE} ตาม `task` ที่ส่งมา (ดูเกณฑ์แบ่งในคอมเมนต์ของตาราง)
 * - env override ได้ 2 ตัว และ **มีผลกับทุก task พร้อมกัน** (ตั้งใจให้เป็น kill switch ไม่ใช่ตัวจูนรายงาน)
 *   `SEO_AI_PROVIDER` = openai | anthropic ; `SEO_AI_MODEL` = model id ตรง ๆ
 * - คืน model กับ providerOptions มาด้วยกันเพื่อไม่ให้ call site หยิบ model ของงานหนึ่งไปคู่กับ effort ของอีกงาน
 * - `cacheKey` คงที่ทั้งสาย ("seo-article-v1") เพราะ prompt prefix ฝั่ง OpenAI แชร์กันได้
 * @param task งานที่กำลังเรียก — ตัวกำหนดทั้ง model tier และ reasoning effort
 * @returns {@link ResolvedChatModel} + `providerOptions` ที่ใส่ตรงเข้า `generateObject` ได้เลย
 * @used-by
 * - {@link write-seo-article.helper.ts} · {@link translate-article-to-en.helper.ts}
 * - {@link extract-chat-topics.helper.ts} · {@link suggest-category-topics.helper.ts}
 * - {@link build-article-image-brief.helper.ts} · {@link generate-seo-article-drafts.helper.ts}
 * - ask-answer-faq: write-ask-answer-faqs, translate-ask-answer-faqs
 * - customer-praise: classify-praise
 * @related
 * - {@link @/lib/ai/chat-model.ts}
 * - {@link @/lib/ai/prompt-cache-options.ts}
 * - {@link @/lib/ai/billing/model-pricing.ts} (ราคาต่อ 1M token ของแต่ละ model)
 */
export const getSeoArticleAi = (task: SeoAiTask): ResolvedChatModel & { providerOptions: ProviderOptions } => {
  const profile = SEO_AI_TASK_PROFILE[task];
  const resolved = getConfiguredModel({
    providerEnvName: "SEO_AI_PROVIDER",
    modelEnvName: "SEO_AI_MODEL",
    // lg-jame ใช้ Claude เขียน/research (Sonnet 5.5 + Haiku 5.5) — OpenAI เหลือไว้สร้างรูปอย่างเดียว
    defaultProvider: "anthropic",
    defaultModelId: { openai: profile.openai, anthropic: profile.anthropic },
  });

  return {
    ...resolved,
    providerOptions: getCallProviderOptions(resolved.provider, {
      cacheKey: "seo-article-v1",
      reasoningEffort: profile.reasoningEffort,
      strictJsonSchema: false,
    }),
  };
};
