import { join } from "path";

// Uploads that must not be public: stylists' expense receipts. They're written outside public/
// (so neither `next start` nor anything else serves them as static files) but keep the usual
// "/uploads/<folder>/<file>" URL, which next.config rewrites to app/api/receipts — it serves a
// receipt only to the stylist whose expense it belongs to.

export const PRIVATE_FOLDERS = ["expenses"] as const;

export function isPrivateFolder(folder: string): boolean {
  return (PRIVATE_FOLDERS as readonly string[]).includes(folder);
}

/** Where files of an upload folder live on disk. */
export function uploadsDir(folder: string): string {
  return isPrivateFolder(folder) ? join(process.cwd(), "private-uploads", folder) : join(process.cwd(), "public", "uploads", folder);
}
