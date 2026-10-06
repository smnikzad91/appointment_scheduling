import { join } from "path";

// Uploads that must not be public: expense receipts (stylists' in "expenses", salons' in
// "salon-expenses"). They're written outside public/ (so neither `next start` nor anything else
// serves them as static files) but keep the usual
// "/uploads/<folder>/<file>" URL, which next.config rewrites to app/api/receipts — it serves a
// receipt only to whoever owns the expense (that stylist, or that salon's owner).

export const PRIVATE_FOLDERS = ["expenses", "salon-expenses"] as const;

/** The roles that may upload to each private folder (an independent stylist keeps the books as the business). */
export const PRIVATE_FOLDER_ROLES: Record<(typeof PRIVATE_FOLDERS)[number], readonly string[]> = {
  expenses: ["STYLIST"],
  "salon-expenses": ["SALON_OWNER", "INDEPENDENT_STYLIST"],
};

export function isPrivateFolder(folder: string): boolean {
  return (PRIVATE_FOLDERS as readonly string[]).includes(folder);
}

/** Where files of an upload folder live on disk. */
export function uploadsDir(folder: string): string {
  return isPrivateFolder(folder) ? join(process.cwd(), "private-uploads", folder) : join(process.cwd(), "public", "uploads", folder);
}
