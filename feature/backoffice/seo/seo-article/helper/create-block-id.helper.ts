/** ตัวอักษรที่ใช้สร้าง id — ชุดเดียวกับ nanoid (URL-safe ไม่มีอักขระที่ต้อง escape) */
const ID_ALPHABET = "useandom26T198340PX75pxJACKVERYMINDBUSHWOLFGQZbfghjklqvwyzrict";

const ID_LENGTH = 12;

/**
 * @description สร้าง id สุ่มสำหรับ block ในบทความ SEO (แบบเดียวกับ nanoid แต่ไม่ต้องลง dependency เพิ่ม)
 * @logic
 * - ยาว 12 ตัวจาก alphabet 62 ตัว ≈ 71 bit → โอกาสชนกันในบทความเดียว (หลักร้อย block) แทบเป็นศูนย์
 * - ใช้ `crypto.getRandomValues` ถ้ามี (Node 19+, browser, edge runtime) — fallback `Math.random`
 *   ใช้เฉพาะกรณี runtime เก่าที่ไม่มี Web Crypto เพราะ id นี้ไม่ใช่ค่าความปลอดภัย เป็นแค่ key ตอน reorder
 * - ไม่ pure โดยธรรมชาติ (สุ่ม) → ทุก helper ที่เรียกใช้ต้องเปิดให้ inject ฟังก์ชันนี้เข้าไปได้ เพื่อให้ test deterministic
 * @returns id ยาว 12 ตัวอักษร
 * @used-by {@link convert-legacy-article.helper.ts}
 */
export function createBlockId(): string {
  const bytes = new Uint8Array(ID_LENGTH);
  const webCrypto = typeof globalThis !== "undefined" ? globalThis.crypto : undefined;

  if (webCrypto && typeof webCrypto.getRandomValues === "function") {
    webCrypto.getRandomValues(bytes);
  } else {
    for (let index = 0; index < ID_LENGTH; index += 1) {
      bytes[index] = Math.floor(Math.random() * 256);
    }
  }

  let id = "";
  for (let index = 0; index < ID_LENGTH; index += 1) {
    id += ID_ALPHABET[bytes[index] % ID_ALPHABET.length];
  }
  return id;
}
