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
