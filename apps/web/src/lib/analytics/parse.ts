// Pure helpers for public-site analytics (no imports, so node --test runs parse.test.ts directly).

const SEARCH_ENGINES = ["google.", "bing.", "yahoo.", "duckduckgo.", "yandex.", "ecosia.", "baidu.", "zarebin.", "parsijoo."];
const SOCIAL = ["instagram.", "t.me", "telegram.", "whatsapp.", "facebook.", "twitter.", "x.com", "linkedin.", "eitaa.", "rubika.", "bale.ai"];

export type ReferrerType = "direct" | "search" | "internal" | "external" | "social";

/** Where a visit came from: same site (internal), a search engine, a social/messenger app, another site, or nothing. */
export function classifyReferrer(referrer: string | null | undefined, ownHost: string): { type: ReferrerType; source: string | null; raw: string | null } {
  if (!referrer) return { type: "direct", source: null, raw: null };
  let host: string;
  try {
    host = new URL(referrer).hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    return { type: "direct", source: null, raw: null };
  }
  const own = ownHost.replace(/^www\./, "").toLowerCase();
  const raw = referrer.slice(0, 500);
  if (host === own || host.endsWith(`.${own}`)) return { type: "internal", source: null, raw };
  if (SEARCH_ENGINES.some((s) => host.includes(s))) return { type: "search", source: host, raw };
  if (SOCIAL.some((s) => host.includes(s))) return { type: "social", source: host, raw };
  return { type: "external", source: host, raw };
}

/** Crawlers, link previews and scripts: not counted. */
export function isBot(userAgent: string): boolean {
  return !userAgent || /bot|crawl|spider|slurp|preview|headless|lighthouse|facebookexternalhit|curl|wget|python|axios|node-fetch|go-http|java\/|okhttp(?!.*nobatet)/i.test(userAgent);
}

/** Browser, OS and device type from a User-Agent — the common ones; the rest are "Other". */
export function parseUserAgent(ua: string): { browser: string; os: string; device: "desktop" | "mobile" | "tablet" } {
  const browser =
    /SamsungBrowser/i.test(ua) ? "Samsung Internet"
    : /EdgA?\//i.test(ua) ? "Edge"
    : /OPR\/|Opera/i.test(ua) ? "Opera"
    : /FxiOS|Firefox\//i.test(ua) ? "Firefox"
    : /CriOS|Chrome\//i.test(ua) ? "Chrome"
    : /Safari\//i.test(ua) && /Version\//i.test(ua) ? "Safari"
    : /AndroidDownloadManager|Dalvik/i.test(ua) ? "Android system"
    : "Other";
  const os =
    /iPhone|iPad|iPod/i.test(ua) ? "iOS"
    : /Android/i.test(ua) ? "Android"
    : /Windows/i.test(ua) ? "Windows"
    : /Mac OS X|Macintosh/i.test(ua) ? "macOS"
    : /Linux|X11/i.test(ua) ? "Linux"
    : "Other";
  const device = /iPad|Tablet/i.test(ua) || (/Android/i.test(ua) && !/Mobile/i.test(ua) && !/Dalvik|DownloadManager/i.test(ua)) ? "tablet" : /Mobi|iPhone|Android/i.test(ua) ? "mobile" : "desktop";
  return { browser, os, device };
}

/** Which public pages are tracked: everything a visitor sees, never the panels, admin or API. */
export function isTrackedPath(path: string): boolean {
  if (!path.startsWith("/") || path.length > 300) return false;
  return !/^\/(admin|salon|stylist|dashboard|api|launch|_next)(\/|$)/.test(path);
}

/** «/s/<slug>…» → slug */
export function salonSlugOf(path: string): string | null {
  const m = /^\/s\/([^/?#]+)/.exec(path);
  return m ? decodeURIComponent(m[1]).slice(0, 100) : null;
}
