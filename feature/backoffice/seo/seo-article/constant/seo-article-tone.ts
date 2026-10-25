/**
 * @description โทนการเขียนที่ super-admin เลือกได้ตอนสั่งให้ AI เขียนบทความเองจาก brief
 * @logic
 * - ไฟล์นี้ต้อง client-safe (ห้าม import "server-only") เพราะฟอร์มฝั่ง UI ใช้ทำ dropdown
 * - `promptHint` ถูกต่อเข้า system prompt ตรง ๆ ใน write-seo-article.helper.ts
 * @related
 * - ใช้โดย: {@link ../server/write-seo-article.helper.ts}
 */
export const SEO_ARTICLE_TONES = [
  {
    value: "friendly",
    label: "สุภาพ อ่านง่าย (ค่าเริ่มต้น)",
    // เดิมเป็น "ภาษาพูดเหมือนเพื่อน" — เจ้าของเว็บติว่าไม่เป็นทางการ ดูแปลกสำหรับเว็บบริการของแบรนด์
    promptHint: "ใช้ภาษาสุภาพ กึ่งทางการ อ่านง่ายแบบเว็บไซต์บริการของแบรนด์ อธิบายให้คนทั่วไปเข้าใจ ไม่ใช้ภาษาพูดหรือคำลงท้ายแบบแชต",
  },
  {
    value: "expert",
    label: "ผู้เชี่ยวชาญ",
    promptHint:
      "ใช้ภาษาสุภาพแบบมืออาชีพ ให้เหตุผลเชิงเทคนิคว่าทำไมต้องทำแบบนั้น แต่ยังต้องอ่านเข้าใจง่ายสำหรับคนทั่วไป",
  },
  {
    value: "howTo",
    label: "สอนทำทีละขั้น",
    promptHint:
      "เน้นขั้นตอนลงมือทำจริง ใช้ numberedList ได้ 1-2 ชุดสำหรับลำดับขั้นตอนที่ต้องทำตามลำดับจริง " +
      "แต่รายละเอียดของแต่ละขั้น (ทำไมต้องทำ ใช้เวลาเท่าไหร่ พลาดตรงไหนแล้วพัง) ต้องเขียนขยายเป็นย่อหน้า ไม่ใช่ยัดลงในข้อ",
  },
  {
    value: "compare",
    label: "เปรียบเทียบตัวเลือก",
    promptHint: "เน้นชั่งน้ำหนักข้อดีข้อเสียของแต่ละทางเลือก ต้องมีบล็อก table เปรียบเทียบอย่างน้อย 1 ตาราง",
  },
] as const;

/** ค่า tone ที่รับได้ */
export type SeoArticleTone = (typeof SEO_ARTICLE_TONES)[number]["value"];

/** tone ที่ใช้เมื่อผู้ใช้ไม่ได้เลือก */
export const DEFAULT_SEO_ARTICLE_TONE: SeoArticleTone = "friendly";

/**
 * @description หาคำใบ้โทนสำหรับต่อเข้า prompt จากค่า tone ที่ผู้ใช้เลือก
 * @param tone ค่า tone (ไม่ระบุ/ไม่รู้จัก → ใช้ค่าเริ่มต้น)
 * @returns ข้อความคำใบ้ภาษาไทยสำหรับ system prompt
 * @used-by {@link ../server/write-seo-article.helper.ts}
 */
export const getSeoArticleTonePromptHint = (tone?: string): string => {
  const found = SEO_ARTICLE_TONES.find((item) => item.value === tone);
  return (found ?? SEO_ARTICLE_TONES[0]).promptHint;
};
