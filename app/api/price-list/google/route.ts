import { NextResponse } from "next/server";
import {
  authorizationUrl,
  googleEnabled,
  newOAuthState,
  oauthCookie,
  oauthMaxAge,
  requestOrigin,
} from "@/lib/price-list-google";

/** "เข้าสู่ระบบด้วย Google" on the gate: off to Google's account chooser. */
export async function GET(request: Request) {
  if (!googleEnabled()) return new Response(null, { status: 404 });
  const { state, nonce } = newOAuthState();
  const response = NextResponse.redirect(authorizationUrl(requestOrigin(request), state, nonce));
  response.cookies.set(oauthCookie, `${state}.${nonce}`, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/api/price-list/google/",
    maxAge: oauthMaxAge,
  });
  response.headers.set("Cache-Control", "no-store");
  return response;
}
