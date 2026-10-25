import "server-only";

/**
 * @description ดึงคำแนะนำจาก Google Autocomplete (ภาษาไทย, ประเทศไทย) — สัญญาณ "คนพิมพ์คำนี้จริง" ที่ไม่ต้องมี API key
 * @logic
 * - endpoint `suggestqueries.google.com` ใช้กับช่องค้นหาของเบราว์เซอร์ คืน JSON `[query, [suggestions...]]`
 * - เป็นข้อมูลประกอบการเลือกคำ ไม่ใช่ยอดค้นหา — ยอดค้นหาจริงยังมาจาก Keyword Planner / Search Console
 * - พัง/โดนจำกัดความถี่ → คืน [] ไม่ throw เพราะ research ยังเดินต่อได้จากแหล่งอื่น
 * @param seed คำตั้งต้น เช่น "เช่าแอร์"
 * @returns คำแนะนำไม่ซ้ำ (สูงสุด ~10 คำต่อ seed)
 */
export const fetchGoogleAutocomplete = async (seed: string, signal?: AbortSignal): Promise<string[]> => {
  const url = new URL("https://suggestqueries.google.com/complete/search");
  url.searchParams.set("client", "firefox");
  url.searchParams.set("hl", "th");
  url.searchParams.set("gl", "th");
  url.searchParams.set("q", seed);
  try {
    const res = await fetch(url, { signal: signal ?? AbortSignal.timeout(8000) });
    if (!res.ok) return [];
    const data = (await res.json()) as [string, string[]];
    return Array.isArray(data?.[1]) ? [...new Set(data[1].map((s) => s.trim()).filter(Boolean))] : [];
  } catch {
    return [];
  }
};

/**
 * @description ขยาย seed หลายคำพร้อมกัน (จำกัด concurrency) — คืน map seed → คำแนะนำ
 * @logic ยิงทีละ 4 คำเพื่อไม่ให้ Google ตีเป็น traffic ผิดปกติ
 */
export const expandSeedsWithAutocomplete = async (seeds: string[]): Promise<Record<string, string[]>> => {
  const result: Record<string, string[]> = {};
  const unique = [...new Set(seeds.map((s) => s.trim()).filter(Boolean))];
  for (let i = 0; i < unique.length; i += 4) {
    const chunk = unique.slice(i, i + 4);
    const settled = await Promise.all(chunk.map((seed) => fetchGoogleAutocomplete(seed)));
    chunk.forEach((seed, index) => {
      result[seed] = settled[index];
    });
  }
  return result;
};
