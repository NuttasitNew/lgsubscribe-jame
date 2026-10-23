import type {
  SeoArticleBlock,
  SeoArticleBlockContent,
  SeoArticleTextRun,
} from "@/feature/backoffice/seo/seo-article/type/seo-article-block.type";

/** ชุดข้อมูลทั้งหมดที่หน้าแก้ไขบทความแก้ได้ — ใช้เทียบก่อน/หลังเพื่อตัดสินว่าปุ่มบันทึกควรกดได้ไหม */
export interface SeoArticleEditSnapshot {
  title: string;
  slug: string;
  metaDescription: string;
  keywords: string[];
  /** undefined = legacy draft without this field; null = explicitly clear the target. */
  targetKeyword?: string | null;
  content: SeoArticleBlockContent;
  /**
   * meta ภาษาอังกฤษของหน้า /en/blog/<slug> — ทั้ง 3 ช่องว่าง = บทความนี้ไม่มีหน้าอังกฤษ (เว็บคืน 404 ตามเดิม)
   * optional เพราะบทความเดิมทั้งหมดไม่มีค่าเหล่านี้ และร่างที่ค้างใน localStorage ก่อนหน้านี้ก็ไม่มี key นี้
   */
  titleEn?: string;
  metaDescriptionEn?: string;
  keywordsEn?: string[];
}

/** ทำ run ให้อยู่ในรูปมาตรฐาน: ตัด flag ที่ไม่ได้ติด + คุมลำดับ key ให้คงที่ */
function normalizeRuns(runs: SeoArticleTextRun[] | undefined): unknown[] {
  return (runs || [])
    .filter((run) => run?.text)
    .map((run) => [run.text, run.bold ? 1 : 0, run.italic ? 1 : 0, run.link || ""]);
}

/**
 * ทำ block ให้อยู่ในรูปมาตรฐานสำหรับเปรียบเทียบ
 * - **ตัด `id` ทิ้งเสมอ** เพราะ id เป็นแค่ key ตอนลากสลับ ไม่ใช่เนื้อหา
 *   (BlockNote สร้าง id ใหม่ให้ block ที่ paste/แตกบรรทัด ถ้าไม่ตัดจะกลายเป็น "แก้ไขแล้ว" ทั้งที่ตัวอักษรเหมือนเดิม)
 * - field optional ที่ไม่มีค่า ถูกแทนด้วยค่าว่างตัวเดียวกัน เพื่อให้ `undefined` กับ "ไม่มี key" เท่ากัน
 */
function normalizeBlock(block: SeoArticleBlock): unknown {
  switch (block.type) {
    case "paragraph":
    case "quote":
      return [block.type, normalizeRuns(block.runs)];
    case "heading":
      return [block.type, block.level, normalizeRuns(block.runs)];
    case "callout":
      return [block.type, block.variant, normalizeRuns(block.runs)];
    case "bulletList":
    case "numberedList":
      return [block.type, (block.items || []).map((item) => normalizeRuns(item.runs))];
    case "image":
      return [block.type, block.url, block.alt || "", block.caption || "", block.width || 0, block.height || 0];
    case "table":
      return [
        block.type,
        (block.rows || []).map((row) =>
          (row.cells || []).map((cell) => [normalizeRuns(cell.runs), cell.isHeader ? 1 : 0])
        ),
      ];
    case "divider":
      return [block.type];
  }
}

/** ทำทั้ง snapshot ให้เป็นสตริงมาตรฐานที่เทียบกันตรง ๆ ได้ */
function normalizeSnapshot(snapshot: SeoArticleEditSnapshot): string {
  const content = snapshot.content;

  return JSON.stringify([
    snapshot.targetKeyword?.trim() || "",
    snapshot.title.trim(),
    snapshot.slug.trim(),
    snapshot.metaDescription.trim(),
    snapshot.keywords.map((keyword) => keyword.trim()).filter(Boolean),
    content?.coverImage?.trim() || "",
    content?.coverImageAlt?.trim() || "",
    content?.category || "",
    (content?.blocks || []).map(normalizeBlock),
    (content?.faq || [])
      .filter((item) => item?.question?.trim() || item?.answer?.trim())
      .map((item) => [item.question.trim(), item.answer.trim()]),
    // meta EN — "ไม่มี key" กับ "ช่องว่าง" ต้องเท่ากัน ไม่งั้นแค่เปิดหน้าแล้ว blur ช่องอังกฤษก็กลายเป็น "แก้ไขแล้ว"
    snapshot.titleEn?.trim() || "",
    snapshot.metaDescriptionEn?.trim() || "",
    (snapshot.keywordsEn || []).map((keyword) => keyword.trim()).filter(Boolean),
  ]);
}

/**
 * @description เทียบเนื้อหาบทความ SEO ก่อน/หลังแก้ ว่า "เปลี่ยนของจริง" หรือไม่
 * @logic
 * - เทียบจากเนื้อหาที่มีผลต่อไฟล์ที่ push ขึ้นเว็บเท่านั้น: title/slug/meta/keywords/cover/หมวด/บล็อก/FAQ
 *   รวมถึง meta EN (titleEn/metaDescriptionEn/keywordsEn) เพราะกรอกแล้วเว็บจะเปิดหน้า /en/blog/<slug> ให้ทันที
 *   ถ้าไม่นับ ผู้ใช้กรอกช่องอังกฤษเสร็จแล้วปุ่มบันทึกจะยังกดไม่ได้ = งานหายทั้งชุด
 * - **ไม่นับ id ของ block และช่องว่างหัวท้าย** เป็นความต่าง
 * - ใช้ปิดปุ่มบันทึกเมื่อไม่มีอะไรเปลี่ยน — บทความที่เผยแพร่แล้วการกดบันทึก = commit ขึ้น GitHub = deploy เว็บใหม่
 *   ถ้าไม่กันไว้ แค่ "เปิดดูแล้วปิด" ก็จะ deploy ใหม่ทุกครั้ง
 * @param before snapshot ตอนโหลดบทความมา (ของจริงในฐานข้อมูล)
 * @param after snapshot ปัจจุบันในหน้าแก้ไข
 * @returns true = เนื้อหาเหมือนเดิมทุกอย่าง (ควร disable ปุ่มบันทึก)
 * @used-by seo-article-editor-page.tsx, seo-article-editor.store.ts
 */
export function isSeoArticleEditEqual(before: SeoArticleEditSnapshot, after: SeoArticleEditSnapshot): boolean {
  return normalizeSnapshot(before) === normalizeSnapshot(after);
}
