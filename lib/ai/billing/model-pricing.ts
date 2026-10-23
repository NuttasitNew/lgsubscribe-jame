import "server-only";

import type { AiSpendProvider } from "./type/ai-spend-report.type";

/**
 * ราคาต่อ 1 ล้าน token (USD) ของโมเดล 1 ตัว
 * - `cachedInput` = ราคา token ขาเข้าที่อ่านจาก prompt cache (ทั้ง 2 ค่ายลดให้ ~90%)
 */
export interface ModelPrice {
  input: number;
  cachedInput: number;
  output: number;
}

/**
 * ราคา OpenAI (เพิ่ม GPT-6 Luna จากเอกสารรุ่น วันที่ 2026-09-23)
 * ที่มา: https://developers.openai.com/api/docs/pricing
 */
const OPENAI_PRICES: Record<string, ModelPrice> = {
  "gpt-6-luna": { input: 0.1, cachedInput: 0.01, output: 0.5 },
  "gpt-5.6-sol": { input: 5.0, cachedInput: 0.5, output: 30.0 },
  "gpt-5.6-terra": { input: 2.0, cachedInput: 0.2, output: 12.0 },
  "gpt-5.6-luna": { input: 0.2, cachedInput: 0.02, output: 1.2 },
  "gpt-5.5-pro": { input: 30.0, cachedInput: 30.0, output: 180.0 },
  "gpt-5.5": { input: 5.0, cachedInput: 0.5, output: 30.0 },
  "gpt-5.4-mini": { input: 0.75, cachedInput: 0.075, output: 4.5 },
  "gpt-5.4": { input: 2.5, cachedInput: 0.25, output: 15.0 },
  "gpt-4o-mini": { input: 0.15, cachedInput: 0.075, output: 0.6 },
  "gpt-4o": { input: 2.5, cachedInput: 1.25, output: 10.0 },
  // embedding (RAG ของบอทตอบแชท) — คิดเฉพาะ input
  "text-embedding-3-small": { input: 0.02, cachedInput: 0.02, output: 0 },
};

/**
 * ราคา Anthropic — cache read คิด 10% ของ input ทุกรุ่น
 * ที่มา: https://platform.claude.com/docs/en/pricing
 */
const ANTHROPIC_PRICES: Record<string, ModelPrice> = {
  "claude-fable-5": { input: 10.0, cachedInput: 1.0, output: 50.0 },
  "claude-mythos-5": { input: 10.0, cachedInput: 1.0, output: 50.0 },
  "claude-opus-5": { input: 5.0, cachedInput: 0.5, output: 25.0 },
  "claude-opus-4-8": { input: 5.0, cachedInput: 0.5, output: 25.0 },
  "claude-opus-4-7": { input: 5.0, cachedInput: 0.5, output: 25.0 },
  "claude-opus-4-6": { input: 5.0, cachedInput: 0.5, output: 25.0 },
  "claude-opus-4-5": { input: 5.0, cachedInput: 0.5, output: 25.0 },
  "claude-sonnet-5-5": { input: 2.0, cachedInput: 0.1, output: 10.0 },
  "claude-sonnet-5": { input: 2.0, cachedInput: 0.2, output: 10.0 },
  "claude-sonnet-4-6": { input: 3.0, cachedInput: 0.3, output: 15.0 },
  "claude-sonnet-4-5": { input: 3.0, cachedInput: 0.3, output: 15.0 },
  "claude-haiku-5-5": { input: 0.1, cachedInput: 0.01, output: 0.5 }, // ราคา prompt ≤100k token
  "claude-haiku-4-5": { input: 1.0, cachedInput: 0.1, output: 5.0 },
};

/** ราคาที่ใช้เมื่อจับคู่โมเดลไม่ได้ — ตั้งกลาง ๆ ไว้ ไม่ให้ประเมินต่ำจนดูเหมือนฟรี */
const FALLBACK_PRICE: Record<AiSpendProvider, ModelPrice> = {
  openai: { input: 2.0, cachedInput: 0.2, output: 12.0 },
  anthropic: { input: 3.0, cachedInput: 0.3, output: 15.0 },
};

/**
 * @description จับคู่ model id กับตารางราคา — รองรับ id ที่มี date suffix ต่อท้าย (เช่น `claude-haiku-4-5-20251001`)
 * @access server-only
 * @logic
 * - exact match ก่อน → ถ้าไม่เจอใช้ prefix match ที่ "ยาวที่สุด" (กัน `gpt-5.6` ไปแมตช์ `gpt-5.6-sol` ผิดตัว)
 * - ไม่เจอเลย → คืนราคา fallback ของ provider พร้อม `matched: false` เพื่อให้ caller เตือนได้ว่าเป็นการเดา
 * @param provider ค่าย LLM
 * @param modelId model id ที่บันทึกไว้ตอนเรียกจริง
 * @returns ราคาที่ใช้ + จับคู่ได้จริงหรือไม่
 * @used-by {@link ./estimate-ai-cost.ts}
 */
export function resolveModelPrice(provider: AiSpendProvider, modelId: string): { price: ModelPrice; matched: boolean } {
  const table = provider === "openai" ? OPENAI_PRICES : ANTHROPIC_PRICES;
  const id = (modelId || "").trim().toLowerCase();

  const exact = table[id];
  if (exact) return { price: exact, matched: true };

  let bestKey = "";
  for (const key of Object.keys(table)) {
    if (id.startsWith(key) && key.length > bestKey.length) bestKey = key;
  }
  if (bestKey) return { price: table[bestKey], matched: true };

  return { price: FALLBACK_PRICE[provider], matched: false };
}
