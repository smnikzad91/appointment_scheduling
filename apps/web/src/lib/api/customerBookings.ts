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
  review: { id: string; rating: number; comment: string | null } | null;
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

export function leaveReview(token: string, appointmentId: string, rating: number, comment?: string) {
  return salonApiFetch<{ id: string; rating: number; comment: string | null }>(`/appointments/${appointmentId}/review`, {
    method: "POST",
    headers: authHeaders(token),
    body: JSON.stringify({ rating, comment }),
  });
}
