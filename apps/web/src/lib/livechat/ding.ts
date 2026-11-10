"use client";

/**
 * A short two-tone chime made with Web Audio (no sound file). Browsers only allow audio after the
 * person has interacted with the page, so primeSound() unlocks the context on the first tap / key.
 */
import { useSyncExternalStore } from "react";

/** Chime scopes, muted separately: the visitor chat box and the admin panel. Saved per browser. */
export type ChimeScope = "chat" | "admin";
const KEY = (scope: ChimeScope) => `nobatet_chime_off_${scope}`;
const EVENT = "nobatet-chime-mute";

export function isChimeMuted(scope: ChimeScope) {
  try {
    return localStorage.getItem(KEY(scope)) === "1";
  } catch {
    return false;
  }
}

function setChimeMuted(scope: ChimeScope, muted: boolean) {
  try {
    if (muted) localStorage.setItem(KEY(scope), "1");
    else localStorage.removeItem(KEY(scope));
  } catch {
    /* storage blocked: the toggle just won't stick */
  }
  window.dispatchEvent(new Event(EVENT));
}

function subscribe(cb: () => void) {
  window.addEventListener(EVENT, cb);
  window.addEventListener("storage", cb); // other tabs
  return () => {
    window.removeEventListener(EVENT, cb);
    window.removeEventListener("storage", cb);
  };
}

/** [muted, toggle] for a scope; false on the server. */
export function useChimeMuted(scope: ChimeScope) {
  const muted = useSyncExternalStore(subscribe, () => isChimeMuted(scope), () => false);
  return [muted, () => setChimeMuted(scope, !muted)] as const;
}

type AC = typeof AudioContext;
let ctx: AudioContext | null = null;
let primed = false;

function context() {
  if (ctx) return ctx;
  const Ctor: AC | undefined = window.AudioContext ?? (window as unknown as { webkitAudioContext?: AC }).webkitAudioContext;
  if (!Ctor) return null;
  try {
    ctx = new Ctor();
  } catch {
    return null;
  }
  return ctx;
}

export function primeSound() {
  if (primed || typeof window === "undefined") return;
  primed = true;
  const unlock = () => {
    context()
      ?.resume()
      .catch(() => {});
    window.removeEventListener("pointerdown", unlock);
    window.removeEventListener("keydown", unlock);
  };
  window.addEventListener("pointerdown", unlock);
  window.addEventListener("keydown", unlock);
}

export function ding(scope: ChimeScope) {
  if (isChimeMuted(scope)) return;
  const c = context();
  if (!c) return;
  if (c.state === "suspended") c.resume().catch(() => {});
  const t = c.currentTime + 0.02;
  for (const [freq, delay] of [
    [880, 0],
    [1318.5, 0.13],
  ] as const) {
    const osc = c.createOscillator();
    const gain = c.createGain();
    osc.type = "sine";
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0.0001, t + delay);
    gain.gain.exponentialRampToValueAtTime(0.22, t + delay + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + delay + 0.4);
    osc.connect(gain).connect(c.destination);
    osc.start(t + delay);
    osc.stop(t + delay + 0.45);
  }
}
