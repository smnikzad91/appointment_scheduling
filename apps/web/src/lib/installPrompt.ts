"use client";

import { useSyncExternalStore } from "react";

// "Install app" support. Chrome/Edge/Samsung Internet fire `beforeinstallprompt` once the app is
// installable — often before the screen with the install button has mounted — so the event is
// captured here, at module load (imported from the root layout via ServiceWorkerRegister), and
// kept until a button uses it. Safari/iOS never fires it: there the buttons instead open
// step-by-step "Share → Add to Home Screen" instructions (IosInstallSheet).

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
}

interface InstallState {
  /** The saved event; null until the browser says the app can be installed (or after it's used). */
  event: BeforeInstallPromptEvent | null;
  /** Installed during this visit, or already running as the installed app. */
  installed: boolean;
  /** iPhone/iPad Safari: installable only by hand, from the Share menu. */
  iosSafari: boolean;
}

let state: InstallState = { event: null, installed: false, iosSafari: false };
const listeners = new Set<() => void>();
const set = (next: Partial<InstallState>) => {
  state = { ...state, ...next };
  listeners.forEach((l) => l());
};

function isStandalone() {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    // iOS Safari's own flag for home-screen apps.
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

/**
 * Safari on iPhone/iPad (iPadOS reports itself as a Mac, hence the touch check). Other iOS
 * browsers and in-app browsers (Instagram, Telegram…) are left out: their menus differ or they
 * can't add to the home screen at all.
 */
function isIosSafari() {
  const ua = navigator.userAgent;
  const ios = /iPad|iPhone|iPod/.test(ua) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  return ios && /Safari/.test(ua) && !/CriOS|FxiOS|EdgiOS|OPiOS|OPT\/|YaBrowser|GSA\/|Instagram|FBAN|FBAV|Telegram|Line\//.test(ua);
}

if (typeof window !== "undefined") {
  state = { event: null, installed: isStandalone(), iosSafari: isIosSafari() };
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault(); // keep Chrome's own mini-infobar away; we show our own button
    set({ event: e as BeforeInstallPromptEvent });
  });
  window.addEventListener("appinstalled", () => set({ event: null, installed: true }));
  window.matchMedia("(display-mode: standalone)").addEventListener("change", (e) => e.matches && set({ event: null, installed: true }));
}

const subscribe = (cb: () => void) => {
  listeners.add(cb);
  return () => listeners.delete(cb);
};
const SERVER: InstallState = { event: null, installed: false, iosSafari: false };

/**
 * `canInstall` is true only while the browser has offered installation and the app isn't
 * installed / running standalone. `install()` shows the browser's dialog and resolves with the
 * user's choice; either way the saved event is spent, so the button hides.
 */
export function useInstallPrompt() {
  const s = useSyncExternalStore(subscribe, () => state, () => SERVER);
  return {
    canInstall: !!s.event && !s.installed,
    /** Show "how to add to Home Screen" instructions instead of a one-tap install. */
    iosHint: s.iosSafari && !s.installed,
    installed: s.installed,
    async install(): Promise<"accepted" | "dismissed" | "unavailable"> {
      const event = state.event;
      if (!event) return "unavailable";
      set({ event: null }); // a prompt event can only be used once
      await event.prompt();
      const { outcome } = await event.userChoice;
      if (outcome === "accepted") set({ installed: true });
      return outcome;
    },
  };
}
