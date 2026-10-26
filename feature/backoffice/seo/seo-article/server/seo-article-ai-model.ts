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

/**
 * ทุกงานในสาย SEO ใช้ ChatGPT gpt-6-luna effort medium รุ่นเดียว (เจ้าของเว็บกำหนด 26 ต.ค. 2026)
 * รุ่น Claude เก็บไว้เป็นทางสำรองผ่าน env `SEO_AI_PROVIDER=anthropic` เท่านั้น
 */
const SEO_AI_MODEL = { openai: "gpt-6-luna", anthropic: "claude-sonnet-5-5" } as const;
const SEO_AI_REASONING_EFFORT = "medium" as const;

/** ค่าเริ่มต้นของ worker เขียนบทความ — ใช้อ้างอิงใน log/ทดสอบ */
export const SEO_AI_DEFAULT_MODEL = SEO_AI_MODEL.openai;

/**
 * @description resolve model + providerOptions ของงาน SEO/FAQ แต่ละงานจากตาราง profile เดียวกัน
 * @access server-only
 * @logic
 * - ทุก task ได้ gpt-6-luna + effort medium เท่ากัน — `task` ยังรับไว้เพื่อให้ call site บอกว่างานไหน (log/อนาคต)
 * - env override ได้ 2 ตัว และ **มีผลกับทุก task พร้อมกัน** (ตั้งใจให้เป็น kill switch ไม่ใช่ตัวจูนรายงาน)
 *   `SEO_AI_PROVIDER` = openai | anthropic ; `SEO_AI_MODEL` = model id ตรง ๆ
 * - คืน model กับ providerOptions มาด้วยกันเพื่อไม่ให้ call site หยิบ model ของงานหนึ่งไปคู่กับ effort ของอีกงาน
 * - `cacheKey` คงที่ทั้งสาย ("seo-article-v1") เพราะ prompt prefix ฝั่ง OpenAI แชร์กันได้
 * @param task งานที่กำลังเรียก
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
  void task;
  const resolved = getConfiguredModel({
    providerEnvName: "SEO_AI_PROVIDER",
    modelEnvName: "SEO_AI_MODEL",
    defaultProvider: "openai",
    defaultModelId: SEO_AI_MODEL,
  });

  return {
    ...resolved,
    providerOptions: getCallProviderOptions(resolved.provider, {
      cacheKey: "seo-article-v1",
      reasoningEffort: SEO_AI_REASONING_EFFORT,
      strictJsonSchema: false,
    }),
  };
};
