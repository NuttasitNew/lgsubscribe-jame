import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <section className="grid min-h-[65vh] place-items-center bg-neutral-50 px-4 py-20 text-center">
      <div>
        <p className="text-sm font-bold uppercase tracking-[0.2em] text-red-700">404 Not Found</p>
        <h1 className="mt-4 text-4xl font-black text-neutral-950 sm:text-5xl">ไม่พบหน้าที่คุณกำลังค้นหา</h1>
        <p className="mx-auto mt-5 max-w-xl leading-8 text-muted-foreground">ลิงก์อาจถูกเปลี่ยนหรือสินค้ารุ่นนี้ไม่ได้อยู่ในรายการ กรุณากลับหน้าแรกหรือดูสินค้าทั้งหมด</p>
        <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
          <Button asChild className="bg-red-600 hover:bg-red-700"><Link href="/">กลับหน้าแรก</Link></Button>
          <Button asChild variant="outline"><Link href="/products/">ดูสินค้าทั้งหมด</Link></Button>
        </div>
      </div>
    </section>
  );
}
