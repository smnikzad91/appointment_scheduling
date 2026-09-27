import { salonApiFetch } from "./salonApiClient";

function authHeaders(token: string) {
  return { Authorization: `Bearer ${token}` };
}

export interface SelfStylistService {
  serviceId: string;
  overridePriceToman: number | null;
  overrideDurationMinutes: number | null;
  service: { id: string; name: string; priceToman: number; durationMinutes: number };
}

export interface SelfStylist {
  id: string;
  userId: string;
  salonId: string;
  displayName: string;
  bio: string | null;
  avatarUrl: string | null;
  active: boolean;
  workingHours: { dayOfWeek: number; startMinute: number; endMinute: number }[];
  services: SelfStylistService[];
}

export function getMyStylistProfile(token: string) {
  return salonApiFetch<SelfStylist>("/stylists/me", { headers: authHeaders(token) });
}

export function updateMyStylistProfile(token: string, data: { bio?: string; avatarUrl?: string }) {
  return salonApiFetch<SelfStylist>("/stylists/me", {
    method: "PATCH",
    headers: authHeaders(token),
    body: JSON.stringify(data),
  });
}

export function updateMyServiceOverride(
  token: string,
  serviceId: string,
  data: { overridePriceToman: number | null; overrideDurationMinutes: number | null },
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
  notes: string | null;
  services: { service: { name: string } }[];
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
