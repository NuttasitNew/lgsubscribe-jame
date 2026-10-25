import type { SeoArticleBlock, SeoArticleTableRow } from "../../seo-article/type/seo-article-block.type";
import type { BuyVsRentDataset, CompareDataset } from "../type/seo-keyword.type";

const formatThaiDate = (isoDate: string) =>
  new Intl.DateTimeFormat("th-TH", { day: "numeric", month: "long", year: "numeric", timeZone: "Asia/Bangkok" }).format(
    new Date(`${isoDate}T00:00:00+07:00`)
  );

/**
 * @description แปลงชุดข้อมูลเทียบแบรนด์ (ที่ตรวจแหล่งแล้ว) เป็นบล็อกตาราง — สร้างจากข้อมูลตรง ๆ ไม่ผ่าน AI
 * @logic
 * - ตารางไม่ให้ AI พิมพ์เอง เพราะ AI อาจปัดตัวเลข/สลับคอลัมน์ ทำให้ข้อมูลไม่ตรงกับแหล่งที่ตรวจแล้ว
 * - ช่องที่มีแหล่ง: ข้อความเป็นลิงก์ไปยังหน้าที่ยืนยัน (ผู้อ่านกดตรวจเองได้ = Trust ใน E-E-A-T)
 * - ใต้ตารางมีหมายเหตุ "ข้อมูล ณ วันที่" ตามหลักบทความเปรียบเทียบ (ราคา/เงื่อนไขเปลี่ยนได้)
 */
export const buildCompareTableBlocks = (dataset: CompareDataset, createId: () => string): SeoArticleBlock[] => {
  const header: SeoArticleTableRow = {
    cells: [{ runs: [{ text: "เกณฑ์" }], isHeader: true }, ...dataset.brands.map((brand) => ({ runs: [{ text: brand }], isHeader: true }))],
  };
  const body: SeoArticleTableRow[] = dataset.rows.map((row) => ({
    cells: [
      { runs: [{ text: row.criterion, bold: true }] },
      ...row.cells.map((cell) => ({
        runs: [cell.sourceUrl ? { text: cell.value, link: cell.sourceUrl } : { text: cell.value }],
      })),
    ],
  }));

  return [
    { id: createId(), type: "table", rows: [header, ...body] },
    {
      id: createId(),
      type: "callout",
      variant: "info",
      runs: [
        {
          text:
            `ข้อมูล ณ วันที่ ${formatThaiDate(dataset.asOf)} รวบรวมจากหน้าเว็บทางการของแต่ละแบรนด์ (กดที่ข้อความในตารางเพื่อดูแหล่งที่มา) ` +
            "ราคาและเงื่อนไขอาจเปลี่ยนตามโปรโมชันและรุ่นสินค้า ช่องที่เขียนว่า “ไม่มีข้อมูลเปิดเผย” คือหาแหล่งยืนยันจากผู้ให้บริการไม่พบ",
        },
      ],
    },
  ];
};

const baht = (amount: number) => `${amount.toLocaleString("th-TH")} บาท`;

/** หัวข้อที่ตัวเขียนต้องใช้สำหรับส่วนเช่า vs ซื้อขาด (ระบบหาหัวข้อนี้เพื่อแทรกตาราง) */
export const BUY_VS_RENT_HEADING = "เช่ากับซื้อขาด แบบไหนคุ้มกว่า";

/**
 * @description ตาราง "เช่ากับ LG Subscribe vs ซื้อขาด" ของรุ่นตัวแทน — ตัวเลขรวมคำนวณโดยโค้ด ไม่ให้ AI บวกเลขเอง
 * @logic
 * - แถวราคา: ค่าเช่าจากแคตตาล็อกเว็บเรา, ราคาซื้อจากหน้าที่เปิดยืนยันแล้ว (ไม่มี = "ไม่มีข้อมูลเปิดเผย")
 * - แถว "ยอดจ่ายรวม" = ค่าเช่า × จำนวนเดือน เทียบราคาซื้อ — โชว์ตรง ๆ แม้เช่าจะแพงกว่า เพราะความเป็นกลางคือสิ่งที่ทำให้ตารางน่าเชื่อ
 * - ใต้ตารางบอกสมมติฐานการคำนวณ (ไม่รวมค่าบำรุงรักษาฝั่งซื้อ, ไม่รวมดอกเบี้ยผ่อน)
 */
export const buildBuyVsRentBlocks = (data: BuyVsRentDataset, asOf: string, createId: () => string): SeoArticleBlock[] => {
  const cell = (text: string, link?: string | null) => ({ runs: [link ? { text, link } : { text }] });
  const row = (criterion: string, rent: ReturnType<typeof cell>, buy: ReturnType<typeof cell>): SeoArticleTableRow => ({
    cells: [{ runs: [{ text: criterion, bold: true }] }, rent, buy],
  });

  const rentTotal = data.rent.months ? data.rent.monthly * data.rent.months : null;
  const rows: SeoArticleTableRow[] = [
    {
      cells: [
        { runs: [{ text: data.productName }], isHeader: true },
        { runs: [{ text: "เช่ากับ LG Subscribe" }], isHeader: true },
        { runs: [{ text: "ซื้อขาด" }], isHeader: true },
      ],
    },
    row(
      "ราคา",
      cell(`เริ่ม ${baht(data.rent.monthly)}/เดือน${data.rent.months ? ` × ${data.rent.months} เดือน` : ""}`, data.rent.sourceUrl),
      data.buy ? cell(`${baht(data.buy.price)} จ่ายครั้งเดียว (${data.buy.seller})`, data.buy.sourceUrl) : cell("ไม่มีข้อมูลเปิดเผย")
    ),
    row("เงินก้อนที่ต้องมีวันแรก", cell("จ่ายเป็นรายเดือน ไม่ต้องจ่ายเต็มราคา"), cell(data.buy ? baht(data.buy.price) : "เต็มราคาสินค้า")),
  ];
  if (rentTotal != null && data.buy) {
    rows.push(row("ยอดจ่ายรวม (คำนวณ)", cell(`ประมาณ ${baht(rentTotal)} ตลอดสัญญา`), cell(baht(data.buy.price))));
  }
  for (const item of data.rows) {
    rows.push(row(item.criterion, cell(item.cells[0].value, item.cells[0].sourceUrl), cell(item.cells[1].value, item.cells[1].sourceUrl)));
  }

  return [
    { id: createId(), type: "table", rows },
    {
      id: createId(),
      type: "callout",
      variant: "info",
      runs: [
        {
          text:
            `ข้อมูล ณ วันที่ ${formatThaiDate(asOf)} — ยอดจ่ายรวมฝั่งเช่าคำนวณจากราคาเริ่มต้นต่อเดือน × จำนวนเดือนของสัญญา ` +
            "ฝั่งซื้อขาดเป็นราคาสินค้าอย่างเดียว ยังไม่รวมค่าบำรุงรักษา อะไหล่สิ้นเปลือง หรือดอกเบี้ยหากผ่อน ราคาจริงอาจเปลี่ยนตามโปรโมชัน",
        },
      ],
    },
  ];
};

/** หัวข้อ "แหล่งอ้างอิง" ท้ายบทความ — ลิงก์ทุกแหล่งที่ใช้จริงในตาราง */
export const buildSourceBlocks = (sources: CompareDataset["sources"], createId: () => string): SeoArticleBlock[] =>
  sources.length === 0
    ? []
    : [
        { id: createId(), type: "heading", level: 2, runs: [{ text: "แหล่งอ้างอิง" }] },
        {
          id: createId(),
          type: "bulletList",
          items: sources.map((source) => ({ runs: [{ text: source.title, link: source.url }] })),
        },
      ];

/**
 * แทรกตารางไว้ท้ายหัวข้อ H2 แรก (ผู้อ่านเห็นตารางเร็ว ตามหลัก answer-first) และแหล่งอ้างอิงไว้ก่อนหัวข้อสุดท้าย (CTA)
 */
export const insertCompareBlocks = (
  blocks: SeoArticleBlock[],
  dataset: CompareDataset,
  createId: () => string
): SeoArticleBlock[] => {
  const withoutAiTables = blocks.filter((block) => block.type !== "table");
  const headingIndexes = withoutAiTables
    .map((block, index) => (block.type === "heading" && block.level === 2 ? index : -1))
    .filter((index) => index >= 0);

  const tableBlocks = buildCompareTableBlocks(dataset, createId);
  const sourceBlocks = buildSourceBlocks(dataset.sources, createId);

  // ท้ายหัวข้อแรก = ก่อนหัวข้อที่สอง (ไม่มีหัวข้อที่สอง → ท้ายบทความ)
  const tableAt = headingIndexes[1] ?? withoutAiTables.length;
  const result = [...withoutAiTables.slice(0, tableAt), ...tableBlocks, ...withoutAiTables.slice(tableAt)];

  const withBuyVsRent = dataset.buyVsRent ? insertBuyVsRentBlocks(result, dataset.buyVsRent, dataset.asOf, createId) : result;

  const lastHeading = withBuyVsRent.map((b) => b.type === "heading" && b.level === 2).lastIndexOf(true);
  const sourcesAt = lastHeading > tableAt ? lastHeading : withBuyVsRent.length;
  return [...withBuyVsRent.slice(0, sourcesAt), ...sourceBlocks, ...withBuyVsRent.slice(sourcesAt)];
};

const headingText = (block: SeoArticleBlock) =>
  block.type === "heading" ? block.runs.map((run) => run.text).join("") : "";

/**
 * ตารางเช่า vs ซื้อขาด ไปไว้ท้ายหัวข้อ H2 ที่พูดถึงทั้ง "เช่า" และ "ซื้อ" (ตัวเขียนถูกสั่งให้มีหัวข้อนี้)
 * ไม่เจอหัวข้อ → ระบบสร้างหัวข้อ {@link BUY_VS_RENT_HEADING} เองแล้ววางไว้ก่อนหัวข้อสุดท้าย (CTA)
 */
const insertBuyVsRentBlocks = (
  blocks: SeoArticleBlock[],
  data: BuyVsRentDataset,
  asOf: string,
  createId: () => string
): SeoArticleBlock[] => {
  const tableBlocks = buildBuyVsRentBlocks(data, asOf, createId);
  const h2Indexes = blocks
    .map((block, index) => (block.type === "heading" && block.level === 2 ? index : -1))
    .filter((index) => index >= 0);
  const target = h2Indexes.find((index) => /เช่า/.test(headingText(blocks[index])) && /ซื้อ/.test(headingText(blocks[index])));

  if (target != null) {
    const sectionEnd = h2Indexes.find((index) => index > target) ?? blocks.length;
    return [...blocks.slice(0, sectionEnd), ...tableBlocks, ...blocks.slice(sectionEnd)];
  }
  const lastHeading = h2Indexes.at(-1);
  const at = lastHeading != null && lastHeading > (h2Indexes[0] ?? 0) ? lastHeading : blocks.length;
  return [
    ...blocks.slice(0, at),
    { id: createId(), type: "heading", level: 2, runs: [{ text: BUY_VS_RENT_HEADING }] },
    ...tableBlocks,
    ...blocks.slice(at),
  ];
};
