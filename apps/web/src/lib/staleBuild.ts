// After a deploy the old build's JS chunks are gone, so a tab opened before it fails to load
// the next chunk it needs ("Failed to load chunk …" / ChunkLoadError). A full reload fetches the
// new build. Reload at most once a minute so a real outage can't cause a reload loop.

const KEY = "stale-build-reload-at";

export function isChunkLoadError(error: unknown): boolean {
  const e = error as { name?: string; message?: string } | null | undefined;
  const text = `${e?.name ?? ""} ${e?.message ?? (typeof error === "string" ? error : "")}`;
  return /ChunkLoadError|Failed to load chunk|Loading chunk [\w-]+ failed|Failed to fetch dynamically imported module/i.test(text);
}

/** Reloads the page for a chunk load error; true if it did (so the caller shouldn't report it). */
export function reloadForNewBuild(error: unknown): boolean {
  if (!isChunkLoadError(error)) return false;
  try {
    const last = Number(sessionStorage.getItem(KEY) ?? 0);
    if (Date.now() - last < 60_000) return false;
    sessionStorage.setItem(KEY, String(Date.now()));
  } catch {
    // Storage blocked — still reload; worst case the error page shows next time.
  }
  window.location.reload();
  return true;
}
