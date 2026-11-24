import { cookies } from "next/headers";
import type { Prisma } from "@prisma/client";
import { getPrisma } from "@/lib/db/prisma";
import { accessCookie, readAccessCode } from "@/lib/price-list-access";
import { parseActivity } from "@/lib/price-list-activity";

/** Batched staff actions from the price page (sent every few seconds and when the tab is hidden). */
export async function POST(request: Request) {
  if (Number(request.headers.get("content-length")) > 64 * 1024) return new Response(null, { status: 413 });
  try {
    const code = await readAccessCode((await cookies()).get(accessCookie)?.value);
    if (!code) return new Response(null, { status: 401 });
    const batch = parseActivity(await request.json().catch(() => null));
    if (!batch) return new Response(null, { status: 400 });
    if (batch.events.length > 0) {
      await getPrisma().priceListActivity.createMany({
        data: batch.events.map((e) => ({
          code,
          session: batch.session,
          kind: e.kind,
          detail: (e.detail as Prisma.InputJsonObject | undefined) ?? undefined,
          createdAt: new Date(e.at),
        })),
      });
    }
    return new Response(null, { status: 204 });
  } catch (reason) {
    console.error("price-list activity failed", reason);
    return new Response(null, { status: 503 });
  }
}
