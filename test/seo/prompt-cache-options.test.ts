import { describe, expect, it } from "vitest";

import { getCallProviderOptions, getPromptCacheOptions } from "@/lib/ai/prompt-cache-options";
import type { AiChatProvider } from "@/lib/ai/type/ai-chat-provider.type";

describe("getPromptCacheOptions", () => {
  it("anthropic → ปัก cacheControl ephemeral ที่ระดับ message", () => {
    expect(getPromptCacheOptions("anthropic")).toEqual({
      providerOptions: { anthropic: { cacheControl: { type: "ephemeral" } } },
    });
  });

  it("openai → object ว่าง (OpenAI cache prefix อัตโนมัติ)", () => {
    expect(getPromptCacheOptions("openai")).toEqual({});
  });

  it("spread ต่อท้าย message ของ openai แล้วต้องไม่มี providerOptions ค้าง", () => {
    const message = { role: "system" as const, content: "prompt", ...getPromptCacheOptions("openai") };
    expect(message).not.toHaveProperty("providerOptions");
  });

  it("provider ไม่รู้จัก → throw [AI-CACHE-01]", () => {
    expect(() => getPromptCacheOptions("gemini" as AiChatProvider)).toThrowError(/\[AI-CACHE-01\]/);
  });
});

describe("getCallProviderOptions", () => {
  // "low" ไม่ใช่ "minimal": ตระกูล gpt-5.6 รับ none|low|medium|high|xhigh|max
  // (ดู lib/ai/prompt-cache-options.ts) — ส่ง "minimal" ไปจะโดน API ตีกลับ
  it("openai → ตั้ง reasoningEffort low + strictJsonSchema false + promptCacheKey", () => {
    expect(getCallProviderOptions("openai", { cacheKey: "ai-suggest-reply-v1" })).toEqual({
      openai: {
        reasoningEffort: "low",
        strictJsonSchema: false,
        promptCacheKey: "ai-suggest-reply-v1",
      },
    });
  });

  // สัญญาข้อสำคัญ: คืน "ตัว providerOptions" ไม่ใช่ object ที่ห่ออีกชั้น
  // ถ้าห่อกลับมา call site จะเขียน providerOptions: getCallProviderOptions(...) แล้วได้ providerOptions.providerOptions
  // → SDK อ่าน option ไม่เจอ strictJsonSchema กลับเป็น default true → OpenAI ตอบ 400 invalid_json_schema
  it("ไม่ห่อ providerOptions ซ้อนอีกชั้น — key ระดับบนต้องเป็นชื่อ provider", () => {
    const result = getCallProviderOptions("openai", { cacheKey: "seo-article-v1" });
    expect(result).not.toHaveProperty("providerOptions");
    expect(Object.keys(result)).toEqual(["openai"]);
  });

  it("openai ไม่ส่ง cacheKey → ไม่มี key promptCacheKey (กันส่ง undefined ขึ้น API)", () => {
    const result = getCallProviderOptions("openai");
    expect(result.openai).not.toHaveProperty("promptCacheKey");
    expect(result.openai.strictJsonSchema).toBe(false);
  });

  it("openai ส่ง cacheKey เป็นช่องว่างล้วน → ถือว่าไม่ได้ส่ง", () => {
    const result = getCallProviderOptions("openai", { cacheKey: "   " });
    expect(result.openai).not.toHaveProperty("promptCacheKey");
  });

  it("openai รองรับ reasoning effort max สำหรับงานเขียนบทความ", () => {
    expect(getCallProviderOptions("openai", { reasoningEffort: "max" }).openai.reasoningEffort).toBe("max");
  });

  it("anthropic → object ว่าง (คุม cache ที่ระดับ message แล้ว)", () => {
    expect(getCallProviderOptions("anthropic", { cacheKey: "x" })).toEqual({});
  });

  it("provider ไม่รู้จัก → throw [AI-CACHE-01]", () => {
    expect(() => getCallProviderOptions("gemini" as AiChatProvider)).toThrowError(/\[AI-CACHE-01\]/);
  });
});
