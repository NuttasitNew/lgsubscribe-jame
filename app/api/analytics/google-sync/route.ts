import { parseGoogleSnapshot, saveGoogleSnapshot, validSyncSignature } from "@/lib/analytics/google-sync";

export async function POST(request: Request) {
  if (Number(request.headers.get("content-length")) > 500000) return new Response(null, { status: 413 });
  const body = await request.text();
  if (Buffer.byteLength(body) > 500000) return new Response(null, { status: 413 });
  if (
    !validSyncSignature(
      body,
      request.headers.get("x-sync-timestamp"),
      request.headers.get("x-sync-signature"),
    )
  )
    return new Response(null, { status: 401 });
  let snapshot;
  try {
    snapshot = parseGoogleSnapshot(JSON.parse(body));
  } catch {
    return Response.json({ error: "Invalid report snapshot" }, { status: 400 });
  }
  try {
    return Response.json(
      { ok: true, updated: await saveGoogleSnapshot(snapshot) },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch {
    console.error("Google report snapshot write failed");
    return Response.json({ error: "Snapshot not saved" }, { status: 503 });
  }
}
