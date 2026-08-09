import Image from "next/image";
import { cn } from "@/lib/utils";

type GeneratedIconProps = {
  src: string;
  alt?: string;
  className?: string;
  fit?: "cover" | "contain";
};

export function GeneratedIcon({ src, alt = "", className, fit = "cover" }: GeneratedIconProps) {
  return (
    <span className={cn("relative block size-14 shrink-0 overflow-hidden rounded-2xl bg-[#f5f0e9]", className)}>
      <Image
        src={src}
        alt={alt}
        fill
        sizes="80px"
        className={fit === "contain" ? "object-contain p-1" : "object-cover"}
      />
    </span>
  );
}
