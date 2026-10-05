import Link from "next/link";
import { Button } from "@/components/ui/button";
import { getPrisma } from "@/lib/db/prisma";
import { requireBackofficeSession } from "@/lib/backoffice/auth";
import { ReportTable } from "./report-table";
const date = new Intl.DateTimeFormat("th-TH", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "Asia/Bangkok",
});
const cell = "border-t px-4 py-3 text-right";
export async function LineDirectory({
  kind,
  searchParams,
}: {
  kind: "users" | "messages";
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireBackofficeSession("line.view");
  const params = await searchParams;
  const query = typeof params.q === "string" ? params.q.trim().slice(0, 100) : "";
  const number = typeof params.page === "string" ? Number(params.page) : 1;
  const page = Number.isSafeInteger(number) && number > 0 && number <= 10000 ? number : 1;
  const take = 25;
  const prisma = getPrisma();
  const path = `/backoffice/line/${kind}/`;
  const title = kind === "users" ? "ผู้ใช้ LINE" : "ข้อความ LINE";
  const userWhere = query
    ? {
        OR: [
          { displayName: { contains: query, mode: "insensitive" as const } },
          { userLineId: { contains: query } },
        ],
      }
    : {};
  const messageWhere = query ? { text: { contains: query, mode: "insensitive" as const } } : {};
  const users =
    kind === "users"
      ? await prisma.lineUser.findMany({
          where: userWhere,
          orderBy: [{ lastSeenAt: "desc" }, { userLineId: "asc" }],
          skip: (page - 1) * take,
          take: take + 1,
          select: { userLineId: true, displayName: true, isFollowing: true, lastSeenAt: true },
        })
      : [];
  const messages =
    kind === "messages"
      ? await prisma.lineMessage.findMany({
          where: messageWhere,
          orderBy: [{ timestamp: "desc" }, { lineMessageId: "asc" }],
          skip: (page - 1) * take,
          take: take + 1,
          select: {
            lineMessageId: true,
            text: true,
            messageType: true,
            timestamp: true,
            user: { select: { displayName: true } },
          },
        })
      : [];
  const hasNext = (kind === "users" ? users : messages).length > take;
  const link = (next: number) => `${path}?${new URLSearchParams({ q: query, page: String(next) })}`;
  return (
    <main className="mx-auto max-w-6xl space-y-5 px-4 py-6 sm:px-6">
      <header>
        <h1 className="text-2xl font-semibold">{title}</h1>
        <p className="mt-2 text-sm text-slate-500">ข้อมูลที่รับจาก LINE webhook · แสดงครั้งละ 25 รายการ</p>
      </header>
      <form action={path} className="flex flex-wrap items-end gap-3 rounded-xl border bg-white p-4">
        <label className="min-w-0 flex-1 text-sm">
          {kind === "users" ? "ค้นหาชื่อหรือ LINE ID" : "ค้นหาข้อความ"}
          <input
            name="q"
            defaultValue={query}
            maxLength={100}
            className="mt-1 h-11 w-full rounded-md border px-3 text-base"
          />
        </label>
        <Button type="submit" className="min-h-11">
          ค้นหา
        </Button>
        {query && (
          <Button asChild variant="outline">
            <Link href={path}>ล้างคำค้น</Link>
          </Button>
        )}
      </form>
      <ReportTable
        title={title}
        columns={
          kind === "users"
            ? ["ชื่อ / LINE ID", "สถานะ", "เข้าล่าสุด"]
            : ["ข้อความ", "ผู้ส่ง", "ประเภท", "วันเวลา"]
        }
      >
        {kind === "users"
          ? users.slice(0, take).map((user) => (
              <tr key={user.userLineId}>
                <th scope="row" className="border-t px-4 py-3 text-left font-normal">
                  <p className="break-words">{user.displayName}</p>
                  <p className="mt-1 break-all text-xs text-slate-500">{user.userLineId}</p>
                </th>
                <td className={cell}>{user.isFollowing ? "กำลังติดตาม" : "ไม่ได้ติดตาม"}</td>
                <td className={cell}>{date.format(user.lastSeenAt)}</td>
              </tr>
            ))
          : messages.slice(0, take).map((message) => (
              <tr key={message.lineMessageId}>
                <th
                  scope="row"
                  className="max-w-md break-words [overflow-wrap:anywhere] border-t px-4 py-3 text-left font-normal"
                >
                  {message.text ?? "ข้อความที่ไม่ใช่ข้อความตัวอักษร"}
                </th>
                <td className={`${cell} break-words`}>{message.user?.displayName ?? "ไม่ระบุผู้ส่ง"}</td>
                <td className={cell}>{message.messageType}</td>
                <td className={cell}>{date.format(new Date(Number(message.timestamp)))}</td>
              </tr>
            ))}
      </ReportTable>
      <nav aria-label="เปลี่ยนหน้ารายการ" className="flex flex-wrap items-center justify-between gap-3">
        {page > 1 ? (
          <Button asChild variant="outline">
            <Link href={link(page - 1)}>หน้าก่อน</Link>
          </Button>
        ) : (
          <span />
        )}
        <span className="text-sm text-slate-500">หน้า {page}</span>
        {hasNext ? (
          <Button asChild variant="outline">
            <Link href={link(page + 1)}>หน้าถัดไป</Link>
          </Button>
        ) : (
          <span />
        )}
      </nav>
    </main>
  );
}
