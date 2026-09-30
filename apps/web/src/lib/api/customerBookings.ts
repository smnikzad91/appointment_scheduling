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
  status: "PENDING" | "CONFIRMED" | "CANCELLED" | "COMPLETED" | "NO_SHOW";
  /** The customer booked here, so they get the full address (even an independent stylist's home). */
  salon: { name: string; slug: string; kind?: SalonKind; address?: string; hostSalonName?: string | null };
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
