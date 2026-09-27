import { salonApiFetch } from "./salonApiClient";

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
  salon: { name: string; slug: string };
  stylist: { displayName: string };
  services: { service: { name: string } }[];
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

/** A review needs a rating, a comment, or both. Reviews start pending; they're public once the salon owner (or, for a stylist review, the stylist) approves. */
export function leaveReview(token: string, appointmentId: string, review: { target: ReviewTarget; rating?: number; comment?: string }) {
  return salonApiFetch<BookingReview>(`/appointments/${appointmentId}/review`, {
    method: "POST",
    headers: authHeaders(token),
    body: JSON.stringify(review),
  });
}
