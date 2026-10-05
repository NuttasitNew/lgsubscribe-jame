"use client";
import { useSyncExternalStore } from "react";

export type TrackingConsent = "analytics" | "all" | "necessary" | "pending";
const key = "lg_tracking_consent_v1";
const listeners = new Set<() => void>();
const notify = () => listeners.forEach((listener) => listener());
export function getTrackingConsent(): TrackingConsent {
  if (
    (navigator as Navigator & { globalPrivacyControl?: boolean }).globalPrivacyControl ||
    navigator.doNotTrack === "1"
  )
    return "necessary";
  try {
    const value = localStorage.getItem(key);
    return ["analytics", "all", "necessary"].includes(value ?? "") ? (value as TrackingConsent) : "pending";
  } catch {
    return "necessary";
  }
}
export function setTrackingConsent(value: Exclude<TrackingConsent, "pending">) {
  try {
    localStorage.setItem(key, value);
  } catch {
    /* Storage unavailable */
  }
  notify();
}
export function useTrackingConsent() {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      window.addEventListener("storage", listener);
      return () => {
        listeners.delete(listener);
        window.removeEventListener("storage", listener);
      };
    },
    getTrackingConsent,
    () => "pending" as TrackingConsent,
  );
}
