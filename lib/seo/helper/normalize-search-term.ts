/** ช่วงอักขระไทย U+0E00–U+0E7F (สระ/วรรณยุกต์รวมอยู่ในช่วงนี้ทั้งหมด) */
const THAI_CHAR = /[฀-๿]/;

/**
 * @description ลบช่องว่างที่ Google Ads แทรกกลางคำไทย ให้กลายเป็นคำค้นแบบที่ผู้ใช้พิมพ์จริง
 * @logic
 * - รายงาน search term ของ Google Ads ตัดคำไทยด้วยช่องว่าง ("ซัก โซฟา", "ทํา ความ สะอาด โซฟา")
 *   แต่คำที่ผู้ใช้พิมพ์จริงและที่ Google Search Console เก็บคือ "ซักโซฟา" ติดกัน
 *   ถ้าเอาคำดิบไปตั้งเป็น targetKeyword จะเทียบกับ SeoSearchQueryDaily ไม่เจอเลย = วัดผลอันดับไม่ได้
 * - ลบเฉพาะช่องว่างที่ "ขนาบด้วยอักขระไทยทั้งสองฝั่ง" — ช่องว่างที่ติดกับอังกฤษ/ตัวเลขต้องคงไว้
 *   ("hurry clean thailand" ห้ามกลายเป็น "hurryclean thailand", "ซักโซฟา pantip" ต้องเหลือช่องว่าง)
 * - ยุบช่องว่างซ้ำและตัดหัวท้ายเสมอ
 * @param term คำค้นดิบจากรายงาน Google Ads
 * @returns คำค้นที่ normalize แล้ว
 * @used-by {@link ../feature/super-admin/hurry-web/seo-article/server/build-category-grounding.helper.ts},
 *          {@link ../feature/super-admin/hurry-web/ask-answer-faq/server/build-ask-answer-grounding.helper.ts},
 *          {@link ../lib/google-ads/sync-keyword-ideas.ts}
 */
export const normalizeSearchTerm = (term: string): string => {
  const collapsed = term
    .normalize("NFKC")
    .replace(/\u0e4d\u0e32/g, "\u0e33")
    .trim()
    .replace(/\s+/g, " ");

  let result = "";
  for (let i = 0; i < collapsed.length; i++) {
    const char = collapsed[i];
    if (char === " " && THAI_CHAR.test(collapsed[i - 1] ?? "") && THAI_CHAR.test(collapsed[i + 1] ?? "")) {
      continue; // ช่องว่างที่ Google Ads แทรกกลางคำไทย — ทิ้ง
    }
    result += char;
  }

  return result;
};
