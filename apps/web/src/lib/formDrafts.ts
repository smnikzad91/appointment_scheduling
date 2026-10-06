// Surviving the OS killing the installed app (PWA) in the background. Android and especially iOS
// free a backgrounded web app's memory; coming back then reloads the page and everything typed is
// gone. So, only at the moment the app goes to the background, what the user typed is written to
// localStorage; if the app comes back alive the draft is thrown away, and if it was killed the
// next load of the same page puts it back once. A draft never outlives one restore or DRAFT_TTL.
//
// Generic fields: components/common/FormDraftKeeper.tsx. React state that isn't a plain field
// (the booking sheet's step and choices): useBackgroundDraft below.

const PREFIX = "bg-draft:";
export const DRAFT_TTL = 3 * 60 * 60 * 1000;

interface Stored<T> {
  at: number;
  data: T;
}

function storage(): Storage | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

export function saveDraft<T>(key: string, data: T) {
  try {
    storage()?.setItem(PREFIX + key, JSON.stringify({ at: Date.now(), data } satisfies Stored<T>));
  } catch {
    // full or blocked — nothing to keep
  }
}

export function dropDraft(key: string) {
  try {
    storage()?.removeItem(PREFIX + key);
  } catch {}
}

/** The draft saved for this key, if any and still fresh (read once: it's removed). */
export function takeDraft<T>(key: string): T | null {
  const s = storage();
  if (!s) return null;
  try {
    const raw = s.getItem(PREFIX + key);
    s.removeItem(PREFIX + key);
    if (!raw) return null;
    const stored = JSON.parse(raw) as Stored<T>;
    return Date.now() - stored.at < DRAFT_TTL ? stored.data : null;
  } catch {
    return null;
  }
}

/** On sign-out: nothing the previous user typed may show up for the next one. */
export function clearAllDrafts() {
  const s = storage();
  if (!s) return;
  try {
    for (const key of Object.keys(s)) if (key.startsWith(PREFIX)) s.removeItem(key);
  } catch {}
}

/**
 * Calls `save` each time the page goes to the background and `discard` when it comes back (the
 * page survived, so the draft isn't needed). Leaving on purpose — a reload, a link to another
 * site, closing the tab — also hides the page, but fires beforeunload first: nothing is kept then.
 * (Switching apps never fires beforeunload.) Returns the cleanup function.
 */
export function onBackground(save: () => void, discard: () => void): () => void {
  let leaving = false;
  const onVisibility = () => {
    if (document.visibilityState === "visible") discard();
    else if (!leaving) save();
  };
  const onLeave = () => {
    leaving = true;
    discard();
  };
  const onShow = () => (leaving = false); // back from the bfcache: still the same page
  document.addEventListener("visibilitychange", onVisibility);
  window.addEventListener("beforeunload", onLeave);
  window.addEventListener("pageshow", onShow);
  return () => {
    document.removeEventListener("visibilitychange", onVisibility);
    window.removeEventListener("beforeunload", onLeave);
    window.removeEventListener("pageshow", onShow);
  };
}
