import { NextResponse } from "next/server";
import { sameOrigin, sessionCookie } from "@/lib/backoffice/auth";

export async function POST(request: Request) {
  if (!sameOrigin(request)) return new Response(null, { status: 403 });
  const response = NextResponse.redirect(new URL("/backoffice/auth/login/", request.url), 303);
  response.cookies.set(sessionCookie, "", {
    path: "/",
    maxAge: 0,
    httpOnly: true,
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production",
  });
  return response;
}
