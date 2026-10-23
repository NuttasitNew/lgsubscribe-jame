import "server-only";

import { resolveModelPrice } from "./model-pricing";
import type { AiSpendProvider } from "./type/ai-spend-report.type";

export interface EstimateAiCostParams {
  provider: AiSpendProvider;
  model: string;
  /** token ขาเข้าที่ "ไม่ได้" อ่านจาก cache */
  inputTokens: number;
  /** token ขาเข้าที่อ่านจาก prompt cache */
  cachedInputTokens: number;
  outputTokens: number;
}

/**
 * @description ประเมินค่าใช้จ่าย USD ของการเรียก LLM 1 ครั้ง จากจำนวน token + ตารางราคา
 * @access server-only
 * @logic
 * - cost = (input/1e6 × price.input) + (cached/1e6 × price.cachedInput) + (output/1e6 × price.output)
 * - reasoning token ไม่บวกซ้ำ เพราะ AI SDK นับรวมไว้ใน outputTokens แล้ว
 * - ค่าที่ได้เป็น "ประมาณการ" — ยอดจริงต้องอ่านจาก billing API ของ provider
 *   หน้าค่าใช้จ่ายจึงใช้ค่านี้แค่ปันส่วน (สัดส่วนต่อฟีเจอร์) ไม่ได้เอาไปแสดงเป็นยอดบิล
 * @param params provider + model + จำนวน token แต่ละประเภท
 * @returns ค่าใช้จ่าย USD (ปัดทศนิยม 6 ตำแหน่ง) + จับคู่ราคาได้จริงหรือไม่
 * @used-by {@link ../usage/track-ai-usage.ts}
 * @related {@link ./model-pricing.ts}
 */
export function estimateAiCostUsd(params: EstimateAiCostParams): { costUsd: number; priceMatched: boolean } {
  const { price, matched } = resolveModelPrice(params.provider, params.model);

  const cost =
    (Math.max(0, params.inputTokens) / 1_000_000) * price.input +
    (Math.max(0, params.cachedInputTokens) / 1_000_000) * price.cachedInput +
    (Math.max(0, params.outputTokens) / 1_000_000) * price.output;

  return { costUsd: Math.round(cost * 1_000_000) / 1_000_000, priceMatched: matched };
}
