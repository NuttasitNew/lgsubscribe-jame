import { NextResponse, type NextRequest } from "next/server";
import { decideHost, priceListHosts } from "@/lib/price-list-host";

export function proxy(request: NextRequest) {
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
