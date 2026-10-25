import { describe, expect, it, vi } from "vitest";
import { insertCompareBlocks } from "@/feature/backoffice/seo/keyword-research/helper/build-compare-blocks.helper";
import type { CompareDataset } from "@/feature/backoffice/seo/keyword-research/type/seo-keyword.type";
import type { SeoArticleBlock } from "@/feature/backoffice/seo/seo-article/type/seo-article-block.type";

vi.mock("server-only", () => ({}));

const dataset: CompareDataset = {
  kind: "compare",
  brands: ["LG Subscribe", "แบรนด์ B"],
  rows: [
    {
      criterion: "ค่าบริการเริ่มต้น",
      cells: [
        { value: "เริ่ม 590 บาท/เดือน", sourceUrl: "https://www.lg.com/th/subscribe/" },
        { value: "ไม่มีข้อมูลเปิดเผย", sourceUrl: null },
      ],
    },
  ],
  verdicts: [],
  sources: [{ title: "lg.com", url: "https://www.lg.com/th/subscribe/" }],
  asOf: "2026-10-25",
};

const heading = (id: string, text: string): SeoArticleBlock => ({ id, type: "heading", level: 2, runs: [{ text }] });
const paragraph = (id: string): SeoArticleBlock => ({ id, type: "paragraph", runs: [{ text: id }] });

describe("compare table blocks", () => {
  it("puts the verified table at the end of the first section and sources before the closing section", () => {
    let n = 0;
    const blocks = insertCompareBlocks(
      [
        heading("h1", "สรุปเทียบ"),
        paragraph("p1"),
        { id: "ai-table", type: "table", rows: [] },
        heading("h2", "รายละเอียด"),
        paragraph("p2"),
        heading("h3", "สมัครกับเรา"),
        paragraph("p3"),
      ],
      dataset,
      () => `new-${n++}`
    );
    const ids = blocks.map((b) => (b.type === "heading" ? b.runs[0].text : b.type));

    expect(ids).toEqual([
      "สรุปเทียบ",
      "paragraph",
      "table",
      "callout",
      "รายละเอียด",
      "paragraph",
      "แหล่งอ้างอิง",
      "bulletList",
      "สมัครกับเรา",
      "paragraph",
    ]);
    // ตารางที่ AI พิมพ์เองถูกทิ้ง — เหลือเฉพาะตารางจากข้อมูลที่ตรวจแล้ว
    expect(blocks.filter((b) => b.type === "table")).toHaveLength(1);
  });

  it("links only cells that have a verified source", () => {
    const blocks = insertCompareBlocks([heading("h1", "a")], dataset, () => "x");
    const table = blocks.find((b) => b.type === "table");
    if (table?.type !== "table") throw new Error("no table");
    expect(table.rows[0].cells.every((c) => c.isHeader)).toBe(true);
    expect(table.rows[1].cells[1].runs[0].link).toBe("https://www.lg.com/th/subscribe/");
    expect(table.rows[1].cells[2].runs[0].link).toBeUndefined();
  });
});

describe("buy vs rent table", () => {
  const withBuyVsRent: CompareDataset = {
    ...dataset,
    buyVsRent: {
      productSlug: "wd516an",
      productName: "เครื่องกรองน้ำ LG (WD516AN)",
      rent: { monthly: 590, months: 60, sourceUrl: "https://www.lgthailand-subscribe.com/products/wd516an" },
      buy: { price: 24990, seller: "LG Thailand", sourceUrl: "https://www.lg.com/th/water-purifiers/wd516an/" },
      rows: [],
    },
  };

  it("goes under the writer's rent-vs-buy heading and computes the total from catalog numbers", () => {
    let n = 0;
    const blocks = insertCompareBlocks(
      [heading("h1", "สรุปเทียบ"), paragraph("p1"), heading("h2", "เช่ากับซื้อขาด แบบไหนคุ้มกว่า"), paragraph("p2"), heading("h3", "สมัครกับเรา")],
      withBuyVsRent,
      () => `id-${n++}`
    );
    const tables = blocks.flatMap((b, i) => (b.type === "table" ? [i] : []));
    expect(tables).toHaveLength(2);
    // ตารางที่สองอยู่หลังย่อหน้าของหัวข้อเช่า vs ซื้อ
    expect(blocks[tables[1] - 1]).toMatchObject({ id: "p2" });
    const table = blocks[tables[1]];
    if (table.type !== "table") throw new Error("no table");
    const total = table.rows.find((r) => r.cells[0].runs[0].text.startsWith("ยอดจ่ายรวม"));
    expect(total?.cells[1].runs[0].text).toContain((590 * 60).toLocaleString("th-TH"));
  });

  it("adds its own heading when the writer forgot one", () => {
    const blocks = insertCompareBlocks([heading("h1", "สรุปเทียบ"), paragraph("p1"), heading("h3", "สมัครกับเรา")], withBuyVsRent, () => "x");
    const headings = blocks.flatMap((b) => (b.type === "heading" ? [b.runs[0].text] : []));
    expect(headings).toEqual(["สรุปเทียบ", "เช่ากับซื้อขาด แบบไหนคุ้มกว่า", "แหล่งอ้างอิง", "สมัครกับเรา"]);
  });
});

describe("visited url guard", () => {
  it("matches urls regardless of www, trailing slash and query", async () => {
    const { isVisitedUrl } = await import("@/feature/backoffice/seo/keyword-research/server/run-web-research.helper");
    const visited = ["https://www.coway.co.th/rental/?utm=1"];
    expect(isVisitedUrl("https://coway.co.th/rental", visited)).toBe(true);
    expect(isVisitedUrl("https://coway.co.th/made-up-page", visited)).toBe(false);
    expect(isVisitedUrl(null, visited)).toBe(false);
  });
});
