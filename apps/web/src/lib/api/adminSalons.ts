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
  createdAt: string;
  owner: { id: string; firstName: string; lastName: string; phone: string | null };
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
