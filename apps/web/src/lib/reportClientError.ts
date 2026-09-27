// Browser -> POST /api/errors -> error_logs. Safe to call from anywhere on the client; never throws.

const MAX_REPORTS_PER_PAGE = 10;
const reported = new Set<string>();

export interface ClientErrorReport {
  error: unknown;
  kind: "error" | "unhandledrejection" | "render";
  digest?: string;
  componentStack?: string;
}

export function reportClientError({ error, kind, digest, componentStack }: ClientErrorReport) {
  if (typeof window === "undefined") return;

  const message =
    error instanceof Error ? error.message || error.name : typeof error === "string" ? error : safeStringify(error);
  const stack = error instanceof Error ? error.stack : undefined;

  // One broken component can throw on every render — report each distinct error once per page,
  // and stop after a handful so a crash loop can't flood the log.
  const key = `${kind}:${message}`;
  if (reported.has(key) || reported.size >= MAX_REPORTS_PER_PAGE) return;
  reported.add(key);

  const body = JSON.stringify({ message, stack, kind, digest, componentStack, url: window.location.href });

  try {
    // keepalive lets the report finish even if the page is navigating away.
    void fetch("/api/errors", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
      keepalive: true,
    }).catch(() => {});
  } catch {
    // Reporting is best-effort.
  }
}

function safeStringify(value: unknown): string {
  try {
    return JSON.stringify(value) ?? String(value);
  } catch {
    return String(value);
  }
}
