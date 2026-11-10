/**
 * «نظرات و پیشنهادات»: the public form at /feedback (FeedbackPageClient), stored as `Feedback` rows
 * and read by the platform admin at /admin/feedback (AdminFeedback, bilingual labels here).
 */

export type FeedbackKind = "SUGGESTION" | "CRITICISM" | "PRAISE" | "BUG" | "OTHER";
export type FeedbackRole = "CUSTOMER" | "SALON_OWNER" | "STYLIST" | "VISITOR";

export const FEEDBACK_KIND_LABEL: Record<FeedbackKind, { fa: string; en: string }> = {
  SUGGESTION: { fa: "پیشنهاد", en: "Suggestion" },
  CRITICISM: { fa: "انتقاد", en: "Criticism" },
  PRAISE: { fa: "تعریف و قدردانی", en: "Praise" },
  BUG: { fa: "گزارش مشکل", en: "Bug report" },
  OTHER: { fa: "سایر", en: "Other" },
};

export const FEEDBACK_ROLE_LABEL: Record<FeedbackRole, { fa: string; en: string }> = {
  CUSTOMER: { fa: "مشتری", en: "Customer" },
  SALON_OWNER: { fa: "صاحب سالن", en: "Salon owner" },
  STYLIST: { fa: "آرایشگر", en: "Stylist" },
  VISITOR: { fa: "بازدیدکننده", en: "Visitor" },
};

export const FEEDBACK_KINDS = Object.keys(FEEDBACK_KIND_LABEL) as FeedbackKind[];
export const FEEDBACK_ROLES = Object.keys(FEEDBACK_ROLE_LABEL) as FeedbackRole[];

export const FEEDBACK_MESSAGE_MIN = 5;
export const FEEDBACK_MESSAGE_MAX = 2000;

export interface FeedbackRow {
  id: string;
  kind: FeedbackKind;
  role: FeedbackRole | null;
  name: string | null;
  phone: string | null;
  message: string;
  userId: string | null;
  readAt: string | null;
  createdAt: string;
}
