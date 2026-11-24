import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { accessMaxAge } from "@/lib/price-list-access";
import { priceListHosts } from "@/lib/price-list-host";
import {
  createIdentityToken,
  exchangeCode,
  googleCookie,
  googleEnabled,
  oauthCookie,
  requestOrigin,
} from "@/lib/price-list-google";

const same = (a: string, b: string) =>
  a.length === b.length && timingSafeEqual(Buffer.from(a), Buffer.from(b));

/** Google sends staff back here; keep the verified account in a signed cookie, then show the code step. */
export async function GET(request: Request) {
  if (!googleEnabled()) return new Response(null, { status: 404 });
  const origin = requestOrigin(request);
  const host = new URL(origin).hostname;
  const home = new URL(priceListHosts().includes(host) ? "/" : "/price-list/", origin);
  const params = new URL(request.url).searchParams;
  const saved = request.headers.get("cookie")?.match(new RegExp(`(?:^|; )${oauthCookie}=([^;]+)`))?.[1] ?? "";
  const [state, nonce] = saved.split(".");
  const code = params.get("code");
  const fail = (reason: string) => {
    home.searchParams.set("google", reason);
    const response = NextResponse.redirect(home);
    response.cookies.delete({ name: oauthCookie, path: "/api/price-list/google/" });
    return response;
  };
  if (params.get("error")) return fail("cancelled");
  if (!code || !state || !nonce || !same(params.get("state") ?? "", state)) return fail("expired");
  try {
    const identity = await exchangeCode(code, origin, nonce);
    const response = NextResponse.redirect(home);
    response.cookies.delete({ name: oauthCookie, path: "/api/price-list/google/" });
    response.cookies.set(googleCookie, createIdentityToken(identity), {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: accessMaxAge,
    });
    response.headers.set("Cache-Control", "no-store");
    return response;
  } catch (reason) {
    console.error("price-list google sign-in failed", reason);
    return fail("failed");
  }
}
