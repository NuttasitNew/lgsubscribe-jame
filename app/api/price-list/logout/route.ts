import { NextResponse } from "next/server";
import { sameOrigin } from "@/lib/backoffice/auth";
import { accessCookie } from "@/lib/price-list-access";

export async function POST(request: Request) {
  if (!sameOrigin(request)) return new Response(null, { status: 403 });
  const response = NextResponse.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
  response.cookies.delete(accessCookie);
  return response;
}
