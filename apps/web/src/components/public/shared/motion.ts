"use client";

import { useSyncExternalStore } from "react";
import type { Transition, Variants } from "framer-motion";

const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";

function subscribeToReducedMotion(callback: () => void) {
  const mql = window.matchMedia(REDUCED_MOTION_QUERY);
  mql.addEventListener("change", callback);
  return () => mql.removeEventListener("change", callback);
}

function getReducedMotionSnapshot() {
  return window.matchMedia(REDUCED_MOTION_QUERY).matches;
}

function getReducedMotionServerSnapshot() {
  return false;
}

/**
 * `window.matchMedia` doesn't exist during SSR, so the server always assumes
 * motion is fine. `useSyncExternalStore`'s `getServerSnapshot` keeps the
 * client's first (hydration) render in agreement with that, then switches to
 * the real value right after — avoiding a hydration mismatch.
 */
export function useReducedMotionSafe(): boolean {
  return useSyncExternalStore(subscribeToReducedMotion, getReducedMotionSnapshot, getReducedMotionServerSnapshot);
}

export const easeSignal: Transition["ease"] = [0.16, 1, 0.3, 1];

export const springSnappy: Transition = { type: "spring", stiffness: 260, damping: 24 };

export function fadeUp(delay = 0, y = 20): Variants {
  return {
    hidden: { opacity: 0, y },
    show: { opacity: 1, y: 0, transition: { duration: 0.55, delay, ease: easeSignal } },
  };
}

export function fadeIn(delay = 0): Variants {
  return {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { duration: 0.5, delay, ease: easeSignal } },
  };
}

export function staggerContainer(stagger = 0.08, delayChildren = 0): Variants {
  return {
    hidden: {},
    show: {
      transition: { staggerChildren: stagger, delayChildren },
    },
  };
}

export const staggerItem: Variants = fadeUp(0, 16);

export const defaultViewport = { once: true, margin: "-80px" } as const;
