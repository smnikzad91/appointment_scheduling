// Plain wire-format types for CMS/finance/support content. These match the
// lowercase string values every API route sends/accepts — the Postgres/Prisma
// enums underneath are uppercase, but routes translate at the boundary so
// nothing else in the app needs to change.

export type SocialPlatform =
  | "telegram" | "instagram" | "twitter" | "youtube"
  | "linkedin" | "whatsapp" | "discord" | "github"
  | "facebook" | "tiktok";

export type ContactStatus = "new" | "read" | "replied";

export type LegalPageType = "privacy" | "terms";

export type TicketStatus = "open" | "answered" | "closed";

export type TicketReplySender = "user" | "admin";

export type DepositStatus = "pending" | "approved" | "rejected";

/** User.role on the admin users API — Postgres's Role enum, lowercased. */
export type UserRole = "platform_admin" | "salon_owner" | "stylist" | "customer";

export type ErrorSource = "api" | "web_server" | "web_client";

/** One row of /api/admin/errors — Prisma's ErrorLog with the source lowercased. */
export interface ErrorLogEntry {
  id: string;
  source: ErrorSource;
  message: string;
  stack: string | null;
  method: string | null;
  path: string | null;
  statusCode: number | null;
  userId: string | null;
  userAgent: string | null;
  context: Record<string, unknown> | null;
  resolved: boolean;
  createdAt: string;
}
