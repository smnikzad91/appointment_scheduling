// The cause chain under an error, for the admin error log (lib/errorLog.ts). No dependencies.

export interface ErrorCause {
  name?: string;
  code?: string;
  message: string;
}

/** URLs can carry tokens, phone numbers or other personal data — never store them. */
const scrubUrls = (s: string) => s.replace(/\b[a-z][a-z0-9+.-]*:\/\/\S+/gi, "<url>");

/**
 * The `cause` chain under an error — e.g. Node's `fetch failed` wraps undici's UND_ERR_SOCKET
 * "other side closed" — so the admin log says what actually went wrong. Codes and messages only.
 */
export function errorCauses(error: unknown, max = 5): ErrorCause[] {
  const causes: ErrorCause[] = [];
  let e = (error as { cause?: unknown } | null)?.cause;
  while (e && causes.length < max) {
    const code = (e as { code?: unknown }).code;
    const name = e instanceof Error ? e.name : undefined;
    const message = e instanceof Error ? e.message : typeof e === "string" ? e : "";
    causes.push({ name, code: typeof code === "string" ? code : undefined, message: scrubUrls(message).slice(0, 300) });
    e = (e as { cause?: unknown }).cause;
  }
  return causes;
}
