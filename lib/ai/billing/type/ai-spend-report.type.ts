/**
 * @description Type ของรายงานค่าใช้จ่าย AI รวมทุก provider (OpenAI + Anthropic) ที่ส่งให้ฝั่ง client
 * @page /super-admin/ai-spend
 * @access super-admin
 * @related
 * - provider result: {@link ./provider-spend-result.type.ts}
 * - action: {@link ../../../../feature/super-admin/ai-spend/server/get-ai-spend-report.action.ts}
 */

/** provider ที่ระบบเรียกใช้จริง (ตรงกับ lib/ai/chat-model.ts) */
export type AiSpendProvider = "openai" | "anthropic";

/** ยอดเงินรายวัน 1 วัน (bucket UTC ตามที่ provider ตัดรอบ) */
export interface AiSpendDailyPoint {
  /** YYYY-MM-DD (UTC) */
  date: string;
  /** USD */
  openai: number;
  /** USD */
  anthropic: number;
  /** USD */
  total: number;
}

/** ค่าใช้จ่ายแยกตามรายการที่ provider ตั้งชื่อมา (line_item / description) */
export interface AiSpendBreakdownItem {
  provider: AiSpendProvider;
  /** ชื่อรายการจาก provider เช่น "gpt-5.6-luna, input" / "Claude Sonnet 4 Usage - Input Tokens" */
  label: string;
  /** USD */
  amount: number;
}

/** ปริมาณ token แยกตามโมเดล (ใช้ดูว่า "ใช้ไปกับอะไร" ในเชิงปริมาณ ไม่ใช่เชิงเงิน) */
export interface AiSpendModelUsageItem {
  provider: AiSpendProvider;
  model: string;
  /** token ที่ไม่ได้อ่านจาก cache */
  inputTokens: number;
  /** token ที่อ่านจาก prompt cache (ถูกกว่ามาก) */
  cachedInputTokens: number;
  outputTokens: number;
  /** จำนวน request — OpenAI เท่านั้น (Anthropic usage report ไม่ส่งมา) */
  requests: number | null;
}

/** สถานะการดึงข้อมูลของแต่ละ provider — แยก "ไม่ได้ตั้ง key" ออกจาก "ดึงไม่สำเร็จ" */
export interface AiSpendProviderStatus {
  provider: AiSpendProvider;
  /** ตั้ง admin key ใน env แล้วหรือยัง */
  configured: boolean;
  /** ดึงข้อมูลสำเร็จหรือไม่ */
  ok: boolean;
  /** error code ภายในเท่านั้น — ห้ามส่งข้อความดิบจาก provider ออกไปฝั่ง client */
  errorCode: string | null;
  /** ยอดรวมของเดือนนี้ (USD) */
  total: number;
}

/** รายงานค่าใช้จ่าย AI 1 เดือน */
export interface AiSpendReport {
  /** YYYY-MM */
  month: string;
  currency: "USD";
  /** ยอดรวมทุก provider (USD) */
  total: number;
  /** ยอดรวมเดือนก่อนหน้า (USD) — null เมื่อดึงไม่ได้ */
  previousMonthTotal: number | null;
  /** เรตแปลง USD → THB ที่ใช้แสดงผลคร่าว ๆ (env `AI_SPEND_USD_THB_RATE`) */
  thbRate: number;
  providers: AiSpendProviderStatus[];
  daily: AiSpendDailyPoint[];
  breakdown: AiSpendBreakdownItem[];
  modelUsage: AiSpendModelUsageItem[];
  /** ISO timestamp ตอนที่ข้อมูลชุดนี้ถูกดึงจริงจาก provider */
  fetchedAt: string;
  /** true = อ่านจาก Redis cache (ไม่ได้ยิง provider รอบนี้) */
  cached: boolean;
}
