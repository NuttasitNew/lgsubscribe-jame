"use client";

import * as Dialog from "@radix-ui/react-dialog";
import Image from "next/image";
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { X } from "lucide-react";
import { LineMark } from "@/components/line-mark";
import { subscribeDayImage } from "@/lib/subscribe-day-image";
import {
  isSubscribeDayActive,
  markSubscribeDayPopupDismissed,
  subscribeDayCampaign,
  SUBSCRIBE_DAY_END,
  SUBSCRIBE_DAY_START,
  wasSubscribeDayPopupDismissed,
} from "@/lib/subscribe-day";
import { siteConfig } from "@/lib/site";
import { useTrackingConsent } from "@/lib/analytics/consent";

export function FloatingSubscribeDay({ image }: { image?: ReactNode }) {
  // Cached/server HTML stays closed; only the browser's current time can open it.
  const [isOpen, setIsOpen] = useState(false);
  // The modal makes the page inert, so it must wait until the cookie banner has been answered.
  const consent = useTrackingConsent();
  const dismissed = useRef(false);
  const previousFocus = useRef<HTMLElement | null>(null);
  const closeButton = useRef<HTMLButtonElement | null>(null);
  const background = useRef<Array<{ element: HTMLElement; inert: boolean }>>([]);

  const restoreBackground = useCallback(() => {
    for (const { element, inert } of background.current) element.toggleAttribute("inert", inert);
    background.current = [];
  }, []);

  useEffect(() => restoreBackground, [restoreBackground]);

  useEffect(() => {
    let timeout: number | undefined;
    const start = new Date(SUBSCRIBE_DAY_START).getTime();
    const end = new Date(SUBSCRIBE_DAY_END).getTime();

    function updateVisibility() {
      window.clearTimeout(timeout);
      const now = Date.now();
      const active = isSubscribeDayActive(new Date(now));
      setIsOpen(active && !dismissed.current && !wasSubscribeDayPopupDismissed());

      const nextBoundary = now < start ? start : now < end ? end : undefined;
      if (nextBoundary !== undefined) {
        timeout = window.setTimeout(updateVisibility, Math.min(nextBoundary - now, 2_147_483_647));
      }
    }

    function onVisibilityChange() {
      if (document.visibilityState === "visible") updateVisibility();
    }

    updateVisibility();
    window.addEventListener("focus", updateVisibility);
    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      window.clearTimeout(timeout);
      window.removeEventListener("focus", updateVisibility);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, []);

  const dismiss = useCallback(() => {
    dismissed.current = true;
    markSubscribeDayPopupDismissed();
    setIsOpen(false);
  }, []);

  return (
    <Dialog.Root open={isOpen && consent !== "pending"} onOpenChange={(open) => !open && dismiss()}>
      <Dialog.Portal>
        <Dialog.Overlay data-promotion-overlay="" className="fixed inset-0 z-[80] bg-black/65" />
        <Dialog.Content
          aria-modal="true"
          className="subscribe-day-popup fixed left-1/2 top-1/2 z-[81] w-[min(32rem,calc(100vw-24px),calc((100dvh-100px)*0.849))] -translate-x-1/2 -translate-y-1/2 outline-none"
          onOpenAutoFocus={(event) => {
            event.preventDefault();
            previousFocus.current =
              document.activeElement instanceof HTMLElement ? document.activeElement : null;
            // Live counters can keep background sections exposed by aria-hidden. Native
            // inert also removes those sections from assistive technology and interaction.
            const content = closeButton.current?.closest('[role="dialog"]');
            if (content) {
              background.current = Array.from(document.body.children)
                .filter(
                  (element): element is HTMLElement =>
                    element instanceof HTMLElement &&
                    !element.contains(content) &&
                    !element.hasAttribute("data-promotion-overlay") &&
                    !element.hasAttribute("data-radix-focus-guard") &&
                    !["SCRIPT", "STYLE", "LINK"].includes(element.tagName),
                )
                .map((element) => ({ element, inert: element.hasAttribute("inert") }));
              for (const { element } of background.current) element.setAttribute("inert", "");
            }
            closeButton.current?.focus();
          }}
          onCloseAutoFocus={(event) => {
            event.preventDefault();
            restoreBackground();
            if (previousFocus.current?.isConnected) previousFocus.current.focus({ preventScroll: true });
          }}
        >
          <Dialog.Title className="sr-only">{subscribeDayCampaign.dialogLabel}</Dialog.Title>
          <Dialog.Description className="sr-only">
            โปรโมชั่น 31 ตุลาคม – 11 พฤศจิกายน 2569 ตามเวลาไทย สอบถามรายละเอียดและเงื่อนไขผ่าน LINE
          </Dialog.Description>
          <Dialog.Close asChild>
            <button
              ref={closeButton}
              type="button"
              aria-label={subscribeDayCampaign.closeLabel}
              className="absolute right-2 top-2 z-10 grid size-11 place-items-center rounded-full bg-neutral-800 text-white shadow-lg ring-2 ring-white transition-colors hover:bg-neutral-950 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white sm:-right-3 sm:-top-3"
            >
              <X className="size-5" strokeWidth={3} aria-hidden="true" />
            </button>
          </Dialog.Close>
          <div className="overflow-hidden rounded-2xl bg-white shadow-[0_24px_64px_rgba(0,0,0,0.45)] ring-1 ring-black/10">
            <a
              className="block aspect-[1156/1361]"
              href={siteConfig.lineUrl}
              target="_blank"
              rel="noreferrer"
              onClick={dismiss}
            >
              {image ?? (
                <Image
                  {...subscribeDayImage}
                  unoptimized
                  alt={subscribeDayCampaign.alt}
                  width={1156}
                  height={1361}
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
              <LineMark className="size-6 shrink-0 text-white" />
              {subscribeDayCampaign.ctaLabel}
            </a>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
