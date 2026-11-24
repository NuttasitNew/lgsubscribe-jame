import type { Metadata, Viewport } from "next";
import { PriceListBrowser } from "@/feature/staff/price-list/components/price-list-browser";
import { bangkokToday, getPriceList, groupByModel } from "@/lib/price-list";
import { subscribeDayCombos } from "@/lib/subscribe-day";

// Staff tool: public for now, will move behind backoffice login. Never index it.
export const metadata: Metadata = {
  title: "ราคาและตารางผ่อน (พนักงาน)",
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#ffffff",
};

export default async function PriceListPage({
  searchParams,
}: {
  searchParams: Promise<{ model?: string | string[]; customer?: string | string[] }>;
}) {
  const { model, customer } = await searchParams;
  const priceList = getPriceList();
  return (
    <PriceListBrowser
      models={groupByModel(priceList.items)}
      meta={{ source: priceList.source, version: priceList.version, period: priceList.period }}
      initialModel={typeof model === "string" ? model : undefined}
      initialCustomer={customer === "new" || customer === "existing" ? customer : undefined}
      combos={[...priceList.combos.map((c) => ({ ...c, source: "pdf" as const })), ...subscribeDayCombos]}
      today={bangkokToday()}
    />
  );
}
