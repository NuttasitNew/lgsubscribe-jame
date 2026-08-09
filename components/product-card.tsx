import Link from "next/link";
import { ImageFallback } from "@/components/image-fallback";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import type { Product } from "@/lib/site";

export function ProductCard({ product, eager = false }: { product: Product; eager?: boolean }) {
  return (
    <Card className="group overflow-hidden border-black/10 bg-white shadow-none transition duration-300 hover:-translate-y-1 hover:shadow-xl">
      <Link href={`/products/${product.slug}/`} className="block p-3 pb-0" aria-label={`ดูรายละเอียด ${product.name}`}>
        <ImageFallback
          label={`ภาพสินค้า ${product.name}`}
          src={product.image}
          aspect="landscape"
          loading={eager ? "eager" : "lazy"}
          fit="contain"
          className="rounded-xl transition-colors group-hover:border-primary/30"
        />
      </Link>
      <div className="flex items-center justify-between border-b border-black/10 px-6 py-5">
        <Badge variant="secondary">{product.category}</Badge>
        <span className="text-xs font-bold tracking-[0.18em] text-neutral-400">{product.model}</span>
      </div>
      <CardContent className="grid gap-3 p-6">
        <h3 className="min-h-14 text-xl font-bold leading-8 text-neutral-950">
          <Link href={`/products/${product.slug}/`} className="hover:text-red-700">
            {product.name}
          </Link>
        </h3>
        <p className="min-h-12 text-sm leading-6 text-muted-foreground">{product.description}</p>
        <div className="flex items-end justify-between gap-3 pt-2">
          <div>
            {product.monthlyPrice !== null ? (
              <>
                <p className="text-xs text-muted-foreground">ราคาอ้างอิงต่อเดือน</p>
                <p className="text-2xl font-black text-red-700">
                  ฿{product.monthlyPrice.toLocaleString("th-TH")}
                  <span className="text-sm font-medium text-muted-foreground">/เดือน</span>
                </p>
              </>
            ) : (
              <p className="text-lg font-bold text-red-700">สอบถามราคาล่าสุด</p>
            )}
          </div>
          <span className="flex items-center gap-1 text-xs text-muted-foreground">
            <span aria-hidden="true" className="size-1.5 rounded-full bg-red-600" />
            {product.warrantyYears !== null ? `สูงสุด ${product.warrantyYears} ปี` : "ตามแพ็กเกจ"}
          </span>
        </div>
      </CardContent>
      <CardFooter className="p-6 pt-0">
        <Button asChild variant="outline" className="w-full border-neutral-300">
          <Link href={`/products/${product.slug}/`}>
            ดูรายละเอียด
            <span aria-hidden="true">→</span>
          </Link>
        </Button>
      </CardFooter>
    </Card>
  );
}
