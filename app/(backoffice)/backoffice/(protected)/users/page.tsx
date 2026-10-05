import { requireBackofficeSession } from "@/lib/backoffice/auth";
import { getPrisma } from "@/lib/db/prisma";
import { publicUserSelect } from "@/lib/backoffice/users";
import { UsersManager } from "@/feature/backoffice/components/users-manager";
export const metadata = { title: "ผู้ใช้และสิทธิ์" };
export default async function UsersPage() {
  const current = await requireBackofficeSession("users.manage");
  const users = await getPrisma().backofficeUser.findMany({
    select: publicUserSelect,
    orderBy: [{ isOwner: "desc" }, { username: "asc" }],
  });
  return (
    <main className="mx-auto max-w-5xl space-y-5 px-4 py-6 sm:px-6">
      <header>
        <h1 className="text-2xl font-semibold">ผู้ใช้และสิทธิ์</h1>
        <p className="mt-2 text-sm text-slate-500">
          สร้างบัญชีและกำหนดสิทธิ์แต่ละส่วน · บัญชีเจ้าของระบบมีสิทธิ์ทั้งหมด
        </p>
      </header>
      <UsersManager
        users={users.map(({ id, username, displayName, permissions, isActive, isOwner }) => ({
          id,
          username,
          displayName,
          permissions,
          isActive,
          isOwner,
        }))}
        currentId={current.id}
      />
    </main>
  );
}
