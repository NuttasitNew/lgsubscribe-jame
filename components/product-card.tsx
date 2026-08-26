import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { ImageFallback } from "@/components/image-fallback";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import type { Product } from "@/lib/site";

export function ProductCard({ product, eager = false }: { product: Product; eager?: boolean }) {
  const hasPromotion = Boolean(product.promotionImage);

  return (
    <Card className="group h-full overflow-hidden border-black/10 bg-white shadow-none transition duration-300 hover:-translate-y-1 hover:shadow-xl">
      <Link
        href={`/products/${product.slug}/`}
        className="relative block"
        aria-label={`ดูรายละเอียด ${product.name}`}
      >
        <ImageFallback
          label={`${hasPromotion ? "ภาพโปรโมชัน" : "ภาพสินค้า"} ${product.name}`}
          src={product.promotionImage ?? product.image}
          aspect="square"
          loading={eager ? "eager" : "lazy"}
          fit="contain"
          className="rounded-none border-0"
        />
        <div data-testid="product-card-mobile-meta" className="absolute right-3 top-3 z-10 sm:hidden">
          <span className="rounded-full bg-neutral-950/80 px-2.5 py-1 text-[11px] font-bold tracking-[0.12em] text-white">
            {product.model}
          </span>
        </div>
      </Link>
      <div className="hidden items-center justify-between border-b border-black/10 px-6 py-5 sm:flex">
        <Badge variant="secondary">{product.category}</Badge>
        <span className="text-xs font-bold tracking-[0.18em] text-neutral-400">{product.model}</span>
      </div>
      <CardContent className="grid gap-3 p-6">
        <h3 className="line-clamp-2 min-h-0 text-xl font-bold leading-8 text-neutral-950 sm:min-h-14">
          <Link href={`/products/${product.slug}/`} className="hover:text-red-700">
            {product.name}
          </Link>
        </h3>
        <p className="line-clamp-2 min-h-0 text-sm leading-6 text-muted-foreground sm:line-clamp-3">
          {product.description}
        </p>
        <div className="flex items-end justify-between gap-3 pt-2">
          <div>
            {product.monthlyPrice !== null ? (
              <>
                <p className="text-xs text-muted-foreground">เริ่มต้น</p>
                <p className="text-2xl font-black text-red-700">
                  ฿{product.monthlyPrice.toLocaleString("th-TH")}
                  <span className="text-sm font-medium text-muted-foreground">/เดือน</span>
                </p>
              </>
            ) : null}
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
            <ArrowRight className="text-primary" aria-hidden="true" />
          </Link>
        </Button>
      </CardFooter>
    </Card>
  );
}
