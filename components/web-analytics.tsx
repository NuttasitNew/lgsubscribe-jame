"use client";
import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { attributionFromUrl, contactMethodForLink, type Attribution } from "@/lib/analytics/attribution";
import { getTrackingConsent, useTrackingConsent } from "@/lib/analytics/consent";

let lastPath: string | null = null;
let pending = Promise.resolve();
const sessionKey = "lg_traffic_source_v1";
let source: Attribution | null = null;
let activeUntil = 0;

function currentSource() {
  const now = Date.now();
  const incoming = attributionFromUrl(location.href, document.referrer);
  if (now > activeUntil || !source || ["utm", "click_id"].includes(incoming.attributionMethod)) {
    if (getTrackingConsent() !== "all") incoming.clickId = null;
    try {
      const saved = JSON.parse(sessionStorage.getItem(sessionKey) ?? "null");
      source =
        saved && saved.expires > now && incoming.attributionMethod === "direct" ? saved.source : incoming;
    } catch {
      source = incoming;
    }
  }
  if (getTrackingConsent() !== "all" && source) source.clickId = null;
  activeUntil = now + 1800000;
  try {
    sessionStorage.setItem(sessionKey, JSON.stringify({ source, expires: activeUntil }));
  } catch {
    /* Session storage unavailable */
  }
  return source;
}
function send(path: string, eventType = "page_view", contactMethod?: string) {
  const body = JSON.stringify({
    eventId: crypto.randomUUID(),
    path,
    eventType,
    contactMethod,
    attribution: currentSource(),
    consent: getTrackingConsent(),
  });
  pending = pending.then(async () => {
    if (!["analytics", "all"].includes(getTrackingConsent())) return;
    try {
      await fetch("/api/analytics/pageview/", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body,
        keepalive: true,
      });
    } catch {
      /* Collection never interrupts navigation */
    }
  });
}
export function WebAnalytics() {
  const path = usePathname();
  const consent = useTrackingConsent();
  useEffect(() => {
    if (consent === "necessary") {
      lastPath = null;
      source = null;
      activeUntil = 0;
      try {
        sessionStorage.removeItem(sessionKey);
      } catch {
        /* Storage unavailable */
      }
      void fetch("/api/analytics/pageview/", { method: "DELETE", credentials: "same-origin" }).catch(
        () => {},
      );
    }
    if (!["analytics", "all"].includes(consent) || !path || path === lastPath) return;
    lastPath = path;
    send(path);
  }, [path, consent]);
  useEffect(() => {
    if (!["analytics", "all"].includes(consent)) return;
    function track(event: MouseEvent) {
      if (!(event.target instanceof Element)) return;
      const link = event.target.closest("a[href]");
      if (!(link instanceof HTMLAnchorElement)) return;
      const method = contactMethodForLink(link.href);
      if (method) send(window.location.pathname, "contact_click", method);
    }
    document.addEventListener("click", track, true);
    return () => document.removeEventListener("click", track, true);
  }, [consent]);
  return null;
}
