import Image from "next/image";
import { cn } from "@/lib/utils";

type BrandLogoProps = {
  className?: string;
  alt?: string;
};

export function BrandLogo({ className, alt = "LG" }: BrandLogoProps) {
  return (
    <Image
      src="/brand/lg-logo.svg"
      alt={alt}
      width={225}
      height={99}
      className={cn("h-auto w-[5.75rem] shrink-0", className)}
    />
  );
}
