"use client";

import { useCallback, useEffect, useState, type ReactNode } from "react";
import { subscribeDayImage } from "@/lib/subscribe-day-image";
import { X } from "lucide-react";
import { LineMark } from "@/components/line-mark";
import {
  isSubscribeDayActive,
  markSubscribeDayPopupDismissed,
  subscribeDayCampaign,
  SUBSCRIBE_DAY_END,
  wasSubscribeDayPopupDismissed,
} from "@/lib/subscribe-day";
import { siteConfig } from "@/lib/site";

export function FloatingSubscribeDay({
  initialActive = false,
  image,
}: {
  initialActive?: boolean;
  image?: ReactNode;
}) {
  const [isActive, setIsActive] = useState(initialActive);
  const [isOpen, setIsOpen] = useState(initialActive);

  useEffect(() => {
    function updateVisibility() {
      const active = isSubscribeDayActive();
      setIsActive(active);
      setIsOpen(active && !wasSubscribeDayPopupDismissed());
    }

    updateVisibility();

    const msUntilEnd = new Date(SUBSCRIBE_DAY_END).getTime() - Date.now();
    if (msUntilEnd <= 0) return;

    const timeout = window.setTimeout(updateVisibility, Math.min(msUntilEnd + 50, 2_147_483_647));
    return () => window.clearTimeout(timeout);
  }, []);

  const dismiss = useCallback(() => {
    markSubscribeDayPopupDismissed();
    setIsOpen(false);
  }, []);

  useEffect(() => {
    if (!isOpen) return;

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") dismiss();
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [dismiss, isOpen]);

  if (!isActive || !isOpen) return null;

  return (
    <div
      className="subscribe-day-popup fixed inset-0 z-[80] flex items-center justify-center bg-black/65 p-3 sm:p-6"
      onClick={dismiss}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={subscribeDayCampaign.dialogLabel}
        className="relative box-content aspect-square w-full max-w-[min(100%,28rem)] pb-[52px] sm:max-w-[32rem] sm:pb-14"
        onClick={(event) => event.stopPropagation()}
      >
        <button
          type="button"
          onClick={dismiss}
          aria-label={subscribeDayCampaign.closeLabel}
          className="absolute right-2 top-2 z-10 grid size-8 place-items-center rounded-full bg-neutral-800 text-white shadow-lg ring-2 ring-white transition-colors hover:bg-neutral-950 sm:-right-3 sm:-top-3 sm:ring-0"
        >
          <X className="size-4" strokeWidth={3} aria-hidden="true" />
        </button>
        <div className="absolute inset-0 overflow-hidden rounded-2xl bg-white shadow-[0_24px_64px_rgba(0,0,0,0.45)] ring-1 ring-black/10">
          <a className="block aspect-square" href={siteConfig.lineUrl} target="_blank" rel="noreferrer" onClick={dismiss}>
            {image ?? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                {...subscribeDayImage}
                alt={subscribeDayCampaign.alt}
                width={1254}
                height={1254}
                loading="eager"
                fetchPriority="high"
                className="h-auto w-full"
              />
            )}
          </a>
          <a
            href={siteConfig.lineUrl}
            target="_blank"
            rel="noreferrer"
            onClick={dismiss}
            className="flex items-center justify-center gap-2 bg-[#06C755] px-4 py-3.5 text-[15px] font-bold text-neutral-950 transition-colors hover:bg-[#06C755]/90 sm:py-4 sm:text-base"
          >
            <LineMark className="size-6 text-white" />
            {subscribeDayCampaign.ctaLabel}
          </a>
        </div>
      </div>
    </div>
  );
}
