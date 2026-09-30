import { randomInt } from "node:crypto";

/**
 * Short booking links: nobatet.app/book/@<handle>. A handle is 3–30 characters of a–z, 0–9 and
 * . _ -, starting and ending with a letter or digit, never two separators in a row. Stored
 * lowercase; one namespace for salons (Salon.handle, and every salon's slug as its default handle)
 * and stylists (Stylist.handle).
 */
export const HANDLE_PATTERN = /^[a-z0-9](?:[a-z0-9._-]{1,28})[a-z0-9]$/;

/** Words that would read as the platform itself, or clash with a route. */
const RESERVED = new Set([
  "admin", "api", "backend", "book", "booking", "dashboard", "help", "launch", "login", "nobatet", "nobta",
  "r", "s", "salon", "salons", "signin", "signup", "stylist", "stylists", "support", "tutorials", "www",
]);

/** "@Rosa.Makeup " → "rosa.makeup" (a leading @ and surrounding space are optional). */
export function normalizeHandle(raw: string): string {
  return raw.trim().replace(/^@+/, "").toLowerCase();
}

/** Null when fine, otherwise why not (the English API message). */
export function handleProblem(handle: string): string | null {
  if (!HANDLE_PATTERN.test(handle) || /[._-]{2}/.test(handle)) return "Invalid handle";
  if (RESERVED.has(handle)) return "This handle is reserved";
  return null;
}

/** A starting handle for a stylist who hasn't chosen one: "stylist" + 5 digits. */
export function generatedStylistHandle(): string {
  return `stylist${randomInt(10_000, 100_000)}`;
}
