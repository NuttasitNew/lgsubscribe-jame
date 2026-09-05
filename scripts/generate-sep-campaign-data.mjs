#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const inspectPath = path.join(
  root,
  "outputs/01a05dc4-ca6a-7930-8149-7b8ac462ac12/Price list Sep_V3.xlsx.inspect.ndjson",
);
const outputPath = path.join(root, "lib/sep-subscription-campaign.ts");

const lines = fs.readFileSync(inspectPath, "utf8").trim().split(/\r?\n/);
const priceTable = lines
  .map((line) => JSON.parse(line))
  .find((entry) => entry.kind === "table" && entry.sheet === "รายการราคา");

if (!priceTable) throw new Error(`Missing รายการราคา table in ${inspectPath}`);

const [headers, ...rows] = priceTable.values;
const column = Object.fromEntries(headers.map((header, index) => [header, index]));
const subscriptionRows = rows.filter(
  (row) => row[column["แบบการขาย"]] === "Subscription" && row[column["รุ่น"]],
);
const groups = new Map();

for (const row of subscriptionRows) {
  const model = row[column["รุ่น"]];
  const entry = groups.get(model) ?? {
    model,
    category: row[column["หมวดสินค้า"]],
    details: row[column["รายละเอียดรุ่น"]],
    page: row[column["หน้า"]],
    monthlyPrices: [],
    promotions: new Set(),
  };
  const price = row[column["ราคาปกติต่อเดือน"]];
  if (Number.isFinite(price)) entry.monthlyPrices.push(price);
  const promotion = String(row[column["รายละเอียดโปรโมชัน"]] ?? "").trim();
  if (promotion && promotion !== "-") entry.promotions.add(promotion);
  groups.set(model, entry);
}

const products = [...groups.values()].map((entry) => ({
  model: entry.model,
  category: entry.category,
  details: entry.details,
  sourcePage: entry.page,
  monthlyPrice: Math.min(...entry.monthlyPrices),
  promotions: [...entry.promotions],
}));

const contents = `/** Generated from Price list Sep_V3.xlsx. Run scripts/generate-sep-campaign-data.mjs. */
export type SepSubscriptionCampaignProduct = {
  model: string;
  category: string;
  details: string;
  sourcePage: number;
  monthlyPrice: number;
  promotions: readonly string[];
};

export const sepSubscriptionCampaignProducts = ${JSON.stringify(products, null, 2)} as const satisfies readonly SepSubscriptionCampaignProduct[];
`;

fs.writeFileSync(outputPath, contents);
console.log(`Wrote ${products.length} Subscription products to ${path.relative(root, outputPath)}`);
