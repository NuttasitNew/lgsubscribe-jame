import {
  CreditCard,
  FileText,
  Headset,
  MessageCircle,
  ShieldCheck,
  Truck,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

type GeneratedIconProps = {
  src: string;
  alt?: string;
  className?: string;
  fit?: "cover" | "contain";
};

export function GeneratedIcon({ src, alt = "", className, fit = "cover" }: GeneratedIconProps) {
  const iconMap: Array<[string, LucideIcon]> = [
    ["monthly-payment", CreditCard],
    ["protection", ShieldCheck],
    ["expert-care", Headset],
    ["consultation", MessageCircle],
    ["delivery", Truck],
    ["document", FileText],
  ];
  const Icon = iconMap.find(([keyword]) => src.includes(keyword))?.[1] ?? FileText;

  return (
    <span
      role={alt ? "img" : undefined}
      aria-label={alt || undefined}
      aria-hidden={alt ? undefined : "true"}
      data-icon-source={src}
      data-icon-fit={fit}
      className={cn(
        "grid size-14 shrink-0 place-items-center rounded-full border border-primary/20 bg-white text-primary",
        className,
      )}
    >
      <Icon className="size-6" strokeWidth={1.8} />
    </span>
  );
}
