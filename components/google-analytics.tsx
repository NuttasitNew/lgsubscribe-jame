"use client";
import Script from "next/script";
import { usePathname } from "next/navigation";
import { useEffect, useSyncExternalStore } from "react";
import { contactMethodForLink } from "@/lib/analytics/attribution";
import { useTrackingConsent } from "@/lib/analytics/consent";
const subscribe = () => () => {};
const productionHost = () =>
  ["www.lgthailand-subscribe.com", "lgthailand-subscribe.com"].includes(window.location.hostname);
const serverSnapshot = () => false;
type AnalyticsWindow = Window & { dataLayer?: unknown[]; gtag?: (...args: unknown[]) => void };
let lastPage: string | null = null;
let initializedId: string | null = null;

export function GoogleAnalytics() {
  const id = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;
  const path = usePathname();
  const consent = useTrackingConsent();
  const host = useSyncExternalStore(subscribe, productionHost, serverSnapshot);
  const enabled = host && !!id && /^G-[A-Z0-9]+$/.test(id) && ["analytics", "all"].includes(consent);
  useEffect(() => {
    if (!host || !id || !/^G-[A-Z0-9]+$/.test(id)) return;
    const analytics = window as AnalyticsWindow;
    if (!enabled) {
      analytics.gtag?.("consent", "update", {
        analytics_storage: "denied",
        ad_storage: "denied",
        ad_user_data: "denied",
        ad_personalization: "denied",
      });
      lastPage = null;
      return;
    }
    analytics.dataLayer ??= [];
    const firstInitialization = !analytics.gtag;
    if (!analytics.gtag) {
      analytics.gtag = function () {
        // Google expects the arguments object in its command queue.
        // eslint-disable-next-line prefer-rest-params
        analytics.dataLayer!.push(arguments);
      };
      analytics.gtag("consent", "default", {
        analytics_storage: "denied",
        ad_storage: "denied",
        ad_user_data: "denied",
        ad_personalization: "denied",
      });
      analytics.gtag("js", new Date());
    }
    const ads = consent === "all" ? "granted" : "denied";
    analytics.gtag("consent", "update", {
      analytics_storage: "granted",
      ad_storage: ads,
      ad_user_data: ads,
      ad_personalization: "denied",
    });
    // Only approved attribution parameters reach Google; private query values are dropped.
    const clean = new URL(location.origin + location.pathname);
    const params = new URLSearchParams(location.search);
    for (const key of [
      "utm_source",
      "utm_medium",
      "utm_campaign",
      "utm_content",
      "utm_term",
      ...(consent === "all" ? ["gclid", "gbraid", "wbraid"] : []),
    ]) {
      const value = params.get(key);
      if (
        value &&
        value.length <= 250 &&
        !/[@\x00-\x1f<>]/.test(value) &&
        (key === "gclid" || key === "gbraid" || key === "wbraid" || !/\d{9,}/.test(value))
      )
        clean.searchParams.set(key, value);
    }
    if (initializedId !== id || firstInitialization) {
      analytics.gtag("config", id, {
        send_page_view: false,
        allow_google_signals: false,
        allow_ad_personalization_signals: false,
        page_location: clean.href,
      });
      initializedId = id;
    }
    if (path && lastPage !== path) {
      analytics.gtag("event", "page_view", {
        page_path: path,
        page_location: clean.href,
        page_title: document.title,
      });
      lastPage = path;
    }
    function track(event: MouseEvent) {
      if (!(event.target instanceof Element)) return;
      const link = event.target.closest("a[href]");
      if (!(link instanceof HTMLAnchorElement)) return;
      const method = contactMethodForLink(link.href);
      if (method)
        analytics.gtag?.("event", "contact_click", {
          contact_method: method,
          page_path: window.location.pathname,
          page_location: clean.href,
          transport_type: "beacon",
        });
    }
    document.addEventListener("click", track, true);
    return () => document.removeEventListener("click", track, true);
  }, [enabled, consent, host, id, path]);
  if (!enabled) return null;
  return (
    <Script
      id="google-analytics"
      src={`https://www.googletagmanager.com/gtag/js?id=${id}`}
      strategy="afterInteractive"
    />
  );
}
