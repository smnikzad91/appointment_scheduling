import { salonApiFetch } from "./salonApiClient";
import type { ServiceLocation } from "@/lib/independent";

// Every booking on the platform, for /admin/appointments (apps/api GET admin/appointments).

export type AdminAppointmentStatus = "PENDING" | "CONFIRMED" | "CANCELLED" | "COMPLETED" | "NO_SHOW";

export interface AdminAppointment {
  id: string;
  status: AdminAppointmentStatus;
  startAt: string;
  endAt: string;
  createdAt: string;
  priceToman: number;
  chargedToman: number | null;
  tipToman: number | null;
  stylistShareToman: number | null;
  prepaidToman: number;
  prepaymentStatus: "HELD" | "SETTLED" | "REFUNDED" | null;
  prepaymentStylistToman: number;
  notes: string | null;
  serviceLocation: ServiceLocation | null;
  visitAddress: string | null;
  salon: { id: string; name: string; slug: string; kind: "SALON" | "INDEPENDENT"; timezone: string; hostSalonName: string | null };
  stylist: { id: string; displayName: string };
  /** as staff see it: the booking's own name where the salon set one */
  customer: { id: string; firstName: string; lastName: string; phone: string | null };
  services: { name: string; priceToman: number; durationMinutes: number }[];
  reviews: { target: "SALON" | "STYLIST"; rating: number | null; status: string }[];
}

export interface AdminAppointmentsPage {
  page: number;
  pageSize: number;
  total: number;
  counts: Partial<Record<AdminAppointmentStatus, number>>;
  items: AdminAppointment[];
}

export function listAdminAppointments(
  token: string,
  query: { status?: AdminAppointmentStatus; q?: string; from?: string; to?: string; page?: number },
) {
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(query)) if (v !== undefined && v !== "") params.set(k, String(v));
  return salonApiFetch<AdminAppointmentsPage>(`/admin/appointments?${params}`, { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" });
}
