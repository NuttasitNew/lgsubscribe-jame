"use client";

import { useCallback, useEffect, useRef } from "react";
import { contractLabel, type PriceListItem } from "@/lib/price-list";
import type { ActivityEvent, ActivityKind } from "@/lib/price-list-activity";

const endpoint = "/api/price-list/activity/";

/** One id per browser tab, kept across refreshes, so the backoffice can replay a visit in order. */
function tabSession() {
  const key = "price-list-session";
  let id = sessionStorage.getItem(key);
  if (!id) {
    id = crypto.randomUUID();
    sessionStorage.setItem(key, id);
  }
  return id;
}

/** What the backoffice needs to know about a product option. */
export function describeItem(item: PriceListItem) {
  return {
    model: item.model,
    category: item.category,
    contract: contractLabel(item),
    service: item.serviceCycle,
    regularPrice: item.regularPrice,
  };
}

/**
 * Queue staff actions and send them in batches (every 5 s, and with sendBeacon when the tab
 * is hidden or closed) so a busy quote never waits on the network.
 */
export function useActivityLog() {
  const queue = useRef<ActivityEvent[]>([]);
  const session = useRef<string | null>(null);

  const flush = useCallback((beacon = false) => {
    if (queue.current.length === 0) return;
    session.current ??= tabSession();
    const events = queue.current.splice(0, 40);
    const body = JSON.stringify({ session: session.current, events });
    if (beacon && navigator.sendBeacon?.(endpoint, new Blob([body], { type: "application/json" }))) return;
    // Put the batch back when the server is down so the next tick retries it (capped).
    const retry = () => queue.current.unshift(...events.slice(0, Math.max(0, 200 - queue.current.length)));
    fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
      keepalive: true,
    })
      .then((response) => {
        if (response.status >= 500) retry();
      })
      .catch(retry);
  }, []);

  useEffect(() => {
    const timer = window.setInterval(() => flush(), 5000);
    const hide = () => document.visibilityState === "hidden" && flush(true);
    const leave = () => flush(true);
    document.addEventListener("visibilitychange", hide);
    window.addEventListener("pagehide", leave);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", hide);
      window.removeEventListener("pagehide", leave);
      flush(true);
    };
  }, [flush]);

  return useCallback((kind: ActivityKind, detail?: Record<string, unknown>) => {
    queue.current.push({ kind, detail, at: Date.now() });
  }, []);
}
