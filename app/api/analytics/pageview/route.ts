import { createHmac, randomUUID } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { getPrisma } from "@/lib/db/prisma";
import { sameOrigin } from "@/lib/backoffice/auth";
import { normalizeAttribution } from "@/lib/analytics/attribution";

const uuid = /^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i;
const visitorCookie = "lg_web_visitor";
const sessionCookie = "lg_web_session";

export async function POST(request: NextRequest) {
  if (!sameOrigin(request)) return new Response(null, { status: 403 });
  if (process.env.WEB_ANALYTICS_ENABLED !== "true") return new Response(null, { status: 204 });
  if (/bot|crawler|spider|headless|lighthouse|preview/i.test(request.headers.get("user-agent") ?? ""))
    return new Response(null, { status: 204 });
  if (Number(request.headers.get("content-length")) > 4096) return new Response(null, { status: 413 });
  let data;
  try {
    data = await request.json();
  } catch {
    return new Response(null, { status: 400 });
  }
  if (
    !data ||
    !["analytics", "all"].includes(data.consent) ||
    !uuid.test(data.eventId ?? "") ||
    typeof data.path !== "string" ||
    data.path.length > 500 ||
    !data.path.startsWith("/") ||
    data.path.startsWith("//") ||
    /[?#\\\x00-\x1f]/.test(data.path) ||
    /^\/(backoffice|api)(\/|$)/.test(data.path)
  )
    return new Response(null, { status: 400 });
  const secret = process.env.WEB_ANALYTICS_SECRET;
  if (!secret || secret.length < 32) return new Response(null, { status: 503 });
  const existing = request.cookies.get(visitorCookie)?.value;
  const visitor = existing && uuid.test(existing) ? existing : randomUUID();
  const visitorHash = createHmac("sha256", secret).update(visitor).digest("hex");
  const existingSession = request.cookies.get(sessionCookie)?.value;
  const session = existingSession && uuid.test(existingSession) ? existingSession : randomUUID();
  const sessionHash = createHmac("sha256", secret).update(session).digest("hex");
  const attribution = normalizeAttribution(data.attribution);
  const { clickId, ...source } = attribution;
  const eventType = data.eventType ?? "page_view";
  if (
    !["page_view", "contact_click"].includes(eventType) ||
    (eventType === "contact_click" && !["line", "phone", "email"].includes(data.contactMethod))
  )
    return new Response(null, { status: 400 });
  const agent = request.headers.get("user-agent") ?? "";
  const device = /ipad|tablet/i.test(agent)
    ? "tablet"
    : /mobile|iphone|android/i.test(agent)
      ? "mobile"
      : "desktop";
  const countryHeader = request.headers.get("x-vercel-ip-country");
  const country = countryHeader && /^[A-Z]{2}$/.test(countryHeader) ? countryHeader : null;
  try {
    await getPrisma().webPageView.createMany({
      data: {
        eventId: data.eventId,
        visitorHash,
        path: data.path,
        sessionHash,
        eventType,
        contactMethod: eventType === "contact_click" ? data.contactMethod : null,
        ...source,
        clickIdHash:
          clickId && data.consent === "all"
            ? createHmac("sha256", secret).update(clickId).digest("hex")
            : null,
        device,
        country,
      },
      skipDuplicates: true,
    });
    const response = new NextResponse(null, { status: 204, headers: { "Cache-Control": "no-store" } });
    if (visitor !== existing)
      response.cookies.set(visitorCookie, visitor, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 365 * 86400,
        path: "/",
      });
    response.cookies.set(sessionCookie, session, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 1800,
      path: "/",
    });
    return response;
  } catch {
    console.error("Web analytics database write failed");
    return new Response(null, { status: 503 });
  }
}

export async function DELETE(request: NextRequest) {
  if (!sameOrigin(request)) return new Response(null, { status: 403 });
  const response = new NextResponse(null, { status: 204 });
  for (const name of [visitorCookie, sessionCookie])
    response.cookies.set(name, "", {
      path: "/",
      maxAge: 0,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
    });
  return response;
}
