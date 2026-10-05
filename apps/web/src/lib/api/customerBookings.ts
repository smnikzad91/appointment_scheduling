import { salonApiFetch } from "./salonApiClient";
import type { SalonKind, ServiceLocation } from "@/lib/independent";

function authHeaders(token: string) {
  return { Authorization: `Bearer ${token}` };
}

export interface CustomerBooking {
  id: string;
  salonId: string;
  stylistId: string;
  startAt: string;
  endAt: string;
  priceToman: number;
  /** Paid in advance from the customer's wallet (online bookings); 0 = none. */
  prepaidToman?: number;
  /** HELD while open, SETTLED to the owner's wallet (completed / no-show), REFUNDED to the customer (cancelled). */
  prepaymentStatus?: "HELD" | "SETTLED" | "REFUNDED" | null;
  /** The rest after the pre-payment, once COMPLETED: ON_SITE (received directly) or WALLET (requested from the customer's wallet). */
  balanceMethod?: "ON_SITE" | "WALLET" | null;
  balanceDueToman?: number;
  balancePaidAt?: string | null;
  status: "PENDING" | "CONFIRMED" | "CANCELLED" | "COMPLETED" | "NO_SHOW";
  /** The customer booked here: the full address, except an independent stylist's private (home) one unless the appointment is there (then null). */
  salon: { name: string; slug: string; kind?: SalonKind; address?: string | null; hostSalonName?: string | null };
  stylist: { displayName: string };
  /** Independent stylists: where it happens, and a home visit's address. */
  serviceLocation?: ServiceLocation | null;
  visitAddress?: string | null;
  services: { serviceId: string; service: { name: string } }[];
  reviews: BookingReview[];
}

export type ReviewTarget = "SALON" | "STYLIST";

export interface BookingReview {
  id: string;
  target: ReviewTarget;
  rating: number | null;
  comment: string | null;
  status: "PENDING" | "APPROVED" | "REJECTED";
}

export function getMyBookings(token: string) {
  return salonApiFetch<CustomerBooking[]>("/appointments/mine", { headers: authHeaders(token) });
}

/** Pay the rest of a completed booking from the wallet (when the stylist asked for it); 402 when short. */
export function payBookingBalance(token: string, id: string) {
  return salonApiFetch<CustomerBooking>(`/appointments/${id}/pay-balance`, { method: "POST", headers: authHeaders(token) });
}

export function cancelBooking(token: string, id: string) {
  return salonApiFetch<CustomerBooking>(`/appointments/${id}/status`, {
    method: "PATCH",
    headers: authHeaders(token),
    body: JSON.stringify({ status: "CANCELLED" }),
  });
}

/** Edit your own review: omit a field to keep it, send null to clear it. It goes back to PENDING. */
export function updateReview(token: string, reviewId: string, patch: { rating?: number | null; comment?: string | null }) {
  return salonApiFetch<BookingReview>(`/reviews/${reviewId}`, { method: "PATCH", headers: authHeaders(token), body: JSON.stringify(patch) });
}

export function deleteReview(token: string, reviewId: string) {
  return salonApiFetch<{ ok: true }>(`/reviews/${reviewId}`, { method: "DELETE", headers: authHeaders(token) });
}

/** A review needs a rating, a comment, or both. Reviews start pending; they're public once the salon owner (or, for a stylist review, the stylist) approves. */
export function leaveReview(token: string, appointmentId: string, review: { target: ReviewTarget; rating?: number; comment?: string }) {
  return salonApiFetch<BookingReview>(`/appointments/${appointmentId}/review`, {
    method: "POST",
    headers: authHeaders(token),
    body: JSON.stringify(review),
  });
}
