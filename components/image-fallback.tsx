import Image from "next/image";
import { cn } from "@/lib/utils";

type ImageFallbackProps = {
  label: string;
  src?: string;
  fallbackSrc?: string;
  aspect?: "square" | "portrait" | "landscape" | "wide";
  tone?: "light" | "dark";
  className?: string;
  loading?: "eager" | "lazy";
  fit?: "cover" | "contain";
};

const aspectClasses = {
  square: "aspect-square",
  portrait: "aspect-[4/5]",
  landscape: "aspect-[4/3]",
  wide: "aspect-[16/10]",
};

export function ImageFallback({
  label,
  src,
  fallbackSrc,
  aspect = "landscape",
  tone = "light",
  className,
  loading = "lazy",
  fit = "cover",
}: ImageFallbackProps) {
  const isDark = tone === "dark";

  if (src) {
    return (
      <div
        data-image-slot="image"
        data-fallback-src={fallbackSrc}
        className={cn(
          "relative isolate w-full overflow-hidden rounded-[1.75rem] border border-black/10",
          fit === "contain" ? "bg-white" : "bg-[#efede8]",
          aspectClasses[aspect],
          className,
        )}
      >
        <Image
          src={src}
          alt={label}
          fill
          sizes="(max-width: 768px) 100vw, 50vw"
          loading={loading}
          className={
            fit === "contain"
              ? "object-contain"
              : "object-cover transition duration-500 group-hover:scale-[1.025]"
          }
        />
      </div>
    );
  }

  return (
    <div
      role="img"
      aria-label={`พื้นที่สำหรับ${label} ยังไม่ได้ใส่รูปภาพ`}
      data-image-slot="fallback"
      data-fallback-src={fallbackSrc}
      className={cn(
        "group relative isolate flex w-full overflow-hidden rounded-[1.75rem] border",
        aspectClasses[aspect],
        isDark
          ? "border-white/15 bg-white/[0.045] text-white"
          : "border-black/10 bg-[#efede8] text-neutral-950",
        className,
      )}
    >
      <div
        aria-hidden="true"
        className={cn(
          "absolute -right-[14%] -top-[18%] size-[72%] rounded-full border-[4.5rem]",
          isDark ? "border-red-500/10" : "border-red-700/[0.07]",
        )}
      />
      <div className="relative z-10 flex w-full flex-col justify-between p-6 sm:p-8">
        <div className="flex items-center justify-between">
          <span
            className={cn(
              "inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.16em]",
              isDark
                ? "border-white/15 bg-black/10 text-white/65"
                : "border-black/10 bg-white/55 text-neutral-500",
            )}
          >
            LG visual slot
          </span>
          <span aria-hidden="true" className={cn("text-lg", isDark ? "text-white/30" : "text-neutral-400")}>
            ◇
          </span>
        </div>

        <div>
          <div className={cn("mb-4 h-px w-full", isDark ? "bg-white/15" : "bg-black/10")} />
          <p className="text-lg font-bold sm:text-xl">{label}</p>
          <p className={cn("mt-1 text-sm", isDark ? "text-white/45" : "text-neutral-500")}>
            พร้อมแทนที่ด้วยภาพจริงภายหลัง
          </p>
        </div>
      </div>
    </div>
  );
}
