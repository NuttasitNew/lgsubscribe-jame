import { NextResponse, type NextRequest } from "next/server";
import { decideHost, priceListHosts } from "@/lib/price-list-host";

export function proxy(request: NextRequest) {
  // Local dev only: Google calls back on localhost (it rejects price.localhost); hand it to the price host.
  const relay = process.env.PRICE_LIST_GOOGLE_REDIRECT_ORIGIN;
  if (relay && request.nextUrl.pathname === "/api/price-list/google/callback/") {
    const hosts = priceListHosts();
    const host = request.headers.get("host") ?? "";
    if (hosts[0] && host === new URL(relay).host) {
      const url = new URL(`${request.nextUrl.pathname}${request.nextUrl.search}`, relay);
      url.hostname = hosts[0];
      return NextResponse.redirect(url);
    }
  }

  const decision = decideHost(request.headers.get("host"), request.nextUrl.pathname, priceListHosts());
  if (decision.action === "next") return NextResponse.next();
  if (decision.action === "notFound") {
    return new NextResponse("Not Found", { status: 404, headers: { "X-Robots-Tag": "noindex, nofollow" } });
  }
  if (decision.action === "robots") {
    return new NextResponse("User-agent: *\nDisallow: /\n", { headers: { "Content-Type": "text/plain" } });
  }
  const url = request.nextUrl.clone();
  url.pathname = decision.pathname;
  const response = NextResponse.rewrite(url);
  response.headers.set("X-Robots-Tag", "noindex, nofollow");
  return response;
}
