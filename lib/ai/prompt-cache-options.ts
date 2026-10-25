import "server-only";

import type { ModelMessage } from "ai";
import type { ProviderOptions } from "@ai-sdk/provider-utils";

import type { AiChatProvider } from "./type/ai-chat-provider.type";

/**
 * @description คืน `providerOptions` สำหรับ "system message ที่ควรถูก cache" — ผูก cacheControl ให้เฉพาะ provider ที่รองรับ
 * @access server-only
 * @logic
 * - anthropic → `{ providerOptions: { anthropic: { cacheControl: { type: "ephemeral" } } } }`
 *   (Anthropic ต้องปัก cache breakpoint ที่ระดับ message เอง ไม่มี auto-cache)
 * - openai → `{}` เพราะ OpenAI ทำ prompt caching จาก prefix ให้อัตโนมัติ ไม่มี field นี้
 * - provider ที่ไม่รู้จัก → throw `[AI-CACHE-01]` (config ผิด ต้องดังทันที)
 * - เหตุผลที่ต้องแยกตาม provider: `parseProviderOptions` ของ SDK อ่านเฉพาะ key ของ provider ตัวเอง
 *   ถ้าปล่อย `{ anthropic: ... }` ค้างไว้ตอนวิ่ง OpenAI มันจะ **ไม่ error** แต่ถูกเมินเงียบ ๆ
 *   = prompt caching หายไปโดยไม่มีสัญญาณ ค่า input token เด้งเต็มราคาทุก request
 * @param provider provider ที่ resolve ได้จาก {@link getChatModel}
 * @returns object ที่ spread ต่อท้าย `ModelMessage` ได้ทันที (`{ role, content, ...cache }`)
 * @used-by feature/social-chat/line/ai-suggest-reply/server/build-suggestion.ts
 * @related
 * - {@link ./chat-model.ts}
 * - {@link getCallProviderOptions}
 */
export function getPromptCacheOptions(provider: AiChatProvider): Pick<ModelMessage, "providerOptions"> {
  if (provider === "anthropic") {
    return { providerOptions: { anthropic: { cacheControl: { type: "ephemeral" } } } };
  }
  if (provider === "openai") {
    return {};
  }
  throw new Error(`[AI-CACHE-01] provider ไม่รองรับ prompt cache options: "${String(provider)}"`);
}

/**
 * @description คืนค่าที่ใส่ใน `providerOptions` ของ `generateText`/`generateObject` — คุม cache routing + latency ฝั่ง OpenAI
 * @access server-only
 * @logic
 * - openai → `{ openai: { promptCacheKey, reasoningEffort, strictJsonSchema: false } }`
 *   - `promptCacheKey` ช่วย route request ไป cache prefix เดิม (คงที่ต่อ 1 use case)
 *   - `reasoningEffort` — gpt-6-luna รองรับ `none|low|medium|high|xhigh|max`
 *     (**ห้ามใช้ `"minimal"` ของ GPT-5 รุ่นเก่า → 400 Unsupported value ทุก call**)
 *     วัดจริงกับ gpt-5.6-luna: low ≈ 2.5s/1 step ; medium ≈ 2.4s/1 step ;
 *     `none` **ช้ากว่า** (≈3.3s) เพราะไม่ reason แล้วไม่เรียก submitReply รอบแรก → กลายเป็น 2 steps
 *   - `strictJsonSchema: false` — **จำเป็น** ค่า default ของ SDK คือ `true` ซึ่งบังคับว่าทุก key ใน
 *     `properties` ต้องอยู่ใน `required` ; tool/decision schema ฝั่ง ai-suggest-reply มี `.optional()`
 *     หลายจุด → ถ้าปล่อย strict จะโดน 400 invalid_request ตั้งแต่ call แรก
 * - anthropic → `{}` เพราะคุม cache ที่ระดับ message ผ่าน {@link getPromptCacheOptions} ไปแล้ว
 * - provider ที่ไม่รู้จัก → throw `[AI-CACHE-01]`
 * - ⚠️ ค่าที่คืนคือ **ตัว providerOptions เอง ไม่ใช่ object ที่ห่อ `{ providerOptions: ... }`**
 *   ต้องเขียน `providerOptions: getCallProviderOptions(...)` เท่านั้น ห้าม spread — เคยห่อซ้อนสองชั้นมาแล้ว
 *   ทำให้ SDK อ่าน option ไม่เจอทั้งชุด (strictJsonSchema กลับไปเป็น default `true` → cron เขียนบทความ 400
 *   invalid_json_schema ทุกวัน 2–3 ส.ค. 2026 + promptCacheKey หายเงียบ ๆ)
 * @param provider provider ที่ resolve ได้จาก {@link getChatModel}
 * @param opts `cacheKey` = คีย์คงที่ต่อ use case เช่น "ai-suggest-reply-v1" (ไม่ส่ง = ปล่อย OpenAI จัดการเอง)
 * @returns ค่าที่ใส่ตรง ๆ ใน field `providerOptions` ของ `generateText`/`generateObject`
 * @used-by feature/social-chat/line/ai-suggest-reply/server/build-suggestion.ts
 * @related
 * - {@link ./chat-model.ts}
 * - {@link getPromptCacheOptions}
 */
export function getCallProviderOptions(
  provider: AiChatProvider,
  opts?: {
    cacheKey?: string;
    reasoningEffort?: "none" | "low" | "medium" | "high" | "xhigh" | "max";
    strictJsonSchema?: boolean;
  }
): ProviderOptions {
  if (provider === "anthropic") {
    // effort ของ Claude อยู่ใน output_config — Sonnet 5.5/Haiku 5.5 ไม่มีระดับ "none" จึงปัดเป็น low
    if (!opts?.reasoningEffort) return {};
    const effort = opts.reasoningEffort === "none" ? "low" : opts.reasoningEffort;
    return { anthropic: { effort } } as unknown as ProviderOptions;
  }
  if (provider === "openai") {
    const openaiOptions: Record<string, unknown> = {
      reasoningEffort: opts?.reasoningEffort || "low",
      strictJsonSchema: opts?.strictJsonSchema ?? false,
    };
    const cacheKey = opts?.cacheKey?.trim();
    if (cacheKey) openaiOptions.promptCacheKey = cacheKey;
    return { openai: openaiOptions } as unknown as ProviderOptions;
  }
  throw new Error(`[AI-CACHE-01] provider ไม่รองรับ call provider options: "${String(provider)}"`);
}
