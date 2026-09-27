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
  province: string | null;
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
  timezone: string;
}

/** Fired on window after the salon's name or logo changes, so the app bar can refresh. */
export const SALON_UPDATED_EVENT = "salon:updated";

export function getMySalon(token: string) {
  return salonApiFetch<OwnerSalon>("/salons/mine", { headers: authHeaders(token) });
}

export interface UpdateSalonInput {
  name?: string;
  description?: string;
  /** Province and city are validated together by the API — send both. */
  province?: string;
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
  /** Stylist's share of the money received for their appointments, 0–100. */
  commissionPercent: number;
  /** mustSetPassword: invited but hasn't used their "set your password" link yet. */
  user: { firstName: string; lastName: string; phone: string | null; mustSetPassword: boolean };
  /** commissionPercent: this service's own share for the stylist; null = their default. */
  services: { serviceId: string; overridePriceToman: number | null; overrideDurationMinutes: number | null; commissionPercent: number | null }[];
}

/** A one-time "set your password" link secret; build the URL with setupLinkUrl(). */
export interface StylistSetupLink {
  setupToken: string;
  expiresAt: string;
}

export interface StylistServiceEntry {
  serviceId: string;
  overridePriceToman?: number | null;
  overrideDurationMinutes?: number | null;
  commissionPercent?: number | null;
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
  commissionPercent: number;
}

export function inviteStylist(token: string, data: InviteStylistInput) {
  // setupToken is present when a new account was made (or an invited one never set a password).
  return salonApiFetch<OwnerStylist & { setupToken?: string; setupExpiresAt?: string }>("/salons/mine/stylists", {
    method: "POST",
    headers: authHeaders(token),
    body: JSON.stringify(data),
  });
}

/** Issues a new one-time link for the stylist; any earlier unused link stops working. */
export function regenerateStylistSetupLink(token: string, stylistId: string) {
  return salonApiFetch<StylistSetupLink>(`/salons/mine/stylists/${stylistId}/setup-link`, {
    method: "POST",
    headers: authHeaders(token),
  });
}

export function updateStylist(
  token: string,
  id: string,
  data: {
    displayName?: string;
    bio?: string;
    avatarUrl?: string | null;
    coverImageUrl?: string | null;
    active?: boolean;
    commissionPercent?: number;
  },
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
  stylistShareToman: number | null;
  services: { serviceId: string; priceToman: number; service: { name: string } }[];
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

// --- the salon booking a customer (phone call / walk-in) ---

export interface SalonBookingInput {
  customerPhone: string;
  customerFirstName?: string;
  customerLastName?: string;
  stylistId: string;
  serviceIds: string[];
  startAt: string; // ISO instant
  notes?: string;
}

export function createSalonBooking(token: string, data: SalonBookingInput) {
  return salonApiFetch<OwnerAppointment>("/appointments/salon", { method: "POST", headers: authHeaders(token), body: JSON.stringify(data) });
}

/** Staff (owner, or the appointment's stylist) change an open appointment; omitted fields stay. */
export function updateAppointmentDetails(token: string, id: string, data: { serviceIds?: string[]; startAt?: string; notes?: string | null }) {
  return salonApiFetch<OwnerAppointment>(`/appointments/${id}`, { method: "PATCH", headers: authHeaders(token), body: JSON.stringify(data) });
}

/** A customer who has booked here before (to prefill the name); `found: false` otherwise. */
export function lookupSalonCustomer(token: string, phone: string) {
  return salonApiFetch<{ found: boolean; firstName?: string; lastName?: string }>(
    `/appointments/salon/customer?phone=${encodeURIComponent(phone)}`,
    { headers: authHeaders(token) },
  );
}
