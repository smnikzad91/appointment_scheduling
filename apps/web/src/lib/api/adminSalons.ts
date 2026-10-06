import { salonApiFetch } from "./salonApiClient";

function authHeaders(token: string) {
  return { Authorization: `Bearer ${token}` };
}

export interface AdminSalon {
  id: string;
  name: string;
  slug: string;
  city: string;
  address: string;
  phone: string;
  status: "PENDING" | "ACTIVE" | "SUSPENDED";
  /** INDEPENDENT = an independent stylist's own business. */
  kind?: "SALON" | "INDEPENDENT";
  createdAt: string;
  owner: { id: string; firstName: string; lastName: string; phone: string | null };
  plan: { id: string; name: string } | null;
  /** null = no end date */
  planExpiresAt: string | null;
}

export function listAdminSalons(token: string, status?: AdminSalon["status"]) {
  const qs = status ? `?status=${status}` : "";
  return salonApiFetch<AdminSalon[]>(`/admin/salons${qs}`, { headers: authHeaders(token) });
}

export function setSalonStatus(token: string, id: string, status: AdminSalon["status"]) {
  return salonApiFetch<AdminSalon>(`/admin/salons/${id}/status`, {
    method: "PATCH",
    headers: authHeaders(token),
    body: JSON.stringify({ status }),
  });
}

/** planId null removes the plan (no limits); expiresAt null = no end date. */
export function setSalonSubscription(token: string, id: string, planId: string | null, expiresAt: string | null) {
  return salonApiFetch<{ id: string; planId: string | null; planExpiresAt: string | null; plan: { id: string; name: string } | null }>(
    `/admin/salons/${id}/subscription`,
    { method: "PATCH", headers: authHeaders(token), body: JSON.stringify({ planId, expiresAt }) },
  );
}
