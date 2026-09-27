import { salonApiFetch } from "./salonApiClient";

// In-app notifications (apps/api src/notifications). The API stores a type + data payload; the
// Persian text is built here (see components/app/NotificationBell.tsx).

export interface NewReviewData {
  reviewId: string;
  target: "SALON" | "STYLIST";
  rating: number | null;
  excerpt: string | null;
  customerName: string;
  stylistName: string | null;
  edited: boolean;
}

export type AppNotification = {
  id: string;
  readAt: string | null;
  createdAt: string;
} & { type: "NEW_REVIEW"; data: NewReviewData };

const auth = (token: string) => ({ Authorization: `Bearer ${token}` });

export function listNotifications(token: string) {
  return salonApiFetch<{ items: AppNotification[]; unreadCount: number }>("/notifications", { headers: auth(token) });
}

export function markNotificationRead(token: string, id: string) {
  return salonApiFetch<{ ok: true }>(`/notifications/${id}/read`, { method: "PATCH", headers: auth(token) });
}

export function markAllNotificationsRead(token: string) {
  return salonApiFetch<{ ok: true }>("/notifications/read-all", { method: "POST", headers: auth(token) });
}
