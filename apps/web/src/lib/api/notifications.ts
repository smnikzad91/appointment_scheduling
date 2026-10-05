import { salonApiFetch } from "./salonApiClient";

// In-app notifications (apps/api src/notifications). The API stores a type + data payload; the
// Persian text is built here (see components/app/NotificationBell.tsx).

export interface NewReviewData {
  reviewId: string;
  target: "SALON" | "STYLIST";
  /** An independent stylist's own business: the review is about "you". */
  independent?: boolean;
  rating: number | null;
  excerpt: string | null;
  customerName: string;
  stylistName: string | null;
  edited: boolean;
}

export interface BookingData {
  appointmentId: string;
  /** Missing on notifications created before customers were notified. */
  salonName?: string;
  customerName: string;
  stylistName: string;
  services: string[];
  startAt: string;
  /** NEW_BOOKING: made by the salon rather than online. */
  bySalon?: boolean;
  /** BOOKING_CANCELLED: who cancelled. */
  cancelledBy?: "CUSTOMER" | "SALON" | "STYLIST" | "SYSTEM";
  /** BOOKING_UPDATED: who changed it, and the start time before the change. */
  updatedBy?: "SALON" | "STYLIST";
  previousStartAt?: string;
}

export interface PayoutData {
  payoutId: string;
  amountToman: number;
  method: "CASH" | "CARD_TO_CARD" | "BANK_TRANSFER" | "OTHER" | "WALLET";
  paidAt: string;
  note: string | null;
}

export interface ReviewApprovedData {
  reviewId: string;
  target: "SALON" | "STYLIST";
  salonName: string;
  stylistName: string | null;
}

export interface SlotOpenedData {
  salonName: string;
  salonSlug: string;
  dateKey: string;
  stylistId: string | null;
  stylistName: string | null;
  serviceIds: string[];
}

export type AppNotification = {
  id: string;
  readAt: string | null;
  createdAt: string;
} & (
  | { type: "NEW_REVIEW"; data: NewReviewData }
  | { type: "NEW_BOOKING"; data: BookingData }
  | { type: "BOOKING_CANCELLED"; data: BookingData }
  | { type: "PAYOUT_RECORDED"; data: PayoutData }
  | { type: "BOOKING_CONFIRMED"; data: BookingData }
  | { type: "BOOKING_UPDATED"; data: BookingData }
  | { type: "REVIEW_APPROVED"; data: ReviewApprovedData }
  | { type: "SLOT_OPENED"; data: SlotOpenedData }
);

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
