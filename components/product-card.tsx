import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { ImageFallback } from "@/components/image-fallback";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import type { Product } from "@/lib/site";
import { cn } from "@/lib/utils";

export function ProductCard({
  product,
  eager = false,
  compactOnMobile = false,
}: {
  product: Product;
  eager?: boolean;
  compactOnMobile?: boolean;
}) {
  return (
    <Card
      className={cn(
        "group h-full overflow-hidden border-black/10 bg-white shadow-none transition duration-300 hover:-translate-y-1 hover:shadow-xl",
        compactOnMobile &&
          "max-sm:grid max-sm:grid-cols-[7rem_minmax(0,1fr)] max-sm:grid-rows-[auto_1fr_auto] max-sm:rounded-2xl",
      )}
    >
      <Link
        href={`/products/${product.slug}/`}
        className={cn(
          "block p-3 pb-0",
          compactOnMobile && "max-sm:row-span-3 max-sm:self-center max-sm:p-2.5 max-sm:pr-0",
        )}
        aria-label={`ดูรายละเอียด ${product.name}`}
      >
        <ImageFallback
          label={`ภาพสินค้า ${product.name}`}
          src={product.image}
          aspect="landscape"
          loading={eager ? "eager" : "lazy"}
          fit="contain"
          className={cn(
            "rounded-xl transition-colors group-hover:border-primary/30",
            compactOnMobile && "max-sm:aspect-square max-sm:rounded-xl",
          )}
        />
      </Link>
      <div
        className={cn(
          "flex items-center justify-between border-b border-black/10 px-6 py-5",
          compactOnMobile && "max-sm:border-0 max-sm:px-3 max-sm:pb-0 max-sm:pt-3",
        )}
      >
        <Badge variant="secondary" className={cn(compactOnMobile && "max-sm:hidden")}>
          {product.category}
        </Badge>
        <span className="text-xs font-bold tracking-[0.18em] text-neutral-400 max-sm:tracking-[0.12em]">
          {product.model}
        </span>
      </div>
      <CardContent
        className={cn("grid gap-3 p-6", compactOnMobile && "max-sm:gap-1.5 max-sm:px-3 max-sm:py-1.5")}
      >
        <h3
          className={cn(
            "line-clamp-2 min-h-14 text-xl font-bold leading-8 text-neutral-950",
            compactOnMobile && "max-sm:min-h-0 max-sm:text-[15px] max-sm:leading-5",
          )}
        >
          <Link href={`/products/${product.slug}/`} className="hover:text-red-700">
            {product.name}
          </Link>
        </h3>
        <p
          className={cn(
            "line-clamp-3 min-h-12 text-sm leading-6 text-muted-foreground",
            compactOnMobile && "max-sm:hidden",
          )}
        >
          {product.description}
        </p>
        <div
          className={cn(
            "flex items-end justify-between gap-3 pt-2",
            compactOnMobile && "max-sm:items-center max-sm:pt-0",
          )}
        >
          <div>
            {product.monthlyPrice !== null ? (
              <>
                <p className="text-xs text-muted-foreground">ราคาอ้างอิงต่อเดือน</p>
                <p className={cn("text-2xl font-black text-red-700", compactOnMobile && "max-sm:text-sm")}>
                  ฿{product.monthlyPrice.toLocaleString("th-TH")}
                  <span
                    className={cn(
                      "text-sm font-medium text-muted-foreground",
                      compactOnMobile && "max-sm:text-[11px]",
                    )}
                  >
                    /เดือน
                  </span>
                </p>
              </>
            ) : (
              <p className={cn("text-lg font-bold text-red-700", compactOnMobile && "max-sm:text-sm")}>
                สอบถามราคาล่าสุด
              </p>
            )}
          </div>
          <span
            className={cn(
              "flex items-center gap-1 text-xs text-muted-foreground",
              compactOnMobile && "max-sm:hidden",
            )}
          >
            <span aria-hidden="true" className="size-1.5 rounded-full bg-red-600" />
            {product.warrantyYears !== null ? `สูงสุด ${product.warrantyYears} ปี` : "ตามแพ็กเกจ"}
          </span>
        </div>
      </CardContent>
      <CardFooter className={cn("p-6 pt-0", compactOnMobile && "max-sm:px-3 max-sm:pb-3 max-sm:pt-0")}>
        <Button
          asChild
          variant="outline"
          className={cn(
            "w-full border-neutral-300",
            compactOnMobile &&
              "max-sm:h-9 max-sm:justify-between max-sm:border-0 max-sm:bg-transparent max-sm:px-0 max-sm:text-xs max-sm:text-red-700",
          )}
        >
          <Link href={`/products/${product.slug}/`}>
            ดูรายละเอียด
            <ArrowRight className="text-primary" aria-hidden="true" />
          </Link>
        </Button>
      </CardFooter>
    </Card>
  );
}
