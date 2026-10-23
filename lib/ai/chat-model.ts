import "server-only";

import { createAnthropic } from "@ai-sdk/anthropic";
import { createOpenAI } from "@ai-sdk/openai";

import type { AiChatProvider, ResolvedChatModel } from "./type/ai-chat-provider.type";

/** model id ปริยายของแต่ละ provider เมื่อไม่ได้ตั้ง env AI_CHAT_MODEL */
const DEFAULT_MODEL_ID: Record<AiChatProvider, string> = {
  openai: "gpt-6-luna",
  anthropic: "claude-sonnet-4-6",
};

export interface AiModelConfig {
  providerEnvName?: string;
  modelEnvName?: string;
  defaultProvider?: AiChatProvider;
  defaultModelId?: Partial<Record<AiChatProvider, string>>;
}

/**
 * memoize client ต่อ apiKey (module-level) — บน serverless ถ้าสร้าง client ใหม่ทุก request
 * จะเสีย connection pool/agent ที่ SDK ถือไว้ทิ้งทุกครั้ง
 */
const openAiClients = new Map<string, ReturnType<typeof createOpenAI>>();
const anthropicClients = new Map<string, ReturnType<typeof createAnthropic>>();

const getOpenAiClient = (apiKey: string) => {
  const cached = openAiClients.get(apiKey);
  if (cached) return cached;
  const client = createOpenAI({ apiKey });
  openAiClients.set(apiKey, client);
  return client;
};

const getAnthropicClient = (apiKey: string) => {
  const cached = anthropicClients.get(apiKey);
  if (cached) return cached;
  const client = createAnthropic({ apiKey });
  anthropicClients.set(apiKey, client);
  return client;
};

/**
 * @description คืน OpenAI provider (memoize ต่อ apiKey) สำหรับงานที่ไม่ใช่แชท เช่น embedding — ใช้ key เดียวกับ {@link getConfiguredModel}
 * @access server-only
 * @logic apiKey = `CHATGPT_API_KEY` ?? `OPENAI_API_KEY` ; ไม่มี → `[AI-MODEL-02]`
 * @used-by lib/ai/chat-bot/knowledge/embed-texts.ts
 */
export function getOpenAiProvider() {
  const apiKey = (process.env.CHATGPT_API_KEY || process.env.OPENAI_API_KEY || "").trim();
  if (!apiKey) {
    throw new Error("[AI-MODEL-02] ไม่พบ CHATGPT_API_KEY (หรือ OPENAI_API_KEY) สำหรับ provider openai");
  }
  return getOpenAiClient(apiKey);
}

/**
 * @description อ่าน provider ปัจจุบันจาก env อย่างเดียว (ไม่สร้าง client) — ใช้ตอนต้องแตกพฤติกรรมตาม provider
 * @access server-only
 * @logic
 * - `AI_CHAT_PROVIDER` (trim, lowercase) → "openai" | "anthropic" ; ไม่ตั้งค่า/ว่าง → default "openai"
 * - ค่านอกเหนือจากนี้ → throw `[AI-MODEL-01]` (config ผิด ต้องรู้ทันทีตอน boot ไม่ใช่เงียบ ๆ fallback)
 * @returns provider ที่จะถูกใช้จริง
 * @used-by
 * - {@link ./prompt-cache-options.ts}
 * - feature/social-chat/line/ai-suggest-reply/server/build-suggestion.ts
 * @related {@link getChatModel}
 */
export function getChatProvider(): AiChatProvider {
  return getConfiguredProvider("AI_CHAT_PROVIDER");
}

/**
 * @description อ่าน provider จาก env ที่ระบุสำหรับแต่ละงาน AI
 * @access server-only
 * @logic ค่าว่างใช้ defaultProvider; ค่าที่ไม่ใช่ openai/anthropic ต้อง throw เพื่อไม่ให้สลับ provider เงียบๆ
 */
export function getConfiguredProvider(envName: string, defaultProvider: AiChatProvider = "openai"): AiChatProvider {
  const raw = (process.env[envName] || "").trim().toLowerCase();
  if (!raw) return defaultProvider;
  if (raw === "openai" || raw === "anthropic") return raw;
  throw new Error(`[AI-MODEL-01] ${envName} ไม่ถูกต้อง: "${raw}" (ต้องเป็น "openai" หรือ "anthropic")`);
}

/**
 * @description คืน LanguageModel ตาม env `AI_CHAT_PROVIDER` ให้ `generateText` ใช้ — สลับ OpenAI/Anthropic ได้โดยไม่แก้ call site
 * @access server-only
 * @logic
 * - provider มาจาก {@link getChatProvider} (default "openai") ; ค่าเพี้ยน → `[AI-MODEL-01]`
 * - openai: apiKey = `CHATGPT_API_KEY` ?? `OPENAI_API_KEY` (trim) ; ไม่มี → `[AI-MODEL-02]`
 *   modelId = `AI_CHAT_MODEL` ?? "gpt-6-luna" (เหมาะกับงาน high-volume latency-sensitive)
 *   ใช้ `createOpenAI({ apiKey })` เท่านั้น ห้ามใช้ singleton `openai` เพราะมันอ่านแค่ `OPENAI_API_KEY`
 *   (โปรเจกต์นี้เก็บ key ไว้ที่ `CHATGPT_API_KEY` → singleton จะพังทันทีบน prod)
 * - anthropic: apiKey = `ANTHROPIC_API_KEY` ; ไม่มี → `[AI-MODEL-03]`
 *   modelId = `AI_CHAT_MODEL` ?? `fallbackModelId` ?? "claude-sonnet-4-6"
 * - client ถูก memoize ต่อ apiKey ที่ module scope กันสร้างใหม่ทุก request บน serverless
 * @param fallbackModelId model id ปริยายฝั่ง anthropic ถ้า call site อยากล็อกรุ่นเอง (env ยัง override ได้)
 * @returns {@link ResolvedChatModel} — provider / modelId / model / label
 * @used-by feature/social-chat/line/ai-suggest-reply/server/build-suggestion.ts
 * @related
 * - {@link ./prompt-cache-options.ts}
 * - {@link ./type/ai-chat-provider.type.ts}
 */
export function getChatModel(fallbackModelId?: string): ResolvedChatModel {
  return getConfiguredModel({
    modelEnvName: "AI_CHAT_MODEL",
    providerEnvName: "AI_CHAT_PROVIDER",
    defaultModelId: { anthropic: fallbackModelId || DEFAULT_MODEL_ID.anthropic },
  });
}

/**
 * @description คืน LanguageModel ตาม config ของ use case ที่แยกจาก AI chat ได้ เช่น SEO หรือ document check
 * @access server-only
 * @logic ใช้ key ตาม provider และ memoize client เดิม; OpenAI ใช้ CHATGPT_API_KEY ก่อน OPENAI_API_KEY
 */
export function getConfiguredModel(config: AiModelConfig = {}): ResolvedChatModel {
  const providerEnvName = config.providerEnvName || "AI_CHAT_PROVIDER";
  const modelEnvName = config.modelEnvName || "AI_CHAT_MODEL";
  const provider = getConfiguredProvider(providerEnvName, config.defaultProvider || "openai");
  const envModelId = (process.env[modelEnvName] || "").trim();

  if (provider === "openai") {
    const apiKey = (process.env.CHATGPT_API_KEY || process.env.OPENAI_API_KEY || "").trim();
    if (!apiKey) {
      throw new Error("[AI-MODEL-02] ไม่พบ CHATGPT_API_KEY (หรือ OPENAI_API_KEY) สำหรับ provider openai");
    }
    const modelId = envModelId || config.defaultModelId?.openai || DEFAULT_MODEL_ID.openai;
    return {
      provider,
      modelId,
      model: getOpenAiClient(apiKey)(modelId),
      label: `openai:${modelId}`,
    };
  }

  const apiKey = (process.env.ANTHROPIC_API_KEY || "").trim();
  if (!apiKey) {
    throw new Error("[AI-MODEL-03] ไม่พบ ANTHROPIC_API_KEY สำหรับ provider anthropic");
  }
  const modelId = envModelId || config.defaultModelId?.anthropic || DEFAULT_MODEL_ID.anthropic;
  return {
    provider,
    modelId,
    model: getAnthropicClient(apiKey)(modelId),
    label: `anthropic:${modelId}`,
  };
}
