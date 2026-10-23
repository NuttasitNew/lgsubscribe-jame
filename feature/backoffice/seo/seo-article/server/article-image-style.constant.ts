/**
 * @description ค่าคงที่ "โทนภาพ + ล็อกแบรนด์" ของรูปประกอบบทความ SEO ทุกใบ
 * @logic
 * - แยกออกมาจาก generate-article-images.helper.ts เพื่อให้ทั้ง flow ยกชุด (gen ทั้งบทความ)
 *   และ flow วาดทีละใบ (ผู้ใช้สั่งเอง) ใช้ชุดเดียวกัน — รูปที่ได้จะได้เป็นชุดเดียวกันเสมอ
 * - **ห้ามแก้ข้อความในนี้แบบไม่ตั้งใจ** เพราะกระทบรูปที่ gen ใหม่ทุกใบทั้งระบบ
 * @used-by
 * - {@link ./generate-article-images.helper.ts} (gen ยกชุดทั้งบทความ)
 * - {@link ./build-single-image-prompt.helper.ts} (วาดทีละใบจาก editor)
 */

/** โทนภาพร่วมของทุกรูป — ให้ทั้งบทความดูเป็นชุดเดียวกัน */
export const IMAGE_STYLE =
  "Bright, clean, photorealistic lifestyle photography of a modern Thai home interior featuring LG home appliances. Natural daylight, warm tone, shallow depth of field. No watermark, no readable text or lettering of any kind anywhere in the image.";

/**
 * โทนภาพของ "อินโฟกราฟิก" — คนละขั้วกับ IMAGE_STYLE โดยตั้งใจ
 *
 * ⚠️ IMAGE_STYLE สั่ง "ห้ามมีตัวหนังสือในภาพเด็ดขาด" ส่วนอันนี้ **ต้องมีตัวหนังสือ**
 * จึงต้องเลือกใช้อย่างใดอย่างหนึ่ง ห้ามต่อท้ายทั้งคู่ในคำสั่งเดียว (คำสั่งจะขัดกันเอง)
 *
 * ⚠️ ข้อจำกัดที่รู้อยู่แล้ว: โมเดลวาดอักษรไทยได้ไม่นิ่ง สระ/วรรณยุกต์ลอยผิดตำแหน่งได้
 * แก้ทีหลังไม่ได้ ต้องสั่งวาดใหม่อย่างเดียว — จึงบังคับให้คำน้อยและสั้นที่สุด เพื่อลดโอกาสเพี้ยน
 * ถ้าใช้จริงแล้วพบว่าเพี้ยนบ่อยจนรับไม่ได้ ทางแก้คือตัดตัวหนังสือออกจากภาพแล้วไปใส่ที่ caption แทน
 */
export const INFOGRAPHIC_STYLE =
  "Render this as a clean, modern flat-vector INFOGRAPHIC — not a photograph. " +
  "Flat illustration style with simple geometric icons, generous white background, clear visual hierarchy, and plenty of empty space. " +
  "Brand palette: warm yellow (#F3C152) as the accent, near-black (#1F2937) for text, soft grey (#F3F4F6) for panels. Use at most these three plus white. " +
  "Text in the image MUST be written in Thai script. " +
  "Keep the wording extremely short — a heading of at most 6 Thai words, and at most 4 labels of 1-3 Thai words each. Never write full sentences or paragraphs. " +
  "Spell every Thai word correctly with vowels and tone marks placed exactly on the right consonant. " +
  "No watermark, no logo, no brand name, no English text anywhere.";

/**
 * รูปอ้างอิงแบรนด์ — LG Subscribe ยังไม่มีชุดรูปอ้างอิง จึงเว้นว่างไว้
 * (ถ้ามีภายหลังให้อัปขึ้น R2 แล้วใส่ URL ที่นี่ พร้อมแก้ BRAND_LOCK ให้ตรงกับรูป)
 */
export const BRAND_REFERENCE_IMAGES = [] as string[];

/**
 * คำสั่งล็อกแบรนด์ — ไม่มีรูปอ้างอิง จึงอธิบายด้วยข้อความล้วน
 * เน้นให้เครื่องใช้ไฟฟ้าดูเป็นผลิตภัณฑ์จริงในบ้านไทย ไม่มีโลโก้/ตัวหนังสือ
 */
export const BRAND_LOCK =
  "The photo shows LG home appliances (air conditioner, air purifier, dehumidifier, dishwasher, refrigerator, washer/dryer, TV, water purifier and similar) in a realistic Thai home. " +
  "Render each appliance as a plausible modern LG product in clean white, silver or dark grey with a simple, minimal design, correct proportions and realistic scale relative to the room, furniture and people. " +
  "The appliance body must be blank — no logo, brand name, model label, display text or lettering of any kind. " +
  "IF a person appears, they are an ordinary Thai resident in everyday clothes using or living with the appliance. " +
  "IF a service technician appears, they wear a plain, neutral work shirt and trousers with no logo, badge or embroidery, and handle the appliance carefully. " +
  "If the scene calls for no people, show none. " +
  "Show only the appliance type the topic is about; do not add unrelated machines. " +
  "Build a completely new, natural scene — bright, tidy and lived-in.";

/**
 * บรีฟมุมภาพต่อรูป — กันทุกใบออกมาเป็นมุมเดียวกันหมด
 * ปก = ภาพกว้างของเครื่องในบ้าน, รูปแทรกให้เล่ามุมอื่นของหัวข้อนั้นแทน
 */
export const COVER_SHOT =
  "This is the cover image: a wide, inviting establishing shot of the appliance the article is about, installed and in everyday use in a bright Thai home. A resident enjoying the space is appropriate here.";

export const SECTION_SHOTS = [
  "This is an in-article image, NOT a cover. Do NOT repeat the wide cover shot. Instead illustrate the section topic itself — a close-up of the appliance feature being discussed (such as a filter, control panel area without text, door, drawer or vent), or the appliance placed in its room setting. Macro or detail framing.",
  "This is an in-article image, NOT a cover. Prefer a calm lifestyle scene: the appliance quietly doing its job in a bright, tidy Thai home, or people enjoying the comfortable space. Avoid repeating the cover's composition; if a person is not essential to the topic, leave people out entirely.",
];
