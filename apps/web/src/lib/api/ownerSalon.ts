import { salonApiFetch } from "./salonApiClient";

function authHeaders(token: string) {
  return { Authorization: `Bearer ${token}` };
}

// --- salon profile ---

export interface OwnerSalon {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  city: string;
  address: string;
  phone: string;
  instagram: string | null;
  logoUrl: string | null;
  coverImageUrl: string | null;
  brandColor: string;
  latitude: number | null;
  longitude: number | null;
  status: "PENDING" | "ACTIVE" | "SUSPENDED";
}

/** Fired on window after the salon's name or logo changes, so the app bar can refresh. */
export const SALON_UPDATED_EVENT = "salon:updated";

export function getMySalon(token: string) {
  return salonApiFetch<OwnerSalon>("/salons/mine", { headers: authHeaders(token) });
}

export interface UpdateSalonInput {
  name?: string;
  description?: string;
  city?: string;
  address?: string;
  phone?: string;
  instagram?: string;
  logoUrl?: string | null; // null removes the photo
  coverImageUrl?: string | null;
  brandColor?: string;
  latitude?: number;
  longitude?: number;
}

export function updateMySalon(token: string, data: UpdateSalonInput) {
  return salonApiFetch<OwnerSalon>("/salons/mine", {
    method: "PATCH",
    headers: authHeaders(token),
    body: JSON.stringify(data),
  });
}

// --- service categories ---

export interface OwnerCategory {
  id: string;
  salonId: string;
  name: string;
  order: number;
}

export function listMyCategories(token: string) {
  return salonApiFetch<OwnerCategory[]>("/salons/mine/categories", { headers: authHeaders(token) });
}

export function createCategory(token: string, data: { name: string; order?: number }) {
  return salonApiFetch<OwnerCategory>("/salons/mine/categories", {
    method: "POST",
    headers: authHeaders(token),
    body: JSON.stringify(data),
  });
}

export function updateCategory(token: string, id: string, data: { name?: string; order?: number }) {
  return salonApiFetch<OwnerCategory>(`/categories/${id}`, {
    method: "PATCH",
    headers: authHeaders(token),
    body: JSON.stringify(data),
  });
}

export function deleteCategory(token: string, id: string) {
  return salonApiFetch<{ ok: true }>(`/categories/${id}`, { method: "DELETE", headers: authHeaders(token) });
}

// --- services ---

export interface OwnerService {
  id: string;
  salonId: string;
  categoryId: string | null;
  name: string;
  description: string | null;
  durationMinutes: number;
  priceToman: number;
  active: boolean;
}

export function listMyServices(token: string) {
  return salonApiFetch<OwnerService[]>("/salons/mine/services", { headers: authHeaders(token) });
}

export interface CreateServiceInput {
  name: string;
  description?: string;
  categoryId?: string;
  durationMinutes: number;
  priceToman: number;
}

export function createService(token: string, data: CreateServiceInput) {
  return salonApiFetch<OwnerService>("/salons/mine/services", {
    method: "POST",
    headers: authHeaders(token),
    body: JSON.stringify(data),
  });
}

export function updateService(
  token: string,
  id: string,
  data: Partial<Omit<CreateServiceInput, "categoryId"> & { categoryId: string | null; active: boolean }>,
) {
  return salonApiFetch<OwnerService>(`/services/${id}`, {
    method: "PATCH",
    headers: authHeaders(token),
    body: JSON.stringify(data),
  });
}

export function deleteService(token: string, id: string) {
  return salonApiFetch<{ ok: true }>(`/services/${id}`, { method: "DELETE", headers: authHeaders(token) });
}

// --- stylists ---

export interface OwnerStylist {
  id: string;
  userId: string;
  salonId: string;
  displayName: string;
  bio: string | null;
  avatarUrl: string | null;
  coverImageUrl: string | null;
  active: boolean;
  user: { firstName: string; lastName: string; phone: string | null };
  services: { serviceId: string; overridePriceToman: number | null; overrideDurationMinutes: number | null }[];
  tempPassword?: string;
}

export interface StylistServiceEntry {
  serviceId: string;
  overridePriceToman?: number | null;
  overrideDurationMinutes?: number | null;
}

export function listMyStylists(token: string) {
  return salonApiFetch<OwnerStylist[]>("/salons/mine/stylists", { headers: authHeaders(token) });
}

export interface InviteStylistInput {
  phone: string;
  firstName: string;
  lastName: string;
  displayName: string;
  bio?: string;
  serviceIds?: string[];
}

export function inviteStylist(token: string, data: InviteStylistInput) {
  return salonApiFetch<OwnerStylist>("/salons/mine/stylists", {
    method: "POST",
    headers: authHeaders(token),
    body: JSON.stringify(data),
  });
}

export function updateStylist(
  token: string,
  id: string,
  data: { displayName?: string; bio?: string; avatarUrl?: string | null; coverImageUrl?: string | null; active?: boolean },
) {
  return salonApiFetch<OwnerStylist>(`/stylists/${id}`, {
    method: "PATCH",
    headers: authHeaders(token),
    body: JSON.stringify(data),
  });
}

export function setStylistServices(token: string, id: string, services: StylistServiceEntry[]) {
  return salonApiFetch<OwnerStylist>(`/stylists/${id}/services`, {
    method: "PUT",
    headers: authHeaders(token),
    body: JSON.stringify({ services }),
  });
}

// --- appointments ---

export interface OwnerAppointment {
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
  stylist: { displayName: string };
  customer: { firstName: string; lastName: string; phone: string | null };
}

export function listMySalonAppointments(token: string) {
  return salonApiFetch<OwnerAppointment[]>("/appointments/salon/mine", { headers: authHeaders(token) });
}

export function updateAppointmentStatus(token: string, id: string, status: OwnerAppointment["status"]) {
  return salonApiFetch<OwnerAppointment>(`/appointments/${id}/status`, {
    method: "PATCH",
    headers: authHeaders(token),
    body: JSON.stringify({ status }),
  });
}
