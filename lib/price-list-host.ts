/**
 * The staff price list lives on its own hostnames (env PRICE_LIST_HOSTS, comma separated)
 * so the public site never reveals it. The hostnames stay out of this public repo.
 */
export type HostDecision =
  | { action: "next" }
  | { action: "rewrite"; pathname: string }
  | { action: "robots" }
  | { action: "notFound" };

const PRICE_PATHS = ["/price-list", "/api/price-list"];
// Framework assets and public files the price page needs on its own host.
const SHARED_PREFIXES = ["/_next/", "/images/"];

export function priceListHosts(raw = process.env.PRICE_LIST_HOSTS): string[] {
  return (raw ?? "")
    .split(",")
    .map((h) => h.trim().toLowerCase())
    .filter(Boolean);
}

function isPricePath(pathname: string) {
  return PRICE_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

export function decideHost(host: string | null, pathname: string, hosts: string[]): HostDecision {
  // Not configured (local dev): everything stays on one host.
  if (hosts.length === 0) return { action: "next" };
  const name = (host ?? "").toLowerCase().replace(/:\d+$/, "");
  if (!hosts.includes(name)) return isPricePath(pathname) ? { action: "notFound" } : { action: "next" };

  if (pathname === "/") return { action: "rewrite", pathname: "/price-list/" };
  if (pathname === "/robots.txt") return { action: "robots" };
  if (isPricePath(pathname)) return { action: "next" };
  if (SHARED_PREFIXES.some((p) => pathname.startsWith(p))) return { action: "next" };
  if (pathname === "/icon.svg" || pathname === "/favicon.ico") return { action: "next" };
  return { action: "notFound" };
}
