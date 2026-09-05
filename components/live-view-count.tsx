"use client";

import { useEffect, useSyncExternalStore } from "react";
import { Eye, ShoppingBag } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  formatViewCount,
  getProductOrdersAt,
  getProductViewSnapshot,
  getSiteViewSnapshot,
  type ViewSnapshot,
} from "@/lib/product-views";

const CLOCK_INTERVAL_MS = 1000;
const SESSION_TICK_MS = 550;

type Listener = () => void;

let sharedNow = 0;
const clockListeners = new Set<Listener>();
let timer: ReturnType<typeof setInterval> | null = null;
let scrolling = false;
let scrollingReset: ReturnType<typeof setTimeout> | null = null;
let scrollPauseBound = false;
const productViewSnapshots = new Map<string, ViewSnapshot>();
let siteViewSnapshot: ViewSnapshot | null = null;

function liveNow() {
  if (sharedNow === 0) {
    sharedNow = Date.now();
  }
  return sharedNow;
}

function pauseClockWhileScrolling() {
  scrolling = true;
  if (scrollingReset !== null) {
    clearTimeout(scrollingReset);
  }
  scrollingReset = setTimeout(() => {
    scrolling = false;
    sharedNow = Date.now();
    clockListeners.forEach((entry) => entry());
  }, 160);
}

function bindScrollPause() {
  if (scrollPauseBound || typeof window === "undefined") return;
  window.addEventListener("scroll", pauseClockWhileScrolling, { passive: true });
  scrollPauseBound = true;
}

function unbindScrollPause() {
  if (!scrollPauseBound || typeof window === "undefined") return;
  window.removeEventListener("scroll", pauseClockWhileScrolling);
  scrollPauseBound = false;
  if (scrollingReset !== null) {
    clearTimeout(scrollingReset);
    scrollingReset = null;
  }
  scrolling = false;
}

function subscribeLiveClock(listener: Listener) {
  clockListeners.add(listener);
  bindScrollPause();
  if (timer === null) {
    sharedNow = Date.now();
    timer = setInterval(() => {
      if (scrolling) return;
      sharedNow = Date.now();
      clockListeners.forEach((entry) => entry());
    }, CLOCK_INTERVAL_MS);
  }
  return () => {
    clockListeners.delete(listener);
    if (clockListeners.size === 0 && timer !== null) {
      clearInterval(timer);
      timer = null;
      unbindScrollPause();
    }
  };
}

function reuseSnapshot(previous: ViewSnapshot | null | undefined, next: ViewSnapshot) {
  if (previous && previous.total === next.total && previous.current === next.current) {
    return previous;
  }
  return next;
}

function liveProductViewSnapshot(model: string) {
  const next = reuseSnapshot(productViewSnapshots.get(model), getProductViewSnapshot(model, liveNow()));
  productViewSnapshots.set(model, next);
  return next;
}

function liveSiteViewSnapshot() {
  siteViewSnapshot = reuseSnapshot(siteViewSnapshot, getSiteViewSnapshot(liveNow()));
  return siteViewSnapshot;
}

function liveProductOrders(model: string) {
  return getProductOrdersAt(model, liveNow());
}

function useLiveProductView(model: string) {
  return useSyncExternalStore(subscribeLiveClock, () => liveProductViewSnapshot(model), liveProductViewSnapshot.bind(null, model));
}

function useLiveProductOrders(model: string) {
  return useSyncExternalStore(subscribeLiveClock, () => liveProductOrders(model), liveProductOrders.bind(null, model));
}

function useLiveSiteView() {
  return useSyncExternalStore(subscribeLiveClock, liveSiteViewSnapshot, liveSiteViewSnapshot);
}

export function productViewStorageKey(model: string) {
  return `lg-views:product:${model}`;
}

export function resetLiveClock() {
  sharedNow = 0;
  productViewSnapshots.clear();
  siteViewSnapshot = null;
  scrolling = false;
  if (scrollingReset !== null) {
    clearTimeout(scrollingReset);
    scrollingReset = null;
  }
  if (timer !== null) {
    clearInterval(timer);
    timer = null;
  }
  clockListeners.clear();
  unbindScrollPause();
}

export function resetVisitBonuses() {
  visitBonusByKey.clear();
  visitBonusTimers.forEach((timeout) => window.clearTimeout(timeout));
  visitBonusTimers.clear();
  resetLiveClock();
}

const visitBonusByKey = new Map<string, number>();
const visitBonusListeners = new Set<Listener>();
const visitBonusTimers = new Map<string, number>();

function subscribeVisitBonus(listener: Listener) {
  visitBonusListeners.add(listener);
  return () => {
    visitBonusListeners.delete(listener);
  };
}

function getVisitBonus(storageKey: string | null) {
  if (!storageKey) return 0;
  return visitBonusByKey.get(storageKey) ?? 0;
}

function readStoredVisit(storageKey: string) {
  try {
    if (localStorage.getItem(storageKey) === "1") return true;
    if (sessionStorage.getItem(storageKey) === "1") {
      localStorage.setItem(storageKey, "1");
      return true;
    }
  } catch {
    return false;
  }
  return false;
}

function writeStoredVisit(storageKey: string) {
  try {
    localStorage.setItem(storageKey, "1");
  } catch {
    // Private mode or a full store should not break the page.
  }
}

function notifyVisitBonus() {
  visitBonusListeners.forEach((listener) => listener());
}

function applyVisitBonus(storageKey: string) {
  visitBonusByKey.set(storageKey, 1);
  visitBonusTimers.delete(storageKey);
  notifyVisitBonus();
}

function useVisitBonus(storageKey: string | null, recordVisit: boolean) {
  const bonus = useSyncExternalStore(
    subscribeVisitBonus,
    () => getVisitBonus(storageKey),
    () => 0,
  );

  useEffect(() => {
    if (!storageKey) return;
    if (visitBonusByKey.get(storageKey) === 1) return;

    if (readStoredVisit(storageKey)) {
      const timeout = window.setTimeout(() => applyVisitBonus(storageKey), 0);
      visitBonusTimers.set(storageKey, timeout);
      return () => window.clearTimeout(timeout);
    }

    if (!recordVisit) return;
    if (visitBonusTimers.has(storageKey)) return;

    writeStoredVisit(storageKey);
    const timeout = window.setTimeout(() => applyVisitBonus(storageKey), SESSION_TICK_MS);
    visitBonusTimers.set(storageKey, timeout);
    return () => window.clearTimeout(timeout);
  }, [recordVisit, storageKey]);

  return bonus;
}

function CountNumber({ value, className }: { value: number; className?: string }) {
  return (
    <span
      suppressHydrationWarning
      key={value}
      className={cn("inline-block tabular-nums motion-safe:animate-[pulse_0.45s_ease-out]", className)}
    >
      {formatViewCount(value)}
    </span>
  );
}

function LiveDot({ className }: { className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={cn("size-1.5 shrink-0 rounded-full bg-emerald-500 motion-safe:animate-pulse", className)}
    />
  );
}

export function SiteViewStats({ className }: { className?: string }) {
  const snapshot = useLiveSiteView();
  const bonus = useVisitBonus("lg-views:site", true);
  const total = snapshot.total + bonus;
  const current = Math.max(snapshot.current, bonus);

  return (
    <p
      data-testid="site-view-count"
      suppressHydrationWarning
      aria-label={`ผู้เข้าชมเว็บไซต์ ${formatViewCount(total)} คน${current > 0 ? ` กำลังมีผู้เข้าชม ${formatViewCount(current)} คน` : ""}`}
      className={cn("flex flex-wrap items-center gap-x-2 gap-y-1 text-xs", className)}
    >
      <span className="flex items-center gap-1.5">
        <Eye className="size-3.5 shrink-0 text-red-400" aria-hidden="true" />
        <span>ผู้เข้าชมเว็บไซต์</span>
        <CountNumber value={total} className="font-semibold text-white" />
        <span>คน</span>
      </span>
      {current > 0 ? (
        <span className="flex items-center gap-1.5">
          <span aria-hidden="true">·</span>
          <LiveDot />
          <span>กำลังมีผู้เข้าชม</span>
          <CountNumber value={current} className="font-semibold text-white" />
          <span>คน</span>
        </span>
      ) : null}
    </p>
  );
}

export function ProductViewCount({
  model,
  countSession = false,
  className,
}: {
  model: string;
  countSession?: boolean;
  className?: string;
}) {
  const snapshot = useLiveProductView(model);
  const bonus = useVisitBonus(productViewStorageKey(model), countSession);
  const total = snapshot.total + bonus;
  const current = snapshot.current + bonus;

  return (
    <p
      data-testid="product-view-count"
      suppressHydrationWarning
      aria-label={`${formatViewCount(total)} ผู้เข้าชม`}
      className={cn(
        "pointer-events-none flex items-center gap-1.5 whitespace-nowrap rounded-full bg-neutral-950/80 px-2.5 py-1 text-[11px] font-bold text-white",
        className,
      )}
    >
      <Eye className="size-3.5 shrink-0" aria-hidden="true" />
      <CountNumber value={total} />
      <span>ผู้เข้าชม</span>
      {current > 0 ? <LiveDot className="bg-emerald-400" /> : null}
    </p>
  );
}

export function ProductOrderCount({ model, className }: { model: string; className?: string }) {
  const total = useLiveProductOrders(model);

  return (
    <p
      data-testid="product-order-count"
      suppressHydrationWarning
      aria-label={`สั่งซื้อแล้ว ${formatViewCount(total)} ราย`}
      className={cn("inline-flex items-center gap-1 text-xs leading-none text-muted-foreground", className)}
    >
      <ShoppingBag className="size-3.5 shrink-0" aria-hidden="true" />
      <CountNumber value={total} className="font-semibold leading-none text-neutral-700" />
      <span className="leading-none">สั่งซื้อ</span>
    </p>
  );
}
