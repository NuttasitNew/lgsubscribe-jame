"use client";
import { useId, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { PasswordInput } from "@/components/ui/password-input";
import { allPermissions, permissionOptions } from "@/lib/backoffice/permissions";
export type ManagedUser = {
  id: string;
  username: string;
  displayName: string;
  permissions: string[];
  isActive: boolean;
  isOwner: boolean;
};
const field =
  "mt-1 h-11 w-full rounded-md border bg-white px-3 text-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary";
function UserForm({
  user,
  currentId,
  onSaved,
}: {
  user?: ManagedUser;
  currentId: string;
  onSaved: () => void;
}) {
  const router = useRouter();
  const id = useId();
  const [selected, setSelected] = useState<string[]>(
    user?.isOwner ? allPermissions : (user?.permissions ?? []),
  );
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const ownProtected = Boolean(user?.isOwner);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    setPending(true);
    setError("");
    try {
      const response = await fetch(user ? `/api/backoffice/users/${user.id}/` : "/api/backoffice/users/", {
        method: user ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...(!user
            ? { username: form.get("username") }
            : { isActive: ownProtected || form.get("isActive") === "on" }),
          displayName: form.get("displayName"),
          password: form.get("password") || undefined,
          permissions: selected,
        }),
      });
      const result = await response.json();
      if (!response.ok) {
        setError(result.error ?? "บันทึกไม่สำเร็จ");
        return;
      }
      if (user?.id === currentId) {
        router.push("/backoffice/auth/login/");
        router.refresh();
        return;
      }
      if (!user) {
        formElement.reset();
        setSelected([]);
      }
      onSaved();
    } catch {
      setError("เชื่อมต่อไม่สำเร็จ กรุณาลองอีกครั้ง");
    } finally {
      setPending(false);
    }
  }
  return (
    <form onSubmit={submit} className="space-y-4">
      <fieldset disabled={pending} className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          {!user && (
            <label className="text-sm font-medium">
              ชื่อผู้ใช้ (ID)
              <input
                name="username"
                required
                minLength={3}
                maxLength={80}
                autoComplete="off"
                pattern="[a-zA-Z0-9][a-zA-Z0-9._\-]{2,79}"
                className={field}
              />
              <span className="mt-1 block text-xs font-normal text-slate-500">
                a-z, 0-9, จุด ขีด หรือขีดล่าง · 3–80 ตัว
              </span>
            </label>
          )}
          <label className="text-sm font-medium">
            ชื่อแสดงผล
            <input
              name="displayName"
              required
              maxLength={150}
              defaultValue={user?.displayName ?? ""}
              className={field}
            />
          </label>
          <div>
            <label htmlFor={id} className="mb-1 block text-sm font-medium">
              {user ? "รหัสผ่านใหม่" : "รหัสผ่าน"}
            </label>
            <PasswordInput
              id={id}
              name="password"
              required={!user}
              minLength={10}
              maxLength={128}
              autoComplete="new-password"
              disabled={pending}
            />
            <p className="mt-1 text-xs text-slate-500">
              {user ? "เว้นว่างหากใช้รหัสเดิม · " : ""}10–128 ตัวอักษร
            </p>
          </div>
        </div>
        <fieldset className="space-y-2" disabled={ownProtected}>
          <legend className="mb-2 text-sm font-semibold">สิทธิ์การใช้งาน</legend>
          {permissionOptions.map(({ key, label }) => (
            <label key={key} className="flex min-h-11 items-center gap-3 rounded-lg border p-3 text-sm">
              <input
                type="checkbox"
                checked={selected.includes(key)}
                onChange={(event) =>
                  setSelected((prev) =>
                    event.target.checked
                      ? [...new Set([...prev, key, ...(key === "google.manage" ? ["google.view"] : [])])]
                      : prev.filter(
                          (value) => value !== key && !(key === "google.view" && value === "google.manage"),
                        ),
                  )
                }
                className="size-4 shrink-0 accent-red-700"
              />
              <span>{label}</span>
            </label>
          ))}
        </fieldset>
        {user && (
          <label className="flex min-h-11 items-center gap-3 text-sm">
            <input
              type="checkbox"
              name="isActive"
              defaultChecked={user.isActive}
              disabled={ownProtected}
              className="size-4 accent-red-700"
            />
            เปิดใช้งานบัญชี{ownProtected && <span className="text-xs text-slate-500">บัญชีเจ้าของระบบ</span>}
          </label>
        )}
      </fieldset>
      {error && (
        <p role="alert" className="text-sm text-red-700">
          {error}
        </p>
      )}
      <Button type="submit" disabled={pending}>
        {pending ? "กำลังบันทึก…" : user ? "บันทึกการเปลี่ยนแปลง" : "สร้างผู้ใช้"}
      </Button>
      {user && (
        <p className="text-xs text-slate-500">หลังบันทึก ผู้ใช้นี้ต้องเข้าสู่ระบบใหม่เพื่อรับสิทธิ์ล่าสุด</p>
      )}
    </form>
  );
}
export function UsersManager({ users, currentId }: { users: ManagedUser[]; currentId: string }) {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [revision, setRevision] = useState(0);
  function saved() {
    setMessage("บันทึกข้อมูลผู้ใช้แล้ว");
    setRevision((value) => value + 1);
    router.refresh();
  }
  return (
    <div className="space-y-5">
      <section className="rounded-xl border bg-white p-4 sm:p-6">
        <h2 className="mb-4 font-semibold">สร้างผู้ใช้ใหม่</h2>
        <UserForm currentId={currentId} onSaved={saved} />
      </section>
      {message && (
        <p role="status" className="text-sm text-green-700">
          {message}
        </p>
      )}
      <section className="rounded-xl border bg-white">
        <h2 className="border-b px-4 py-4 font-semibold">ผู้ใช้ระบบ ({users.length})</h2>
        <ul className="divide-y">
          {users.map((user) => (
            <li key={user.id} className="p-4 sm:p-6">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="min-w-0">
                  <h3 className="break-words font-semibold">{user.displayName}</h3>
                  <p className="break-all text-sm text-slate-500">
                    {user.username}
                    {user.isOwner ? " · เจ้าของระบบ" : ""}
                  </p>
                </div>
                <span className={user.isActive ? "text-xs text-green-700" : "text-xs text-slate-500"}>
                  {user.isActive ? "เปิดใช้งาน" : "ปิดใช้งาน"}
                </span>
              </div>
              <p className="mt-3 text-xs leading-6 text-slate-500">
                {user.isOwner
                  ? "ทุกสิทธิ์"
                  : permissionOptions
                      .filter((p) => user.permissions.includes(p.key))
                      .map((p) => p.label)
                      .join(" · ") || "ยังไม่มีสิทธิ์"}
              </p>
              {(!user.isOwner || user.id === currentId) && (
                <details className="mt-3">
                  <summary className="cursor-pointer py-2 text-sm font-medium text-primary">
                    แก้ไขผู้ใช้และสิทธิ์
                  </summary>
                  <div className="mt-3">
                    <UserForm
                      key={`${user.id}:${revision}`}
                      user={user}
                      currentId={currentId}
                      onSaved={saved}
                    />
                  </div>
                </details>
              )}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
