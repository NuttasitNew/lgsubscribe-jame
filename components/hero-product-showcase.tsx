import Image from "next/image";
import { BrandLogo } from "@/components/brand-logo";
import { products } from "@/lib/site";

const [waterPurifier, washer, vacuum] = products;

export function HeroProductShowcase() {
  return (
    <div className="relative z-10 mx-auto aspect-[4/5] w-full max-w-[560px] overflow-hidden rounded-[2rem] border border-white/15 bg-[radial-gradient(circle_at_20%_12%,rgba(239,68,68,0.3),transparent_34%),linear-gradient(145deg,#2a0d13_0%,#121212_50%,#080808_100%)] p-5 shadow-[0_30px_90px_rgba(0,0,0,0.35)] sm:p-7">
      <div className="absolute inset-x-0 bottom-0 h-2/3 bg-[linear-gradient(to_top,rgba(165,0,52,0.18),transparent)]" />
      <div className="relative flex items-center justify-between gap-4">
        <div className="rounded-2xl bg-white px-3 py-2 shadow-sm">
          <BrandLogo alt="LG" className="w-[4.6rem]" />
        </div>
        <p className="text-right text-[10px] font-bold uppercase tracking-[0.2em] text-white/50">
          Official product showcase
        </p>
      </div>

      <div className="relative mt-5 grid h-[calc(100%_-_4.25rem)] grid-cols-[0.78fr_1.22fr] grid-rows-2 gap-3 sm:mt-7 sm:gap-4">
        <div className="relative row-span-2 overflow-hidden rounded-[1.5rem] border border-white/10 bg-white">
          <Image
            src={washer.image}
            alt={`สินค้า ${washer.name}`}
            fill
            sizes="(max-width: 768px) 42vw, 220px"
            loading="eager"
            className="object-contain p-3 sm:p-5"
          />
          <span className="absolute inset-x-3 bottom-3 rounded-full bg-neutral-950/85 px-3 py-2 text-center text-[10px] font-bold text-white backdrop-blur-sm">
            {washer.model}
          </span>
        </div>

        {[waterPurifier, vacuum].map((product) => (
          <div key={product.slug} className="relative overflow-hidden rounded-[1.5rem] border border-white/10 bg-white">
            <Image
              src={product.image}
              alt={`สินค้า ${product.name}`}
              fill
              sizes="(max-width: 768px) 48vw, 260px"
              loading="eager"
              className="object-contain p-3 sm:p-5"
            />
            <span className="absolute inset-x-3 bottom-3 rounded-full bg-neutral-950/85 px-3 py-2 text-center text-[10px] font-bold text-white backdrop-blur-sm">
              {product.model}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
