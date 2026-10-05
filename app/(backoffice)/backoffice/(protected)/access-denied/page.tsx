import Link from "next/link";
import { Button } from "@/components/ui/button";
export const metadata = { title: "ไม่มีสิทธิ์เข้าถึง" };
export default function AccessDeniedPage() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      <section className="rounded-xl border bg-white p-6">
        <h1 className="text-xl font-semibold">ไม่มีสิทธิ์เข้าถึงหน้านี้</h1>
        <p className="mt-3 text-sm text-slate-500">
          เลือกหน้าอื่นจากเมนู หรือติดต่อเจ้าของระบบเพื่อเพิ่มสิทธิ์ให้บัญชีของคุณ
        </p>
        <Button asChild className="mt-5" variant="outline">
          <Link href="/backoffice/">กลับหน้าที่มีสิทธิ์</Link>
        </Button>
      </section>
    </main>
  );
}
