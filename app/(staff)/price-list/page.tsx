import type { Metadata, Viewport } from "next";
import { cookies, headers } from "next/headers";
import { after } from "next/server";
import { PriceListBrowser } from "@/feature/staff/price-list/components/price-list-browser";
import { bangkokToday, getPriceList, groupByModel } from "@/lib/price-list";
import { subscribeDayCombos } from "@/lib/subscribe-day";
import { accessCookie, logAccess, readAccessCode } from "@/lib/price-list-access";
import { PriceListGate } from "@/feature/staff/price-list/components/price-list-gate";

// Staff tool on its own hostname: never index it and drop every hint of the public site
// (brand title, canonical, Open Graph, keywords) the root layout would add.
export const metadata: Metadata = {
  title: { absolute: "ราคาและตารางผ่อน" },
  description: null,
  keywords: null,
  authors: null,
  creator: null,
  publisher: null,
  category: null,
  alternates: null,
  openGraph: null,
  twitter: null,
  manifest: null,
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
  // Staff only: any active code from the backoffice; every open is logged per code.
  const code = await readAccessCode((await cookies()).get(accessCookie)?.value).catch(() => null);
  if (!code) return <PriceListGate />;
  const userAgent = (await headers()).get("user-agent");
  after(() => logAccess(code, "view", userAgent).catch(() => undefined));

  const { model, customer } = await searchParams;
  const priceList = getPriceList();
  return (
    <PriceListBrowser
      // Staff quote Subscription only: outright (ซื้อขาด) rows are left out of the page.
      models={groupByModel(priceList.items.filter((item) => item.saleType !== "Outright"))}
      meta={{ source: priceList.source, version: priceList.version, period: priceList.period }}
      initialModel={typeof model === "string" ? model : undefined}
      initialCustomer={customer === "new" || customer === "existing" ? customer : undefined}
      combos={[...priceList.combos.map((c) => ({ ...c, source: "pdf" as const })), ...subscribeDayCombos]}
      today={bangkokToday()}
      accessCode={code}
    />
  );
}
