"use client";

import { useCallback, useEffect, useSyncExternalStore } from "react";
import { addFavorite, favoriteIds, removeFavorite } from "@/lib/api/discovery";

// The signed-in user's saved salon ids, shared by every heart button on the page (search results,
// salon page, dashboard) so toggling one updates the others. Loaded once per token.

let ids = new Set<string>();
let loadedFor: string | null = null; // requested for this token
let readyFor: string | null = null; // and received
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());
const subscribe = (cb: () => void) => {
  listeners.add(cb);
  return () => listeners.delete(cb);
};
const EMPTY = new Set<string>();

export function useFavoriteIds(token: string | null) {
  const current = useSyncExternalStore(subscribe, () => ids, () => EMPTY);

  useEffect(() => {
    if (!token || loadedFor === token) return;
    loadedFor = token;
    favoriteIds(token)
      .then((list) => {
        ids = new Set(list);
        readyFor = token;
        emit();
      })
      .catch(() => {
        loadedFor = null;
      });
  }, [token]);

  const toggle = useCallback(
    async (salonId: string) => {
      if (!token) return;
      const wasSaved = ids.has(salonId);
      const next = new Set(ids);
      if (wasSaved) next.delete(salonId);
      else next.add(salonId);
      ids = next; // optimistic
      emit();
      try {
        await (wasSaved ? removeFavorite(token, salonId) : addFavorite(token, salonId));
      } catch {
        const undo = new Set(ids);
        if (wasSaved) undo.add(salonId);
        else undo.delete(salonId);
        ids = undo;
        emit();
      }
    },
    [token],
  );

  /** `ready`: the saved ids for this user have arrived (until then `ids` is empty, not "none saved"). */
  return { ids: token ? current : EMPTY, ready: !!token && readyFor === token, toggle };
}
