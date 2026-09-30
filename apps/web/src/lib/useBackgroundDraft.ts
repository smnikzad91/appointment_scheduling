"use client";

import { useEffect, useRef } from "react";
import { dropDraft, onBackground, saveDraft, takeDraft } from "./formDrafts";

/**
 * React state that plain-field drafts (FormDraftKeeper) can't cover — a sheet's step, chosen
 * items, a map pin — kept across the OS killing the app in the background (lib/formDrafts.ts).
 * `snapshot` returns what to keep, or null for nothing worth keeping; `restore` gets it back once,
 * after the reload. Pass `enabled: false` to neither keep nor restore (e.g. a prefilled sheet).
 */
export function useBackgroundDraft<T>(key: string, snapshot: () => T | null, restore: (data: T) => void, enabled = true) {
  const snap = useRef(snapshot);
  const put = useRef(restore);
  // the latest callbacks, without re-subscribing every render
  useEffect(() => {
    snap.current = snapshot;
    put.current = restore;
  });

  useEffect(() => {
    if (!enabled) return;
    const draft = takeDraft<T>(key);
    if (draft) put.current(draft);
    return onBackground(
      () => {
        const data = snap.current();
        if (data) saveDraft(key, data);
        else dropDraft(key);
      },
      () => dropDraft(key),
    );
  }, [key, enabled]);
}
