"use client";

import { useSyncExternalStore } from "react";
import { SCANNER_DESKTOP_MEDIA } from "@/components/scanner/scanner-layout";

function subscribeDesktopLayout(onStoreChange: () => void) {
  const mq = window.matchMedia(SCANNER_DESKTOP_MEDIA);
  mq.addEventListener("change", onStoreChange);
  return () => mq.removeEventListener("change", onStoreChange);
}

function getDesktopLayoutSnapshot() {
  return window.matchMedia(SCANNER_DESKTOP_MEDIA).matches;
}

/** `true` at xl+ (1280px): 3-column desktop scanner. SSR defaults to mobile-first. */
export function useScannerIsDesktop() {
  return useSyncExternalStore(
    subscribeDesktopLayout,
    getDesktopLayoutSnapshot,
    () => false,
  );
}
