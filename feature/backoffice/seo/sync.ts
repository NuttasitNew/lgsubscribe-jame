import { getPrisma } from "@/lib/db/prisma";
import { fetchKeywordMetrics, getGoogleAccessToken } from "./google";
import { parsePeriod, SeoInputError } from "./validation";

// Server-only caller must authenticate (Server Action or cron bearer token).
export async function syncSearchConsole(start: string, end: string) {
  const period = parsePeriod(start, end);
  const prisma = getPrisma();
  const keywords = await prisma.seoKeyword.findMany({
    where: { active: true },
    orderBy: { createdAt: "asc" },
  });
  if (!keywords.length) throw new SeoInputError("เพิ่มคำค้นหาที่ต้องติดตามก่อน");
  if (keywords.length > 100) throw new SeoInputError("ซิงก์อัตโนมัติรองรับคำที่เปิดติดตามสูงสุด 100 คำ");
  const run = await prisma.seoSyncRun.create({ data: { ...period, source: "GSC_API", status: "RUNNING" } });
  try {
    const token = await getGoogleAccessToken();
    const measurements = [];
    for (let i = 0; i < keywords.length; i += 4) {
      measurements.push(
        ...(await Promise.all(
          keywords
            .slice(i, i + 4)
            .map(async (keyword) => ({
              keywordId: keyword.id,
              ...(await fetchKeywordMetrics(token, keyword, start, end)),
            })),
        )),
      );
    }
    await prisma.$transaction([
      ...measurements.map((data) =>
        prisma.seoMeasurement.upsert({
          where: {
            keywordId_periodStart_periodEnd_source: {
              keywordId: data.keywordId,
              ...period,
              source: "GSC_API",
            },
          },
          create: { ...data, ...period, source: "GSC_API" },
          update: { ...data, measuredAt: new Date() },
        }),
      ),
      prisma.seoSyncRun.update({
        where: { id: run.id },
        data: { status: "SUCCESS", processed: measurements.length, finishedAt: new Date() },
      }),
    ]);
    return measurements.length;
  } catch (error) {
    const message =
      error instanceof SeoInputError ? error.message : "ซิงก์ไม่สำเร็จ กรุณาตรวจการเชื่อมต่อแล้วลองใหม่";
    await prisma.seoSyncRun.update({
      where: { id: run.id },
      data: { status: "FAILED", message, finishedAt: new Date() },
    });
    throw new SeoInputError(message);
  }
}
