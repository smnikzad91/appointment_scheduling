import { salonApiFetch } from "./salonApiClient";
import type { ServiceLocation } from "@/lib/independent";

function authHeaders(token: string) {
  return { Authorization: `Bearer ${token}` };
}

export interface SelfStylistService {
  serviceId: string;
  overridePriceToman: number | null;
  overrideDurationMinutes: number | null;
  /** The owner-set rate for this service; null = the stylist's default. */
  commissionPercent: number | null;
  /** This stylist's own "book again" SMS setting; null = the salon's (service.rebookReminder…). */
  overrideRebookReminderEnabled: boolean | null;
  overrideRebookReminderDays: number | null;
  service: {
    id: string;
    name: string;
    priceToman: number;
    durationMinutes: number;
    active: boolean;
    rebookReminderEnabled: boolean;
    rebookReminderDays: number;
  };
}

export interface SelfStylist {
  id: string;
  userId: string;
  salonId: string;
  displayName: string;
  bio: string | null;
  avatarUrl: string | null;
  coverImageUrl: string | null;
  active: boolean;
  commissionPercent: number;
  workingHours: { dayOfWeek: number; startMinute: number; endMinute: number }[];
  services: SelfStylistService[];
  salon: { slug: string; timezone: string; status: string; name: string; city: string; province: string | null; brandColor: string };
  /** Short link nobatet.app/book/@<handle>; see getMyStylistHandle (which assigns one if missing). */
  handle?: string | null;
}

/** The stylist's short-link handle; a generated one is assigned the first time. */
export function getMyStylistHandle(token: string) {
  return salonApiFetch<{ handle: string }>("/stylists/me/handle", { headers: authHeaders(token) });
}

export function setMyStylistHandle(token: string, handle: string) {
  return salonApiFetch<{ handle: string }>("/stylists/me/handle", { method: "PATCH", headers: authHeaders(token), body: JSON.stringify({ handle }) });
}

/** Dispatched on window after the stylist edits their profile, so the app bar refreshes. */
export const STYLIST_UPDATED_EVENT = "stylist:updated";

export function getMyStylistProfile(token: string) {
  return salonApiFetch<SelfStylist>("/stylists/me", { headers: authHeaders(token) });
}

export function updateMyStylistProfile(token: string, data: { bio?: string; avatarUrl?: string | null; coverImageUrl?: string | null }) {
  return salonApiFetch<SelfStylist>("/stylists/me", {
    method: "PATCH",
    headers: authHeaders(token),
    body: JSON.stringify(data),
  });
}

export function updateMyServiceOverride(
  token: string,
  serviceId: string,
  data: {
    overridePriceToman: number | null;
    overrideDurationMinutes: number | null;
    overrideRebookReminderEnabled?: boolean | null;
    overrideRebookReminderDays?: number | null;
  },
) {
  return salonApiFetch<SelfStylistService>(`/stylists/me/services/${serviceId}`, {
    method: "PATCH",
    headers: authHeaders(token),
    body: JSON.stringify(data),
  });
}

export interface WorkingHourEntry {
  id?: string;
  dayOfWeek: number;
  startMinute: number;
  endMinute: number;
}

export function setMyWorkingHours(token: string, hours: { dayOfWeek: number; startMinute: number; endMinute: number }[]) {
  return salonApiFetch<WorkingHourEntry[]>("/stylists/me/working-hours", {
    method: "PUT",
    headers: authHeaders(token),
    body: JSON.stringify({ hours }),
  });
}

export interface TimeOffEntry {
  id: string;
  stylistId: string;
  startAt: string;
  endAt: string;
  reason: string | null;
}

export function listMyTimeOff(token: string) {
  return salonApiFetch<TimeOffEntry[]>("/stylists/me/time-off", { headers: authHeaders(token) });
}

export function createMyTimeOff(token: string, data: { startAt: string; endAt: string; reason?: string }) {
  return salonApiFetch<TimeOffEntry>("/stylists/me/time-off", {
    method: "POST",
    headers: authHeaders(token),
    body: JSON.stringify(data),
  });
}

export function deleteMyTimeOff(token: string, id: string) {
  return salonApiFetch<{ ok: true }>(`/stylists/me/time-off/${id}`, { method: "DELETE", headers: authHeaders(token) });
}

// --- appointments (reuses the same shape apps/api returns for stylist-scoped appointments) ---

export interface StylistAppointment {
  id: string;
  salonId: string;
  stylistId: string;
  customerId: string;
  startAt: string;
  endAt: string;
  status: "PENDING" | "CONFIRMED" | "CANCELLED" | "COMPLETED" | "NO_SHOW";
  priceToman: number;
  /** Paid in advance from the customer's wallet (online bookings); 0 = none. */
  prepaidToman?: number;
  /** HELD while open, SETTLED to the owner's wallet (completed / no-show), REFUNDED to the customer (cancelled). */
  prepaymentStatus?: "HELD" | "SETTLED" | "REFUNDED" | null;
  notes: string | null;
  /** Independent stylists: where it happens (null = not specified / a salon) and a home visit's address. */
  serviceLocation?: ServiceLocation | null;
  visitAddress?: string | null;
  /** Frozen once COMPLETED: the stylist's commission plus any tip. */
  stylistShareToman: number | null;
  services: { serviceId: string; priceToman: number; service: { name: string } }[];
  customer: { firstName: string; lastName: string; phone: string | null };
}

export function listMyAppointments(token: string) {
  return salonApiFetch<StylistAppointment[]>("/appointments/stylist/mine", { headers: authHeaders(token) });
}

export function updateMyAppointmentStatus(token: string, id: string, status: StylistAppointment["status"]) {
  return salonApiFetch<StylistAppointment>(`/appointments/${id}/status`, {
    method: "PATCH",
    headers: authHeaders(token),
    body: JSON.stringify({ status }),
  });
}
