"use client";

import Script from "next/script";
import { useEffect, useSyncExternalStore } from "react";

const subscribe = () => () => {};
const isProductionHost = () =>
  ["www.lgthailand-subscribe.com", "lgthailand-subscribe.com"].includes(window.location.hostname);
const serverSnapshot = () => false;

type AnalyticsWindow = Window & {
  dataLayer?: unknown[];
  gtag?: (...args: unknown[]) => void;
};

export function GoogleAnalytics() {
  const measurementId = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;
  const productionHost = useSyncExternalStore(subscribe, isProductionHost, serverSnapshot);
  const enabled = productionHost && !!measurementId && /^G-[A-Z0-9]+$/.test(measurementId);

  useEffect(() => {
    if (!enabled) return;

    const analytics = window as AnalyticsWindow;
    analytics.dataLayer ??= [];
    if (!analytics.gtag) {
      analytics.gtag = function () {
        // Google tag expects the arguments object in its command queue.
        // eslint-disable-next-line prefer-rest-params
        analytics.dataLayer!.push(arguments);
      };
      analytics.gtag("js", new Date());
      analytics.gtag("config", measurementId, {
        allow_google_signals: false,
        allow_ad_personalization_signals: false,
      });
    }

    function trackContact(event: MouseEvent) {
      if (!(event.target instanceof Element)) return;
      const link = event.target.closest("a[href]");
      if (!(link instanceof HTMLAnchorElement)) return;
      const url = new URL(link.href);
      const method =
        url.protocol === "tel:" && ["+66849748429", "+66865515949"].includes(url.pathname)
          ? "phone"
          : url.protocol === "mailto:" && url.pathname === "lgsubscribe.th@gmail.com"
            ? "email"
            : ["line.me", "lin.ee"].includes(url.hostname)
              ? "line"
              : null;
      if (!method) return;
      analytics.gtag?.("event", "contact_click", {
        contact_method: method,
        page_path: window.location.pathname,
        transport_type: "beacon",
      });
    }

    document.addEventListener("click", trackContact, true);
    return () => document.removeEventListener("click", trackContact, true);
  }, [enabled, measurementId]);

  if (!enabled) return null;

  return (
    <Script
      id="google-analytics"
      src={`https://www.googletagmanager.com/gtag/js?id=${measurementId}`}
      strategy="afterInteractive"
    />
  );
}
