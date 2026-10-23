import type { LanguageModel } from "ai";

/**
 * @description ผู้ให้บริการโมเดลแชทที่ระบบรองรับ — สลับได้ผ่าน env `AI_CHAT_PROVIDER`
 * @logic ค่าที่ยอมรับมีแค่ 2 ตัวนี้ ; ค่าอื่นถือเป็น config ผิด → throw [AI-MODEL-01]
 * @used-by
 * - {@link ../chat-model.ts}
 * - {@link ../prompt-cache-options.ts}
 * @related {@link ResolvedChatModel}
 */
export type AiChatProvider = "openai" | "anthropic";

/**
 * @description ผลลัพธ์ของการ resolve env → provider/model ที่ใช้จริง พร้อม LanguageModel ที่ใช้กับ `generateText` ได้ทันที
 * @logic
 * - `provider` = provider ที่เลือกได้จริงหลัง fallback แล้ว (ไม่ใช่ค่าดิบจาก env)
 * - `modelId` = model id ที่ส่งเข้า SDK เช่น "gpt-6-luna" | "claude-sonnet-4-6"
 * - `label` = `${provider}:${modelId}` สำหรับ log/metrics และเก็บลง `SuggestionMeta.model`
 * @used-by {@link ../chat-model.ts}
 * @related {@link AiChatProvider}
 */
export interface ResolvedChatModel {
  /** provider ที่เลือกได้จริง (หลัง fallback แล้ว) */
  provider: AiChatProvider;
  /** model id ที่ส่งเข้า SDK เช่น "gpt-6-luna" | "claude-sonnet-4-6" */
  modelId: string;
  /** LanguageModel พร้อมใช้กับ generateText({ model }) */
  model: LanguageModel;
  /** ป้ายกำกับสำหรับ log/metrics เช่น "openai:gpt-6-luna" — ใช้เป็น SuggestionMeta.model */
  label: string;
}
