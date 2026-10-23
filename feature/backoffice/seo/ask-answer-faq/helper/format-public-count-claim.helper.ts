const countFormatter = new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 });

/**
 * @description แปลงยอดภายในเป็นข้อความจำนวนกว้างสำหรับคอนเทนต์สาธารณะ เช่น 358 → "มากกว่า 300 ชิ้น"
 * @logic
 * - ปัดลงเสมอเพื่อไม่อ้างเกินข้อมูลจริง: หลักสิบใช้ช่วง 10, หลักร้อยใช้ช่วง 100,
 *   หลักพันใช้ช่วง 500 และตั้งแต่หมื่นใช้ช่วง 1,000
 * - ค่าที่ตรงหลักพอดีใช้ "อย่างน้อย" แทน "มากกว่า" เพื่อไม่สร้างข้อความเท็จ เช่น 300 = อย่างน้อย 300
 * - ต่ำกว่า 10 ไม่เหมาะใช้เป็น social proof จึงคืน null
 * @param count จำนวนจริงจากฐานข้อมูล
 * @param unit หน่วยที่แสดงต่อท้าย เช่น ชิ้น หรือ คิว
 * @returns ข้อความจำนวนกว้างที่พิสูจน์ได้ หรือ null เมื่อยอดต่ำ/ไม่ถูกต้อง
 * @used-by {@link ../server/build-ask-answer-grounding-message.helper.ts}
 */
export const formatPublicCountClaim = (count: number, unit: string): string | null => {
  if (!Number.isFinite(count)) return null;

  const wholeCount = Math.floor(count);
  if (wholeCount < 10) return null;

  const step = wholeCount >= 10_000 ? 1_000 : wholeCount >= 1_000 ? 500 : wholeCount >= 100 ? 100 : 10;
  const threshold = Math.floor(wholeCount / step) * step;
  const qualifier = wholeCount === threshold ? "อย่างน้อย" : "มากกว่า";

  return `${qualifier} ${countFormatter.format(threshold)} ${unit}`;
};
