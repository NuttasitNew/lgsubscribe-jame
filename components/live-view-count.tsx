"use client";

import { useEffect, useSyncExternalStore } from "react";
import { Eye } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  formatViewCount,
  getProductViewSnapshot,
  getSiteViewSnapshot,
  type ViewSnapshot,
} from "@/lib/product-views";

const CLOCK_INTERVAL_MS = 1000;
const SESSION_TICK_MS = 550;

type Listener = () => void;

let sharedNow = Date.now();
const listeners = new Set<Listener>();
let timer: ReturnType<typeof setInterval> | null = null;

function subscribeLiveClock(listener: Listener) {
  listeners.add(listener);
  if (timer === null) {
    timer = setInterval(() => {
      sharedNow = Date.now();
      listeners.forEach((entry) => entry());
    }, CLOCK_INTERVAL_MS);
  }
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0 && timer !== null) {
      clearInterval(timer);
      timer = null;
    }
  };
}

function getLiveNow() {
  return sharedNow;
}

function useLiveNow() {
  return useSyncExternalStore(subscribeLiveClock, getLiveNow, getLiveNow);
}

const sessionBonusByKey = new Map<string, number>();
const sessionBonusListeners = new Set<Listener>();
const sessionBonusTimers = new Map<string, ReturnType<typeof setTimeout>>();

function subscribeSessionBonus(listener: Listener) {
  sessionBonusListeners.add(listener);
  return () => {
    sessionBonusListeners.delete(listener);
  };
}

function getSessionBonus(storageKey: string | null) {
  if (!storageKey) return 0;
  return sessionBonusByKey.get(storageKey) ?? 0;
}

function useSessionBonus(storageKey: string | null) {
  const bonus = useSyncExternalStore(
    subscribeSessionBonus,
    () => getSessionBonus(storageKey),
    () => 0,
  );

  useEffect(() => {
    if (!storageKey) return;
    if (sessionBonusTimers.has(storageKey) || sessionBonusByKey.get(storageKey) === 1) return;

    let alreadyCounted = false;
    try {
      alreadyCounted = sessionStorage.getItem(storageKey) === "1";
      if (!alreadyCounted) sessionStorage.setItem(storageKey, "1");
    } catch {
      alreadyCounted = true;
    }

    sessionBonusByKey.set(storageKey, 0);
    const timeout = window.setTimeout(
      () => {
        sessionBonusByKey.set(storageKey, 1);
        sessionBonusTimers.delete(storageKey);
        sessionBonusListeners.forEach((listener) => listener());
      },
      alreadyCounted ? 0 : SESSION_TICK_MS,
    );
    sessionBonusTimers.set(storageKey, timeout);
  }, [storageKey]);

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
  const now = useLiveNow();
  const bonus = useSessionBonus("lg-views:site");
  const snapshot: ViewSnapshot = getSiteViewSnapshot(now);
  const total = snapshot.total + bonus;
  const current = Math.max(snapshot.current, bonus);

  return (
    <div
      data-testid="site-view-count"
      className={cn(
        "flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-black/10 bg-white px-5 py-4",
        className,
      )}
    >
      <div className="flex min-w-0 items-center gap-3">
        <span className="relative grid size-10 shrink-0 place-items-center rounded-full bg-red-50 text-red-700">
          <Eye className="size-5" aria-hidden="true" />
          <LiveDot className="absolute right-1 top-1" />
        </span>
        <div className="min-w-0">
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-red-700">ผู้เข้าชมเว็บไซต์</p>
          <p className="mt-0.5 text-2xl font-black leading-none text-neutral-950">
            <CountNumber value={total} />
            <span className="ml-1.5 text-sm font-semibold text-neutral-500">คน</span>
          </p>
        </div>
      </div>
      <p className="flex items-center gap-2 text-sm font-medium text-neutral-500">
        <LiveDot />
        {current > 0 ? `กำลังมีผู้เข้าชม ${formatViewCount(current)} คน` : "กำลังอัปเดตยอดเข้าชม"}
      </p>
    </div>
  );
}

export function ProductViewCount({
  model,
  countSession = false,
  variant = "compact",
  className,
}: {
  model: string;
  countSession?: boolean;
  variant?: "compact" | "detail";
  className?: string;
}) {
  const now = useLiveNow();
  const bonus = useSessionBonus(countSession ? `lg-views:product:${model}` : null);
  const snapshot = getProductViewSnapshot(model, now);
  const total = snapshot.total + bonus;
  const current = snapshot.current + bonus;

  if (variant === "detail") {
    return (
      <div
        data-testid="product-view-count"
        className={cn("mt-5 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-neutral-600", className)}
      >
        <p className="view-count-label flex items-center gap-2 font-semibold text-neutral-800">
          <Eye className="size-4 text-red-700" aria-hidden="true" />
          <CountNumber value={total} className="view-count-value text-base font-black text-neutral-950" />
          <span>ผู้เข้าชม</span>
        </p>
        <p className="flex items-center gap-2 text-neutral-500">
          <LiveDot />
          {current > 0 ? "มีคนกำลังดูรุ่นนี้อยู่" : "ยอดเข้าชมอัปเดตตามเวลาจริง"}
        </p>
      </div>
    );
  }

  return (
    <p
      data-testid="product-view-count"
      className={cn("flex items-center gap-1.5 pt-1 text-xs font-medium text-neutral-500", className)}
    >
      <Eye className="size-3.5 text-neutral-400" aria-hidden="true" />
      <CountNumber value={total} className="font-bold text-neutral-700" />
      <span>ผู้เข้าชม</span>
      {current > 0 ? <LiveDot className="ml-0.5" /> : null}
    </p>
  );
}
